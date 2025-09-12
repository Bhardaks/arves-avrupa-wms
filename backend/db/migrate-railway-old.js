const fs = require('fs');
const path = require('path');

// Try better-sqlite3 first, fallback to sqlite3 if native compilation fails
let Database;
let isSync = true;

try {
  Database = require('better-sqlite3');
  console.log('📦 Using better-sqlite3 (sync)');
} catch (err) {
  console.warn('⚠️ better-sqlite3 failed, falling back to sqlite3:', err.message);
  Database = require('sqlite3').Database;
  isSync = false;
}

const DB_PATH = process.env.SQLITE_DB_PATH || '/data/wms.db';

const SCHEMA_PATH = path.join(process.cwd(), 'backend', 'db', 'schema.sql');

console.log('🚂 Railway Migration - Using database:', DB_PATH);
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Initialize database based on available driver
let db;
if (isSync) {
  // better-sqlite3 (synchronous)
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  
  console.log('📁 Schema path:', SCHEMA_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  console.log('📊 Schema file size:', schema.length, 'characters');
  
  db.exec(schema);
  console.log('✅ Schema SQL executed successfully');
} else {
  // sqlite3 (async)
  db = new Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
      process.exit(1);
    }
    console.log('✅ Database connected successfully');
  });
  
  // For sqlite3, we need to handle this asynchronously
  console.log('📁 Schema path:', SCHEMA_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  console.log('📊 Schema file size:', schema.length, 'characters');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Schema execution failed:', err);
      process.exit(1);
    }
    console.log('✅ Schema SQL executed successfully');
    continueSetup();
  });
}

function continueSetup() {
  console.log('🔧 Creating additional tables...');
  
  if (isSync) {
    // better-sqlite3 synchronous approach
    setupTablesSync();
  } else {
    // sqlite3 asynchronous approach  
    setupTablesAsync();
  }
}

function setupTablesSync() {
  try {
  // Create users table since it's not in schema.sql
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      full_name TEXT,
      email TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
  `);

  // Create role_permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      permission TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role, category, subcategory, permission)
    );
  `);

  // Create locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT
    );
  `);

  // Create service_requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      required_part TEXT NOT NULL,
      required_quantity INTEGER DEFAULT 1,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'pending',
      package_id INTEGER,
      package_number TEXT,
      package_name TEXT,
      package_barcode TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create package_openings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS package_openings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      service_request_id INTEGER,
      opened_by TEXT NOT NULL,
      opening_method TEXT DEFAULT 'partial',
      source_location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create ssh_inventory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ssh_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      location TEXT DEFAULT 'SSH-01-01',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      UNIQUE(part_name, location)
    );
  `);

  // Essential data for Railway
  console.log('👤 Inserting essential data...');
  db.exec(`
    INSERT OR IGNORE INTO users (username, password_hash, role, created_at, active) VALUES
    ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', datetime('now'), 1);
    
    INSERT OR IGNORE INTO locations (code, name) VALUES 
    ('A1-01-359', 'A Blok 1. Koridor 359 Raf'),
    ('SSH-01-01', 'SSH Servis Alanı');
  `);
  console.log('✅ Essential data inserted');

  // Verify tables were created
  console.log('🔍 Verifying created tables...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 Created tables:', tables.map(t => t.name).join(', '));

  const requiredTables = ['products', 'orders', 'users', 'locations'];
  const missingTables = requiredTables.filter(table => 
    !tables.some(t => t.name === table)
  );

  if (missingTables.length > 0) {
    console.error('❌ Missing required tables:', missingTables);
    throw new Error(`Missing tables: ${missingTables.join(', ')}`);
  }

  console.log('✅ Railway migration completed successfully');

} catch (e) {
  console.error('❌ Railway migration failed:', e.message);
  process.exit(1);
}

db.close();
console.log('✅ Migration done on', DB_PATH);