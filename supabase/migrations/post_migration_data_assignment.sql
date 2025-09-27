-- =====================================================
-- POST-MIGRATION DATA ASSIGNMENT SCRIPT
-- =====================================================
-- This script should be run AFTER the main SaaS migration
-- It handles migrating existing demo data to a tenant structure
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE DEFAULT TENANT FOR EXISTING DATA
-- =====================================================
DO $$
DECLARE
  demo_tenant_id uuid;
  admin_profile_id uuid;
BEGIN
  -- Find the first admin profile to be the tenant owner
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- Create demo tenant
  INSERT INTO public.tenants (
    name, 
    slug, 
    owner_profile_id, 
    hotel_name, 
    onboarding_completed,
    subscription_status,
    trial_ends_at
  ) VALUES (
    'Demo Hotel Organization',
    'demo-hotel',
    admin_profile_id,
    'Demo Hotel',
    true, -- Mark as completed since it's existing data
    'trial',
    now() + interval '30 days' -- Extended trial for existing users
  )
  RETURNING id INTO demo_tenant_id;

  -- Update all existing locations
  UPDATE public.locations 
  SET tenant_id = demo_tenant_id 
  WHERE tenant_id IS NULL;

  -- Update all existing rooms  
  UPDATE public.rooms 
  SET tenant_id = demo_tenant_id 
  WHERE tenant_id IS NULL;

  -- Update all existing reservations
  UPDATE public.reservations 
  SET tenant_id = demo_tenant_id 
  WHERE tenant_id IS NULL;

  -- Update all existing user permissions
  UPDATE public.user_permissions 
  SET tenant_id = demo_tenant_id,
      is_tenant_admin = CASE 
        WHEN EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = user_permissions.user_id AND p.role = 'admin')
        THEN true 
        ELSE false 
      END
  WHERE tenant_id IS NULL;

  -- Update all existing profiles
  UPDATE public.profiles 
  SET tenant_id = demo_tenant_id 
  WHERE tenant_id IS NULL;

  -- Create default subscription for demo tenant
  INSERT INTO public.subscriptions (
    tenant_id,
    plan_id,
    status,
    trial_end,
    current_period_start,
    current_period_end
  ) VALUES (
    demo_tenant_id,
    'professional', -- Give them professional plan for demo
    'trialing',
    now() + interval '30 days',
    now(),
    now() + interval '30 days'
  );

  RAISE NOTICE 'Demo tenant created with ID: %', demo_tenant_id;
END;
$$;

-- =====================================================
-- 2. UPDATE EXISTING RLS POLICIES FOR TENANT ISOLATION
-- =====================================================

-- Update locations policies
DROP POLICY IF EXISTS "Users can only see locations they have access to" ON public.locations;
CREATE POLICY "Users can only see locations in their tenant" ON public.locations
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Update rooms policies  
DROP POLICY IF EXISTS "Users can only see rooms they have access to" ON public.rooms;
CREATE POLICY "Users can only see rooms in their tenant" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Update reservations policies
DROP POLICY IF EXISTS "Users can only see reservations they have access to" ON public.reservations;
CREATE POLICY "Users can only see reservations in their tenant" ON public.reservations
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Update user permissions policies
DROP POLICY IF EXISTS "Users can only see their own permissions" ON public.user_permissions;
CREATE POLICY "Users can see permissions in their tenant" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- =====================================================
-- 3. CREATE ADMIN HELPER POLICIES (SUPER ADMIN ACCESS)
-- =====================================================

-- Allow super admins to see all tenants
CREATE POLICY "Super admins can see all tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- Allow super admins to manage all subscriptions
CREATE POLICY "Super admins can manage all subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- Allow super admins to see all invoices
CREATE POLICY "Super admins can see all invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- =====================================================
-- 4. UPDATE GET_USER_PERMISSIONS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
RETURNS TABLE(
  permission_name text,
  has_permission boolean,
  tenant_id uuid,
  tenant_role text,
  is_tenant_admin boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.permission_name,
    CASE 
      WHEN pr.role = 'super_admin' THEN true
      WHEN up.is_tenant_admin = true THEN true
      ELSE up.has_permission
    END as has_permission,
    up.tenant_id,
    up.tenant_role::text,
    COALESCE(up.is_tenant_admin, false) as is_tenant_admin
  FROM (
    VALUES 
      ('dashboard'),
      ('income'), 
      ('expenses'),
      ('reports'),
      ('calendar'),
      ('bookings'),
      ('rooms'),
      ('master_files'),
      ('accounts'),
      ('users'),
      ('settings'),
      ('booking_channels')
  ) AS p(permission_name)
  LEFT JOIN public.user_permissions up ON true
  LEFT JOIN public.profiles pr ON pr.id = user_id
  WHERE up.user_id = user_id OR pr.role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked correctly:

-- Check tenant creation
-- SELECT * FROM public.tenants;

-- Check data assignment  
-- SELECT 
--   (SELECT COUNT(*) FROM public.locations WHERE tenant_id IS NOT NULL) as locations_assigned,
--   (SELECT COUNT(*) FROM public.rooms WHERE tenant_id IS NOT NULL) as rooms_assigned,
--   (SELECT COUNT(*) FROM public.reservations WHERE tenant_id IS NOT NULL) as reservations_assigned,
--   (SELECT COUNT(*) FROM public.profiles WHERE tenant_id IS NOT NULL) as profiles_assigned;

-- Check subscription creation
-- SELECT * FROM public.subscriptions;

-- Test permissions function
-- SELECT * FROM public.get_user_permissions('YOUR_USER_ID_HERE');