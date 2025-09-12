-- Delivery System Migration
-- Add delivery_status column to orders table and create delivery tables

-- Add delivery_status to orders table
ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT NULL;

-- Create deliveries table if not exists (will be created by schema.sql)
-- This is just for reference/documentation

-- Create delivery_scans table if not exists (will be created by schema.sql)
-- This is just for reference/documentation

-- The actual tables are created in schema.sql
-- This migration just adds the delivery_status column to existing orders