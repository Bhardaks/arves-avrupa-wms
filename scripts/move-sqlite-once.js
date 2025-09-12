// scripts/move-sqlite-once.js
// Railway database migration script for Arves Avrupa WMS
const fs = require('fs');
const path = require('path');

const isRailway = process.env.RAILWAY_ENVIRONMENT === 'true';

// Source: Current database location
const SRC = path.join(process.cwd(), 'backend', 'db', 'wms.db');

// Destination: Railway persistent volume or development path  
const DST = process.env.SQLITE_DB_PATH || (isRailway ? '/data/wms.db' : path.join(process.cwd(), 'data', 'wms.db'));

console.log('[DB Migration] Starting Arves Avrupa WMS database migration...');
console.log('[DB Migration] Railway mode:', isRailway);
console.log('[DB Migration] Source:', SRC);
console.log('[DB Migration] Destination:', DST);

try {
  // Check if source exists and destination doesn't exist
  if (fs.existsSync(SRC) && !fs.existsSync(DST)) {
    // Create destination directory
    const destDir = path.dirname(DST);
    fs.mkdirSync(destDir, { recursive: true });
    console.log('[DB Migration] Created destination directory:', destDir);
    
    // Copy database file
    fs.copyFileSync(SRC, DST);
    
    console.log('[DB Migration] ✅ Successfully migrated WMS database to persistent volume');
    console.log('[DB Migration] ✅ Source size:', fs.statSync(SRC).size, 'bytes');
    console.log('[DB Migration] ✅ Destination size:', fs.statSync(DST).size, 'bytes');
    
    // Verify the copy was successful
    if (fs.statSync(SRC).size === fs.statSync(DST).size) {
      console.log('[DB Migration] ✅ File copy verification successful');
      
      // Test database connection
      try {
        const sqlite3 = require('sqlite3').verbose();
        const testDb = new sqlite3.Database(DST, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
            console.error('[DB Migration] ❌ Database verification failed:', err.message);
          } else {
            console.log('[DB Migration] ✅ Database verification successful');
            testDb.close();
          }
        });
      } catch (testErr) {
        console.warn('[DB Migration] ⚠️ Could not verify database:', testErr.message);
      }
      
    } else {
      throw new Error('File size mismatch after copy');
    }
  } else if (fs.existsSync(DST)) {
    console.log('[DB Migration] ℹ️ Database already exists at persistent volume. Skipping migration.');
    console.log('[DB Migration] ℹ️ Existing database size:', fs.statSync(DST).size, 'bytes');
    
    // Verify existing database
    try {
      const sqlite3 = require('sqlite3').verbose();
      const testDb = new sqlite3.Database(DST, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('[DB Migration] ❌ Existing database verification failed:', err.message);
          if (isRailway) {
            console.log('[DB Migration] ❌ This is critical on Railway. Database may be corrupted.');
          }
        } else {
          console.log('[DB Migration] ✅ Existing database verification successful');
          testDb.close();
        }
      });
    } catch (testErr) {
      console.warn('[DB Migration] ⚠️ Could not verify existing database:', testErr.message);
    }
    
  } else if (!fs.existsSync(SRC)) {
    console.log('[DB Migration] ℹ️ Source database not found. Fresh installation detected.');
    // Ensure destination directory exists for fresh installs
    const destDir = path.dirname(DST);
    fs.mkdirSync(destDir, { recursive: true });
    console.log('[DB Migration] ✅ Created directory for new database:', destDir);
  } else {
    console.log('[DB Migration] ℹ️ Migration not needed.');
  }
} catch (error) {
  console.error('[DB Migration] ❌ Migration failed:', error.message);
  console.error('[DB Migration] ❌ Stack:', error.stack);
  
  // In Railway production, this is critical
  if (isRailway && process.env.NODE_ENV === 'production') {
    console.error('[DB Migration] ❌ Critical failure on Railway production. Exiting.');
    process.exit(1);
  } else {
    console.warn('[DB Migration] ⚠️ Continuing despite migration error');
  }
}