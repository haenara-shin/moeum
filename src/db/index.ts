import * as SQLite from 'expo-sqlite';
import {
  CREATE_QUOTES,
  CREATE_INDEX_CREATED_AT,
  CREATE_INDEX_FOLDER,
  CREATE_FOLDERS,
  CREATE_META,
  SCHEMA_VERSION,
} from './schema';
import type { Quote, QuoteInput } from '../types/quote';
import type { Folder, FolderInput } from '../types/folder';

const DB_NAME = 'moeum.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, def: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // 1) 베이스 테이블 (v1 + v2 공통)
  await db.execAsync(CREATE_QUOTES);
  await db.execAsync(CREATE_INDEX_CREATED_AT);
  await db.execAsync(CREATE_FOLDERS);
  await db.execAsync(CREATE_META);

  // 2) v1 → v2 마이그레이션 — 기존 사용자의 quotes 테이블에 folder_id 컬럼 추가
  //    (CREATE TABLE IF NOT EXISTS는 기존 테이블이 있으면 skip하므로 ALTER 필요)
  await ensureColumn(db, 'quotes', 'folder_id', 'INTEGER');

  // 3) folder_id 의존 인덱스 — 컬럼 확보 후 실행
  await db.execAsync(CREATE_INDEX_FOLDER);

  await db.runAsync(
    `INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)`,
    String(SCHEMA_VERSION),
  );
  dbInstance = db;
  return db;
}

// === Quotes ===

export async function insertQuote(input: QuoteInput, folderId?: number | null): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO quotes (body, author, source, original_image_path, folder_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.body,
    input.author ?? null,
    input.source ?? null,
    input.original_image_path ?? null,
    folderId ?? null,
    now,
    now,
  );
  return res.lastInsertRowId;
}

export async function updateQuote(
  id: number,
  input: QuoteInput,
  folderId?: number | null | undefined,
): Promise<void> {
  const db = await getDb();
  if (folderId !== undefined) {
    await db.runAsync(
      `UPDATE quotes SET body = ?, author = ?, source = ?, original_image_path = ?, folder_id = ?, updated_at = ?
       WHERE id = ?`,
      input.body,
      input.author ?? null,
      input.source ?? null,
      input.original_image_path ?? null,
      folderId,
      Date.now(),
      id,
    );
  } else {
    await db.runAsync(
      `UPDATE quotes SET body = ?, author = ?, source = ?, original_image_path = ?, updated_at = ?
       WHERE id = ?`,
      input.body,
      input.author ?? null,
      input.source ?? null,
      input.original_image_path ?? null,
      Date.now(),
      id,
    );
  }
}

export async function moveQuoteToFolder(quoteId: number, folderId: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE quotes SET folder_id = ?, updated_at = ? WHERE id = ?`,
    folderId,
    Date.now(),
    quoteId,
  );
}

export async function deleteQuote(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM quotes WHERE id = ?`, id);
}

export type ListQuotesOpts = {
  limit?: number;
  offset?: number;
  search?: string;
  folderId?: number | null | 'all';
};

export async function listQuotes(opts?: ListQuotesOpts): Promise<Quote[]> {
  const db = await getDb();
  const limit = opts?.limit ?? 200;
  const offset = opts?.offset ?? 0;
  const search = opts?.search?.trim();
  const folderFilter = opts?.folderId;

  const where: string[] = [];
  const params: (string | number | null)[] = [];

  if (search) {
    where.push(`(body LIKE ? OR author LIKE ?)`);
    const like = `%${search}%`;
    params.push(like, like);
  }
  if (folderFilter !== undefined && folderFilter !== 'all') {
    if (folderFilter === null) {
      where.push(`folder_id IS NULL`);
    } else {
      where.push(`folder_id = ?`);
      params.push(folderFilter);
    }
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT * FROM quotes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return db.getAllAsync<Quote>(sql, ...params, limit, offset);
}

export async function getQuote(id: number): Promise<Quote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Quote>(`SELECT * FROM quotes WHERE id = ?`, id);
  return row ?? null;
}

export async function countQuotes(folderId?: number | null | 'all'): Promise<number> {
  const db = await getDb();
  if (folderId === undefined || folderId === 'all') {
    const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM quotes`);
    return row?.c ?? 0;
  }
  if (folderId === null) {
    const row = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM quotes WHERE folder_id IS NULL`,
    );
    return row?.c ?? 0;
  }
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM quotes WHERE folder_id = ?`,
    folderId,
  );
  return row?.c ?? 0;
}

export async function getRandomQuotes(n: number, folderId?: number | null | 'all'): Promise<Quote[]> {
  const db = await getDb();
  if (folderId === undefined || folderId === 'all') {
    return db.getAllAsync<Quote>(`SELECT * FROM quotes ORDER BY RANDOM() LIMIT ?`, n);
  }
  if (folderId === null) {
    return db.getAllAsync<Quote>(
      `SELECT * FROM quotes WHERE folder_id IS NULL ORDER BY RANDOM() LIMIT ?`,
      n,
    );
  }
  return db.getAllAsync<Quote>(
    `SELECT * FROM quotes WHERE folder_id = ? ORDER BY RANDOM() LIMIT ?`,
    folderId,
    n,
  );
}

// === Folders ===

export async function listFolders(): Promise<Folder[]> {
  const db = await getDb();
  return db.getAllAsync<Folder>(`SELECT * FROM folders ORDER BY sort_order ASC, created_at ASC`);
}

export async function insertFolder(input: FolderInput): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const max = await db.getFirstAsync<{ m: number | null }>(
    `SELECT MAX(sort_order) as m FROM folders`,
  );
  const sortOrder = (max?.m ?? -1) + 1;
  const res = await db.runAsync(
    `INSERT INTO folders (name, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    input.name,
    input.color ?? null,
    sortOrder,
    now,
    now,
  );
  return res.lastInsertRowId;
}

export async function renameFolder(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE folders SET name = ?, updated_at = ? WHERE id = ?`, name, Date.now(), id);
}

export async function deleteFolder(id: number): Promise<void> {
  const db = await getDb();
  // 소속 quote의 folder_id를 NULL로 (전체 미분류로 회수)
  await db.runAsync(`UPDATE quotes SET folder_id = NULL WHERE folder_id = ?`, id);
  await db.runAsync(`DELETE FROM folders WHERE id = ?`, id);
}
