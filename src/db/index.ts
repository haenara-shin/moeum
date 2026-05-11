import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import type { Quote, QuoteInput } from '../types/quote';

const DB_NAME = 'moeum.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  for (const stmt of MIGRATIONS) {
    await db.execAsync(stmt);
  }
  await db.runAsync(
    `INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)`,
    String(SCHEMA_VERSION),
  );
  dbInstance = db;
  return db;
}

export async function insertQuote(input: QuoteInput): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO quotes (body, author, source, original_image_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.body,
    input.author ?? null,
    input.source ?? null,
    input.original_image_path ?? null,
    now,
    now,
  );
  return res.lastInsertRowId;
}

export async function updateQuote(id: number, input: QuoteInput): Promise<void> {
  const db = await getDb();
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

export async function deleteQuote(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM quotes WHERE id = ?`, id);
}

export async function listQuotes(opts?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<Quote[]> {
  const db = await getDb();
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const search = opts?.search?.trim();
  if (search) {
    const like = `%${search}%`;
    return db.getAllAsync<Quote>(
      `SELECT * FROM quotes
       WHERE body LIKE ? OR author LIKE ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      like,
      like,
      limit,
      offset,
    );
  }
  return db.getAllAsync<Quote>(
    `SELECT * FROM quotes ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export async function getQuote(id: number): Promise<Quote | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Quote>(`SELECT * FROM quotes WHERE id = ?`, id);
  return row ?? null;
}

export async function countQuotes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM quotes`);
  return row?.c ?? 0;
}

export async function getRandomQuotes(n: number): Promise<Quote[]> {
  const db = await getDb();
  return db.getAllAsync<Quote>(
    `SELECT * FROM quotes ORDER BY RANDOM() LIMIT ?`,
    n,
  );
}
