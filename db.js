// db.js — SQLite setup
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "callassist.db");
const db = new Database(DB_PATH);

// Companies table
db.prepare(`
  CREATE TABLE IF NOT EXISTS companies (
    companyId INTEGER PRIMARY KEY,
    name TEXT,
    faqs TEXT
  )
`).run();

// Messages table
db.prepare(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    callerNumber TEXT,
    message TEXT,
    response TEXT,
    timestamp TEXT
  )
`).run();

// Analytics table
db.prepare(`
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    callerNumber TEXT,
    input TEXT,
    response TEXT,
    timestamp TEXT
  )
`).run();

// Optional: appointments table
db.prepare(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    callerNumber TEXT,
    date TEXT,
    time TEXT,
    timestamp TEXT
  )
`).run();

module.exports = db;
