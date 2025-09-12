-- Fix for Railway database role_permissions table
-- This script adds the missing 'enabled' column to the role_permissions table

-- First, check if the column already exists
PRAGMA table_info(role_permissions);

-- Add the enabled column if it doesn't exist
ALTER TABLE role_permissions ADD COLUMN enabled INTEGER DEFAULT 1;

-- Insert some default permissions for admin role if they don't exist
INSERT OR IGNORE INTO role_permissions (role, permission, enabled) VALUES
('admin', 'orders_view', 1),
('admin', 'orders_edit', 1),
('admin', 'picks_create', 1),
('admin', 'picks_manage', 1),
('admin', 'shelf_manage', 1),
('admin', 'products_view', 1),
('admin', 'users_manage', 1);

-- Verify the changes
SELECT * FROM role_permissions WHERE role = 'admin';