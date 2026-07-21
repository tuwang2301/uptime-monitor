import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'uptime.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize Database Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      interval_sec INTEGER DEFAULT 60,
      status TEXT DEFAULT 'PENDING',
      status_code INTEGER,
      response_time_ms INTEGER DEFAULT 0,
      last_checked TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ping_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default monitors if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM monitors').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO monitors (name, url, interval_sec) VALUES (?, ?, ?)');
    insert.run('Google Search', 'https://www.google.com', 60);
    insert.run('GitHub REST API', 'https://api.github.com', 60);
    insert.run('HTTPBin Status 500 Mock', 'https://httpbin.org/status/500', 30);
  }
}
