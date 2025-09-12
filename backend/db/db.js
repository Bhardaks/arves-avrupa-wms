// db.js - Railway-compatible SQLite database configuration
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.SQLITE_DB_PATH || '/data/wms.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] SQLite connection failed:', err);
    throw err;
  }
  
  // Set WAL mode and performance optimizations
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    PRAGMA cache_size=10000;
    PRAGMA temp_store=memory;
    PRAGMA busy_timeout=30000;
  `, (err) => {
    if (err) {
      console.warn('[DB] PRAGMA settings failed:', err);
    } else {
      console.log('[DB] Performance optimizations applied');
    }
  });
  
  console.log('[DB] SQLite connected successfully at:', DB_PATH);
});

// Graceful shutdown handlers for sqlite3
const closeDatabase = (signal) => {
  console.log(`[DB] Received ${signal}, closing database...`);
  db.close((err) => {
    if (err) {
      console.error('[DB] Error closing database:', err);
    } else {
      console.log('[DB] Database connection closed gracefully');
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => closeDatabase('SIGINT'));
process.on('SIGTERM', () => closeDatabase('SIGTERM'));
process.on('SIGHUP', () => closeDatabase('SIGHUP'));

module.exports = db;