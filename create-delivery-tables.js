const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./backend/db/wms.db');

db.serialize(() => {
  // Create deliveries table if not exists
  db.run(`CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    delivery_status TEXT DEFAULT 'pending',
    customer_signature TEXT,
    delivery_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders (id)
  )`);
  
  // Create delivery_scans table if not exists
  db.run(`CREATE TABLE IF NOT EXISTS delivery_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id INTEGER NOT NULL,
    order_item_id INTEGER NOT NULL,
    product_id INTEGER,
    package_id INTEGER,
    barcode TEXT,
    scanned_quantity INTEGER DEFAULT 1,
    delivery_type TEXT DEFAULT 'package',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries (id),
    FOREIGN KEY (order_item_id) REFERENCES order_items (id)
  )`);
  
  console.log('✅ Delivery tables created successfully');
});

db.close();