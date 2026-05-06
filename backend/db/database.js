const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/pm.db');
let db = null;

async function getDb() {
  if (db) return db;

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  return db;
}

function saveToDisk() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      owner_initials TEXT,
      status TEXT NOT NULL DEFAULT 'On Track',
      start_date TEXT,
      end_date TEXT,
      budget TEXT,
      progress INTEGER DEFAULT 0,
      avatar_color TEXT DEFAULT '#2926E2',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      level TEXT NOT NULL DEFAULT 'MEDIUM',
      text TEXT NOT NULL,
      owner TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      done INTEGER DEFAULT 0,
      text TEXT NOT NULL,
      meta TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_nextsteps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      due TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_pain (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_billing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT,
      amount TEXT,
      status TEXT DEFAULT 'pending',
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER UNIQUE NOT NULL,
      open_count INTEGER DEFAULT 0,
      progress_count INTEGER DEFAULT 0,
      resolved_count INTEGER DEFAULT 0,
      blocker_count INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      project_name TEXT NOT NULL,
      project_code TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveToDisk();
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  // Capture last insert ID BEFORE saveToDisk (export can affect sqlite state)
  const lastId = query('SELECT last_insert_rowid() as id');
  saveToDisk();
  return lastId[0] ? lastId[0].id : null;
}

function getLastInsertId() {
  const rows = query('SELECT last_insert_rowid() as id');
  return rows[0] ? rows[0].id : null;
}

module.exports = { getDb, query, run, getLastInsertId, saveToDisk };
