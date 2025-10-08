// db.js — SQLite setup
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "callassist.db");
const db = new Database(DB_PATH);

// -----------------------
// Companies table
// -----------------------
// Create table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS companies (
    companyId INTEGER PRIMARY KEY,
    name TEXT,
    package TEXT,
    phoneNumber TEXT,
    email TEXT,
    location TEXT,
    whatsapp TEXT,
    hours TEXT,
    greeting TEXT,
    payment TEXT,
    faqs TEXT,
    createdAt TEXT
  )
`).run();

// Ensure all columns exist (in case table already existed)
const companyColumns = [
  { name: "package", type: "TEXT" },
  { name: "phoneNumber", type: "TEXT" },
  { name: "email", type: "TEXT" },
  { name: "location", type: "TEXT" },
  { name: "whatsapp", type: "TEXT" },
  { name: "hours", type: "TEXT" },
  { name: "greeting", type: "TEXT" },
  { name: "payment", type: "TEXT" },
  { name: "createdAt", type: "TEXT" }
];

const existingColumnsStmt = db.prepare("PRAGMA table_info(companies)").all();
const existingColumns = existingColumnsStmt.map(c => c.name);

companyColumns.forEach(col => {
  if (!existingColumns.includes(col.name)) {
    db.prepare(`ALTER TABLE companies ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`Added column ${col.name} to companies table`);
  }
});

// -----------------------
// Messages table
// -----------------------
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

// -----------------------
// Analytics table
// -----------------------
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

// -----------------------
// Optional: Appointments table
// -----------------------
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
