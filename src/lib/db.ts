// SQLite singleton. Mirrors the schema from BALLBALL Tech console (worlds_2026.db),
// scoped to user-specific scouting features (auth, notes, favorites) plus a small
// table for cached worlds-division assignments (predicted or fetched from RE).
//
// We only persist user/state data here — primary VEX data continues to flow live
// through the RobotEvents API client in `lib/robotevents.ts`.

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'scout.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const conn = new Database(DB_PATH);
  conn.pragma('journal_mode = WAL');
  conn.pragma('foreign_keys = ON');
  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      uid TEXT UNIQUE,
      display_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      team_number TEXT NOT NULL,
      note TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, team_number)
    );
    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id INTEGER NOT NULL,
      team_number TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, team_number),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS uid_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reset_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS email_verify_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      used INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS worlds_divisions (
      team_number TEXT PRIMARY KEY,
      division_name TEXT NOT NULL,
      division_id INTEGER DEFAULT 0,
      is_predicted INTEGER DEFAULT 1
    );
  `);
  _db = conn;
  return conn;
}

export type UserRow = {
  id: number;
  email: string | null;
  password_hash: string | null;
  uid: string;
  display_name: string;
  created_at: string;
};
