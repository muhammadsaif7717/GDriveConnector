const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'gdriveconnector.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        access_token TEXT,
        refresh_token TEXT,
        expiry_date INTEGER,
        total_space INTEGER DEFAULT 0,
        used_space INTEGER DEFAULT 0,
        app_used_space INTEGER DEFAULT 0
    )`);

    // Add column if not exists for older installations
    db.run("ALTER TABLE accounts ADD COLUMN app_used_space INTEGER DEFAULT 0", (err) => {
        // Ignore error if column already exists
    });

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        client_id TEXT,
        client_secret TEXT
    )`, () => {
        db.run(`INSERT OR IGNORE INTO settings (id, client_id, client_secret) VALUES (1, '', '')`);
    });
});

module.exports = db;
