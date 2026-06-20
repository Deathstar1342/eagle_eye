import Database from 'better-sqlite3'

const db = new Database('EagleEye.db')

db.exec(`
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_tag TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'Available',
    location TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS current_checkouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    asset_tag TEXT UNIQUE NOT NULL,
    checkout_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    student_id TEXT NOT NULL,
    asset_tag TEXT NOT NULL,
    action TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);
`)

export default db