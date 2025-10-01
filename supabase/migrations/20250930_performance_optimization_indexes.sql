-- =====================================================
-- Performance Optimization: Critical RLS Indexes
-- =====================================================
-- This migration adds critical indexes to improve RLS performance
-- and multi-tenant query efficiency for the hospitality ERP system.
-- 
-- IMPORTANT: Run these indexes CONCURRENTLY to avoid downtime
-- Some of these may need to be run outside of transaction blocks

-- =====================================================
-- 1. USER PERMISSIONS INDEXES (MOST CRITICAL)
-- =====================================================

-- Primary user permissions lookup - used in every authenticated request
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_user_tenant 
ON user_permissions (user_id, tenant_id);

-- User permissions by tenant and location for location-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_tenant_location 
ON user_permissions (tenant_id, location_id);

-- User permissions by location for quick location access checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_location_id 
ON user_permissions (location_id);

-- =====================================================
-- 2. CORE AUTHENTICATION & TENANT INDEXES
-- =====================================================

-- Profile tenant lookup - used in auth context
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_tenant_id 
ON profiles (tenant_id);

-- Locations by tenant - used in location switching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_tenant_id 
ON locations (tenant_id);

-- Active locations filter (commonly used)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_tenant_active 
ON locations (tenant_id, is_active) WHERE is_active = true;

-- =====================================================
-- 3. BUSINESS LOGIC INDEXES
-- =====================================================

-- Reservations by tenant and location (heavily used in dashboard/reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_tenant_location 
ON reservations (tenant_id, location_id);

-- Reservations by check-in date for calendar views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_checkin_tenant 
ON reservations (check_in, tenant_id);

-- Active reservations by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_status_tenant 
ON reservations (reservation_status, tenant_id) 
WHERE reservation_status IN ('confirmed', 'checked_in');

-- Rooms by tenant and location
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_tenant_location 
ON rooms (tenant_id, location_id);

-- =====================================================
-- 4. FINANCIAL DATA INDEXES (DASHBOARD PERFORMANCE)
-- =====================================================

-- Income by tenant, location and date (dashboard queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_tenant_location_date 
ON income (tenant_id, location_id, date DESC);

-- Income covering index for amount calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_location_date_amount 
ON income (location_id, date DESC) INCLUDE (amount, tenant_id);

-- Expenses by tenant, location and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_tenant_location_date 
ON expenses (tenant_id, location_id, date DESC);

-- Expenses covering index for amount calculations  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_location_date_amount 
ON expenses (location_id, date DESC) INCLUDE (amount, tenant_id);

-- =====================================================
-- 5. INVITATION & USER MANAGEMENT INDEXES
-- =====================================================

-- User invitations by email and tenant (invitation lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_invitations_email_tenant 
ON user_invitations (email, tenant_id);

-- Pending invitations by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_invitations_pending 
ON user_invitations (tenant_id, created_at DESC) 
WHERE accepted_at IS NULL;

-- =====================================================
-- 6. EXTERNAL INTEGRATIONS INDEXES
-- =====================================================

-- External bookings by location
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_bookings_location 
ON external_bookings (location_id);

-- Booking sync URLs by location
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_sync_urls_location 
ON booking_sync_urls (location_id);

-- =====================================================
-- 7. ACCOUNTS & FINANCIAL TRACKING
-- =====================================================

-- Accounts by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_tenant_id 
ON accounts (tenant_id);

-- =====================================================
-- NOTES FOR MANUAL EXECUTION
-- =====================================================

/*
IMPORTANT: Some indexes may need to be created manually due to CONCURRENTLY limitations:

1. Connect to your Supabase database
2. Run each CREATE INDEX CONCURRENTLY command individually
3. Monitor progress with:
   
   SELECT 
     indexname, 
     schemaname, 
     tablename,
     pg_size_pretty(pg_relation_size(indexname::regclass)) as size
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND indexname LIKE 'idx_%'
   ORDER BY pg_relation_size(indexname::regclass) DESC;

4. Check index usage after implementation:
   
   SELECT 
     schemaname,
     tablename, 
     indexname,
     idx_scan,
     idx_tup_read
   FROM pg_stat_user_indexes 
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
*/