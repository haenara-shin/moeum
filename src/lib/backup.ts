/**
 * 컬렉션 JSON 백업/공유/가져오기 — PRD §5.1 FR-006, 묶음3
 *
 * Export 형식 v1:
 * {
 *   "app": "moeum",
 *   "version": 1,
 *   "exported_at": <unix ms>,
 *   "folders": [{ "name", "color" }, ...],
 *   "quotes": [{ "body", "folder_name"?, "created_at" }, ...]
 * }
 *
 * 폴더는 id가 아닌 name으로 매칭 — 받는 쪽에서 같은 이름 폴더가 있으면
 * 거기 추가, 없으면 새로 생성. (id는 기기마다 다르기 때문에)
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  listFolders,
  listQuotes,
  insertFolder,
  insertQuote,
  countQuotes,
} from '../db';

export type ExportPayload = {
  app: 'moeum';
  version: 1;
  exported_at: number;
  folders: Array<{ name: string; color?: string | null }>;
  quotes: Array<{
    body: string;
    folder_name?: string | null;
    created_at?: number;
  }>;
};

export type ImportSummary = {
  newQuotes: number;
  duplicates: number;
  newFolders: number;
};

const EXPORT_VERSION = 1 as const;

export async function buildExportPayload(
  folderId?: number | null | 'all',
): Promise<ExportPayload> {
  const folders = await listFolders();
  const quotes = await listQuotes({ folderId, limit: 100000 });

  const folderById = new Map<number, string>();
  for (const f of folders) {
    if (f.id != null) folderById.set(f.id, f.name);
  }

  const includedFolderNames = new Set<string>();
  const exportedQuotes = quotes.map((q) => {
    const folderName = q.folder_id != null ? folderById.get(q.folder_id) ?? null : null;
    if (folderName) includedFolderNames.add(folderName);
    return {
      body: q.body,
      folder_name: folderName,
      created_at: q.created_at,
    };
  });

  // export 범위에 실제로 사용된 폴더만 포함 (전체 export면 모든 폴더)
  const exportedFolders =
    folderId === 'all' || folderId === undefined
      ? folders.map((f) => ({ name: f.name, color: f.color ?? null }))
      : folders
          .filter((f) => f.name != null && includedFolderNames.has(f.name))
          .map((f) => ({ name: f.name, color: f.color ?? null }));

  return {
    app: 'moeum',
    version: EXPORT_VERSION,
    exported_at: Date.now(),
    folders: exportedFolders,
    quotes: exportedQuotes,
  };
}

function timestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function exportAndShare(
  folderId?: number | null | 'all',
  folderLabel?: string,
): Promise<void> {
  const payload = await buildExportPayload(folderId);
  const total = payload.quotes.length;
  if (total === 0) {
    throw new Error('내보낼 문장이 없습니다');
  }

  const json = JSON.stringify(payload, null, 2);
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('파일 시스템 접근 실패');

  const safeLabel = (folderLabel ?? '전체').replace(/[^가-힣A-Za-z0-9_-]/g, '_');
  const fileUri = `${base}moeum_${safeLabel}_${timestampForFilename()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('이 기기에서 공유 기능을 사용할 수 없습니다');

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: `모두의 마음가짐 — ${folderLabel ?? '전체'} (${total}개)`,
  });
}

function isExportPayload(x: unknown): x is ExportPayload {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.app === 'moeum' && o.version === 1 && Array.isArray(o.quotes);
}

function quoteKey(body: string): string {
  return body.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function pickAndImport(): Promise<ImportSummary> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { newQuotes: 0, duplicates: 0, newFolders: 0 };
  }

  const uri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다');
  }

  if (!isExportPayload(parsed)) {
    throw new Error('모두의 마음가짐 백업 파일이 아닙니다');
  }

  return applyImport(parsed);
}

export async function applyImport(payload: ExportPayload): Promise<ImportSummary> {
  // 기존 문장 본문 → 중복 검사용 Set
  const existing = await listQuotes({ limit: 100000, folderId: 'all' });
  const existingKeys = new Set(existing.map((q) => quoteKey(q.body)));

  // 기존 폴더 이름 → id 맵
  const existingFolders = await listFolders();
  const folderNameToId = new Map<string, number>();
  for (const f of existingFolders) {
    if (f.id != null) folderNameToId.set(f.name, f.id);
  }

  let newFolders = 0;
  // payload.folders를 먼저 처리 (해당 이름이 없으면 생성)
  for (const f of payload.folders) {
    if (!folderNameToId.has(f.name)) {
      const newId = await insertFolder({ name: f.name, color: f.color ?? null });
      folderNameToId.set(f.name, newId);
      newFolders += 1;
    }
  }

  let newQuotes = 0;
  let duplicates = 0;
  for (const q of payload.quotes) {
    if (!q.body || q.body.trim().length === 0) continue;
    const key = quoteKey(q.body);
    if (existingKeys.has(key)) {
      duplicates += 1;
      continue;
    }
    const folderId =
      q.folder_name != null ? folderNameToId.get(q.folder_name) ?? null : null;
    await insertQuote({ body: q.body.trim(), author: null, source: null }, folderId);
    existingKeys.add(key);
    newQuotes += 1;
  }

  return { newQuotes, duplicates, newFolders };
}

export async function getTotalCount(): Promise<number> {
  return countQuotes('all');
}
