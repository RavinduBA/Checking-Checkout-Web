-- =====================================================
-- RLS Policy Performance Optimizations
-- =====================================================
-- This migration optimizes existing RLS policies for better performance
-- based on Supabase best practices for multi-tenant applications

-- =====================================================
-- 1. OPTIMIZE auth.uid() USAGE IN POLICIES
-- =====================================================

-- Drop and recreate user permissions policies with SELECT wrapping
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
  DROP POLICY IF EXISTS "Users can update their own permissions" ON user_permissions;
  DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;
END $$;

-- Optimized user permissions policies
CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT TO authenticated
  USING ( 
    user_id = (SELECT auth.uid()) OR
    EXISTS(
      SELECT 1 FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.tenant_id = user_permissions.tenant_id 
      AND up.is_tenant_admin = true
    )
  );

CREATE POLICY "Admins can manage permissions" ON user_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.tenant_id = user_permissions.tenant_id 
      AND up.is_tenant_admin = true
    )
  );

-- =====================================================
-- 2. OPTIMIZE PROFILES POLICIES
-- =====================================================

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
END $$;

-- Optimized profiles policies with role specification
CREATE POLICY "Users can view profiles in their tenant" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING ( id = (SELECT auth.uid()) )
  WITH CHECK ( id = (SELECT auth.uid()) );

-- =====================================================
-- 3. OPTIMIZE RESERVATIONS POLICIES  
-- =====================================================

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view reservations in their tenant" ON reservations;
  DROP POLICY IF EXISTS "Users can manage reservations in their locations" ON reservations;
END $$;

-- Optimized reservations policies avoiding joins
CREATE POLICY "Users can view reservations in their tenant" ON reservations
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can manage reservations in accessible locations" ON reservations
  FOR ALL TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_bookings = true
    )
  );

-- =====================================================
-- 4. OPTIMIZE INCOME/EXPENSES POLICIES
-- =====================================================

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view income in their locations" ON income;
  DROP POLICY IF EXISTS "Users can manage income in their locations" ON income;
  DROP POLICY IF EXISTS "Users can view expenses in their locations" ON expenses;
  DROP POLICY IF EXISTS "Users can manage expenses in their locations" ON expenses;
END $$;

-- Optimized income policies
CREATE POLICY "Users can view income in accessible locations" ON income
  FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_income = true
    )
  );

CREATE POLICY "Users can manage income in accessible locations" ON income
  FOR ALL TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_income = true
    )
  );

-- Optimized expenses policies  
CREATE POLICY "Users can view expenses in accessible locations" ON expenses
  FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_expenses = true
    )
  );

CREATE POLICY "Users can manage expenses in accessible locations" ON expenses
  FOR ALL TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_expenses = true
    )
  );

-- =====================================================
-- 5. OPTIMIZE LOCATIONS POLICIES
-- =====================================================

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can only see locations in their tenant" ON locations;
  DROP POLICY IF EXISTS "Users can manage locations they have access to" ON locations;
END $$;

-- Optimized locations policies
CREATE POLICY "Users can view locations in their tenant" ON locations
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.tenant_id = locations.tenant_id 
      AND up.is_tenant_admin = true
    )
  );

-- =====================================================
-- 6. OPTIMIZE ROOMS POLICIES
-- =====================================================

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view rooms in their accessible locations" ON rooms;
  DROP POLICY IF EXISTS "Users can manage rooms in their accessible locations" ON rooms;
END $$;

-- Optimized rooms policies
CREATE POLICY "Users can view rooms in accessible locations" ON rooms
  FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_rooms = true
    )
  );

CREATE POLICY "Users can manage rooms in accessible locations" ON rooms
  FOR ALL TO authenticated
  USING (
    location_id IN (
      SELECT up.location_id FROM user_permissions up 
      WHERE up.user_id = (SELECT auth.uid()) 
      AND up.access_rooms = true
    )
  );

-- =====================================================
-- 7. CREATE SECURITY DEFINER HELPER FUNCTIONS
-- =====================================================

-- Function to check tenant access (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION has_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) AND tenant_id = p_tenant_id
  );
END;
$$;

-- Function to check location access
CREATE OR REPLACE FUNCTION has_location_access(p_location_id uuid, p_permission_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_permissions up 
    WHERE up.user_id = (SELECT auth.uid()) 
    AND up.location_id = p_location_id
    AND (
      CASE p_permission_type
        WHEN 'dashboard' THEN up.access_dashboard
        WHEN 'income' THEN up.access_income
        WHEN 'expenses' THEN up.access_expenses
        WHEN 'bookings' THEN up.access_bookings
        WHEN 'rooms' THEN up.access_rooms
        WHEN 'reports' THEN up.access_reports
        WHEN 'calendar' THEN up.access_calendar
        ELSE false
      END
    ) = true
  );
END;
$$;

-- Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(p_tenant_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_tenant_id uuid;
BEGIN
  -- If no tenant_id provided, get from user's profile
  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO target_tenant_id 
    FROM profiles 
    WHERE id = (SELECT auth.uid());
  ELSE
    target_tenant_id := p_tenant_id;
  END IF;

  RETURN EXISTS(
    SELECT 1 FROM user_permissions up 
    WHERE up.user_id = (SELECT auth.uid()) 
    AND up.tenant_id = target_tenant_id 
    AND up.is_tenant_admin = true
  );
END;
$$;

-- =====================================================
-- 8. PERFORMANCE MONITORING VIEWS
-- =====================================================

-- Create a view to monitor RLS policy performance
CREATE OR REPLACE VIEW rls_performance_monitor AS
SELECT 
  schemaname,
  tablename,
  'RLS Enabled' as security_type,
  CASE WHEN rowsecurity THEN 'ON' ELSE 'OFF' END as rls_status
FROM pg_tables pt
LEFT JOIN pg_class pc ON pt.tablename = pc.relname
WHERE schemaname = 'public'
  AND rowsecurity IS NOT NULL;

-- Create a view to monitor index usage on RLS columns
CREATE OR REPLACE VIEW rls_index_usage AS
SELECT 
  i.schemaname,
  i.tablename,
  i.indexname,
  i.idx_scan,
  i.idx_tup_read,
  i.idx_tup_fetch,
  CASE 
    WHEN i.indexname LIKE '%tenant%' THEN 'Tenant Isolation'
    WHEN i.indexname LIKE '%user%' THEN 'User Access'
    WHEN i.indexname LIKE '%location%' THEN 'Location Filter'
    ELSE 'Other'
  END as index_purpose
FROM pg_stat_user_indexes i
WHERE i.schemaname = 'public'
  AND (i.indexname LIKE '%tenant%' OR i.indexname LIKE '%user%' OR i.indexname LIKE '%location%')
ORDER BY i.idx_scan DESC;

-- =====================================================
-- NOTES
-- =====================================================

/*
Performance Testing Queries:

1. Test auth.uid() caching:
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM user_permissions WHERE user_id = auth.uid();

2. Test index usage:
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM reservations WHERE tenant_id = 'your-tenant-id';

3. Monitor policy execution:
   SELECT * FROM rls_performance_monitor;
   SELECT * FROM rls_index_usage;

4. Check cache hit rates:
   SELECT 
     'index hit rate' as name,
     round((sum(idx_blks_hit)) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100, 2) as ratio
   FROM pg_statio_user_indexes;
*/