import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('gdriveconnector.db');
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        access_token TEXT,
        refresh_token TEXT,
        expiry_date INTEGER,
        total_space INTEGER DEFAULT 0,
        used_space INTEGER DEFAULT 0,
        app_used_space INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        client_id TEXT,
        client_secret TEXT
    );
    INSERT OR IGNORE INTO settings (id, client_id, client_secret) VALUES (1, '', '');
  `);

  try {
    await db.execAsync("ALTER TABLE accounts ADD COLUMN app_used_space INTEGER DEFAULT 0");
  } catch (error) {
    // Column might already exist
  }
};

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase first.");
  }
  return db;
};

// Example Helper functions
export const getSettings = async () => {
    const database = getDb();
    return await database.getFirstAsync<{client_id: string, client_secret: string}>('SELECT * FROM settings WHERE id = 1');
};

export const updateSettings = async (clientId: string, clientSecret: string) => {
    const database = getDb();
    await database.runAsync('UPDATE settings SET client_id = ?, client_secret = ? WHERE id = 1', [clientId, clientSecret]);
};
