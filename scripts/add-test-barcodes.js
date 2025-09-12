// Test barkodları eklemek için script
const Database = require('better-sqlite3');
const path = require('path');

// Database path
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'backend', 'db', 'wms.db');

console.log('📦 Test barkodları ekleniyor...');

try {
  const db = new Database(DB_PATH);

  // Loglardan görülen test barkodları
  const testBarcodes = [
    'PK-ARE-BE-B-GR-4-1',
    'PK-ARE-BE-B-GR-4-2', 
    'PK-ARE-BE-B-GR-4-3',
    'PK-ARE-BE-B-GR-4-4',
    'PK-ARE-BE-B-GR-5-1',
    'PK-ARE-BE-B-GR-5-2',
    'PK-ARE-BE-B-GR-5-3', 
    'PK-ARE-BE-B-GR-5-4',
    'PK-ARE-BE-B-GR-5-5',
    'ARE09376223096'
  ];

  // Test product ve product_packages ekle
  for (let i = 0; i < testBarcodes.length; i++) {
    const barcode = testBarcodes[i];
    
    // Product ekle
    db.exec(`
      INSERT OR IGNORE INTO products (id, sku, name, price, category, created_at) VALUES
      (${1000 + i}, 'SKU-${barcode}', 'Test Ürün ${barcode}', 100.00, 'Test', datetime('now'))
    `);
    
    // Product package ekle
    db.exec(`
      INSERT OR IGNORE INTO product_packages (id, product_id, barcode, package_type, width, height, length, weight, items_per_package, created_at) VALUES
      (${1000 + i}, ${1000 + i}, '${barcode}', 'Box', 10.0, 10.0, 10.0, 1.0, 1, datetime('now'))
    `);

    // Shelf assignment ekle (A1-01-359 rafına)
    db.exec(`
      INSERT OR IGNORE INTO shelf_packages (package_id, shelf_id, quantity, assigned_date) VALUES
      (${1000 + i}, (SELECT id FROM shelves WHERE shelf_code = 'A1-01-359' LIMIT 1), 10, datetime('now'))
    `);
    
    console.log(`✅ ${barcode} test datası eklendi`);
  }

  db.close();
  console.log('🎉 Tüm test barkodları başarıyla eklendi!');

} catch (error) {
  console.error('❌ Test barkodu ekleme hatası:', error);
  process.exit(1);
}