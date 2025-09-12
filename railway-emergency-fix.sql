-- EMERGENCY FIX for Railway Database
-- This must be run in Railway Database Console

-- Check current table structure
PRAGMA table_info(role_permissions);

-- Drop and recreate the table with correct schema
DROP TABLE IF EXISTS role_permissions;

CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission)
);

-- Insert default admin permissions
INSERT INTO role_permissions (role, permission, enabled) VALUES
('admin', 'orders_view', 1),
('admin', 'orders_edit', 1),
('admin', 'orders_delete', 1),
('admin', 'picks_create', 1),
('admin', 'picks_manage', 1),
('admin', 'shelf_manage', 1),
('admin', 'products_view', 1),
('admin', 'products_edit', 1),
('admin', 'users_manage', 1),
('admin', 'users_create', 1),
('admin', 'users_edit', 1),
('admin', 'users_delete', 1),
('admin', 'role_permissions_manage', 1),
('admin', 'system_settings', 1),
('admin', 'reports_view', 1);

-- Insert operator permissions  
INSERT INTO role_permissions (role, permission, enabled) VALUES
('operator', 'orders_view', 1),
('operator', 'picks_create', 1),
('operator', 'shelf_manage', 1),
('operator', 'products_view', 1);

-- Insert service permissions
INSERT INTO role_permissions (role, permission, enabled) VALUES
('service', 'orders_view', 1),
('service', 'picks_create', 1),
('service', 'products_view', 1);

-- Verify the fix
SELECT * FROM role_permissions ORDER BY role, permission;