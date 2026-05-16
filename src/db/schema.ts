export const SCHEMA_VERSION = 2;

export const CREATE_QUOTES = `
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  author TEXT,
  source TEXT,
  original_image_path TEXT,
  folder_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const CREATE_INDEX_CREATED_AT = `
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
`;

export const CREATE_INDEX_FOLDER = `
CREATE INDEX IF NOT EXISTS idx_quotes_folder_id ON quotes(folder_id);
`;

export const CREATE_FOLDERS = `
CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const CREATE_META = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const MIGRATIONS: string[] = [
  CREATE_QUOTES,
  CREATE_INDEX_CREATED_AT,
  CREATE_FOLDERS,
  CREATE_INDEX_FOLDER,
  CREATE_META,
];
