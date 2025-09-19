-- ============================================================================
-- SUPABASE MIGRATION SCRIPT: Rename beds24 references to booking channels
-- ============================================================================
-- This script renames all beds24-related tables, columns, and constraints 
-- to use generic "channel" terminology for booking channel integration.
--
-- IMPORTANT: Run this script in your Supabase SQL Editor or via CLI
-- ============================================================================

-- 1. RENAME TABLE: beds24_property_mappings -> channel_property_mappings
-- ============================================================================
ALTER TABLE beds24_property_mappings RENAME TO channel_property_mappings;

-- 2. RENAME COLUMNS: beds24_* -> channel_*
-- ============================================================================
ALTER TABLE channel_property_mappings 
RENAME COLUMN beds24_property_id TO channel_property_id;

ALTER TABLE channel_property_mappings 
RENAME COLUMN beds24_property_name TO channel_property_name;

-- 3. UPDATE USER PERMISSIONS: access_beds24 -> access_booking_channels
-- ============================================================================
ALTER TABLE user_permissions 
RENAME COLUMN access_beds24 TO access_booking_channels;

-- 4. UPDATE EXISTING DATA (if any exists)
-- ============================================================================
-- Update any existing data that might reference the old column names
-- This is a safety measure in case there are any hardcoded references

-- 5. VERIFY THE CHANGES
-- ============================================================================
-- Check that the table was renamed correctly
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'channel_property_mappings';

-- Check that the columns were renamed correctly
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'channel_property_mappings'
  AND column_name IN ('channel_property_id', 'channel_property_name');

-- Check that the user permissions column was renamed correctly
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_permissions'
  AND column_name = 'access_booking_channels';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Foreign key constraints will be automatically updated by PostgreSQL
-- 2. The constraint names will reflect the new table name automatically
-- 3. Any indexes on the renamed columns will also be updated automatically
-- 4. RLS policies (if any) will continue to work with the new table name
-- ============================================================================
