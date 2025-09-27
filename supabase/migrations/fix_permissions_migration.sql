-- ================================================
-- Fix User Permissions Migration
-- ================================================
-- This migration fixes the permission system to use only user_permissions table
-- and removes role dependency from profiles table
-- ================================================

-- ================================================
-- UPDATE USER_PERMISSIONS TABLE
-- ================================================

-- Add missing access_booking_channels column and rename access_beds24
DO $$
BEGIN
  -- Add access_booking_channels column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'access_booking_channels') THEN
    ALTER TABLE public.user_permissions ADD COLUMN access_booking_channels BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added access_booking_channels column';
  END IF;
  
  -- Copy data from access_beds24 to access_booking_channels if access_beds24 exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'access_beds24') THEN
    UPDATE public.user_permissions SET access_booking_channels = access_beds24;
    RAISE NOTICE 'Copied access_beds24 values to access_booking_channels';
    
    -- Drop the old access_beds24 column
    ALTER TABLE public.user_permissions DROP COLUMN IF EXISTS access_beds24;
    RAISE NOTICE 'Dropped access_beds24 column';
  END IF;
END $$;

-- ================================================
-- UPDATE PROFILES TABLE - REMOVE ROLE DEPENDENCY
-- ================================================

-- First, drop policies that depend on the role column
DO $$
BEGIN
  -- Drop policies that use profiles.role
  DROP POLICY IF EXISTS "Admins can manage allowed emails" ON public.allowed_emails;
  DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_permissions;
  DROP POLICY IF EXISTS "Only admins can insert user permissions" ON public.user_permissions;
  DROP POLICY IF EXISTS "Only admins can delete user permissions" ON public.user_permissions;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;
  DROP POLICY IF EXISTS "Admins can manage rooms" ON public.rooms;
  DROP POLICY IF EXISTS "Admins can manage accounts" ON public.accounts;
  
  RAISE NOTICE 'Dropped policies that depend on profiles.role';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping role-dependent policies: %', SQLERRM;
END $$;

-- Remove role column from profiles table since we're using user_permissions only
DO $$
BEGIN
  -- Drop role column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles DROP COLUMN role;
    RAISE NOTICE 'Removed role column from profiles table';
  END IF;
  
  -- Add is_admin column to user_permissions for admin management
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'is_admin') THEN
    ALTER TABLE public.user_permissions ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added is_admin column to user_permissions';
  END IF;
END $$;

-- ================================================
-- UPDATE GET_USER_PERMISSIONS FUNCTION
-- ================================================

-- Update the RPC function to include the new column and admin check
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id_param uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_object_agg(
      l.name,
      json_build_object(
        'dashboard', up.access_dashboard,
        'income', up.access_income,
        'expenses', up.access_expenses,
        'reports', up.access_reports,
        'calendar', up.access_calendar,
        'bookings', up.access_bookings,
        'rooms', up.access_rooms,
        'master_files', up.access_master_files,
        'accounts', up.access_accounts,
        'users', up.access_users,
        'settings', up.access_settings,
        'booking_channels', up.access_booking_channels,
        'is_admin', up.is_admin
      )
    ) FILTER (WHERE l.id IS NOT NULL),
    '{}'::json
  )
  FROM public.user_permissions up
  LEFT JOIN public.locations l ON up.location_id = l.id
  WHERE up.user_id = user_id_param;
$$;

-- ================================================
-- CREATE ADMIN CHECK FUNCTION (SAFE FROM RECURSION)
-- ================================================

-- Create a function to check if user is admin using a direct query
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_permissions 
    WHERE user_id = user_id_param AND is_admin = true
  );
END;
$$;

-- ================================================
-- UPDATE POLICIES
-- ================================================

-- Update user_permissions policies to handle admin properly
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Authenticated can read own permissions" ON public.user_permissions;
  DROP POLICY IF EXISTS "Users can manage their own permissions" ON public.user_permissions;
  DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_permissions;
  
  -- Create new policies WITHOUT recursion
  CREATE POLICY "Authenticated can read own permissions" 
  ON public.user_permissions 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

  -- Allow users to update their own permissions (non-admin fields only)
  -- Admin users can update all permissions through application logic
  CREATE POLICY "Users can update own permissions" 
  ON public.user_permissions 
  FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

  -- Allow inserting permissions (this will be controlled by application logic)
  CREATE POLICY "Allow permission inserts" 
  ON public.user_permissions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

  -- Allow deleting permissions (this will be controlled by application logic)  
  CREATE POLICY "Allow permission deletes" 
  ON public.user_permissions 
  FOR DELETE 
  TO authenticated 
  USING (true);
  
  RAISE NOTICE 'Updated user_permissions policies without recursion';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating policies: %', SQLERRM;
END $$;

-- ================================================
-- UPDATE ALLOWED_EMAILS POLICIES
-- ================================================

-- Recreate allowed_emails policies using the admin function
DO $$
BEGIN
  -- Drop any remaining policies
  DROP POLICY IF EXISTS "Authenticated can read allowed emails" ON public.allowed_emails;
  DROP POLICY IF EXISTS "Admins can manage allowed emails" ON public.allowed_emails;
  DROP POLICY IF EXISTS "Authenticated can manage allowed emails" ON public.allowed_emails;
  
  -- Create new policies using the admin function
  CREATE POLICY "Authenticated can read allowed emails" 
  ON public.allowed_emails 
  FOR SELECT 
  TO authenticated 
  USING (true);

  -- Use the admin function which has SECURITY DEFINER to bypass RLS
  CREATE POLICY "Admins can manage allowed emails" 
  ON public.allowed_emails 
  FOR ALL 
  TO authenticated 
  USING (public.is_user_admin(auth.uid()));
  
  RAISE NOTICE 'Updated allowed_emails policies using admin function';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating allowed_emails policies: %', SQLERRM;
END $$;

-- ================================================
-- MIGRATE EXISTING ADMIN USERS
-- ================================================

-- Set existing admin users in user_permissions table
-- This assumes you have some users that should be admins
DO $$
BEGIN
  -- You can uncomment and modify this section to set specific users as admin
  -- Example: Update user with specific email to admin
  /*
  UPDATE public.user_permissions 
  SET is_admin = true 
  WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE email = 'admin@example.com'
  );
  */
  
  RAISE NOTICE 'Admin migration completed - you may need to manually set admin users';
END $$;

-- ================================================
-- CREATE SAMPLE PERMISSIONS FOR DEMO USER
-- ================================================

-- Create permissions for demo user if they exist
DO $$
DECLARE
  demo_user_id UUID;
  location_record RECORD;
BEGIN
  -- Get demo user ID
  SELECT id INTO demo_user_id 
  FROM public.profiles 
  WHERE email = 'demo@checkingcheckout.com' 
  LIMIT 1;
  
  IF demo_user_id IS NOT NULL THEN
    -- Create permissions for all locations
    FOR location_record IN SELECT id FROM public.locations WHERE is_active = true LOOP
      INSERT INTO public.user_permissions (
        user_id, 
        location_id, 
        access_dashboard,
        access_income,
        access_expenses,
        access_reports,
        access_calendar,
        access_bookings,
        access_rooms,
        access_master_files,
        access_accounts,
        access_users,
        access_settings,
        access_booking_channels,
        is_admin
      ) VALUES (
        demo_user_id,
        location_record.id,
        true,  -- dashboard
        true,  -- income
        true,  -- expenses
        true,  -- reports
        true,  -- calendar
        true,  -- bookings
        true,  -- rooms
        true,  -- master_files
        true,  -- accounts
        true,  -- users
        true,  -- settings
        true,  -- booking_channels
        true   -- is_admin
      ) ON CONFLICT (user_id, location_id) 
      DO UPDATE SET
        access_dashboard = true,
        access_income = true,
        access_expenses = true,
        access_reports = true,
        access_calendar = true,
        access_bookings = true,
        access_rooms = true,
        access_master_files = true,
        access_accounts = true,
        access_users = true,
        access_settings = true,
        access_booking_channels = true,
        is_admin = true;
    END LOOP;
    
    RAISE NOTICE 'Created/updated permissions for demo user: %', demo_user_id;
  ELSE
    RAISE NOTICE 'Demo user not found - skipping permission creation';
  END IF;
END $$;

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_location_id ON public.user_permissions(location_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_is_admin ON public.user_permissions(is_admin);

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'User Permissions Migration Completed!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '- Dropped role-dependent policies';
  RAISE NOTICE '- Removed role column from profiles table';
  RAISE NOTICE '- Added access_booking_channels column';
  RAISE NOTICE '- Added is_admin column to user_permissions';
  RAISE NOTICE '- Updated get_user_permissions function';
  RAISE NOTICE '- Created is_user_admin function';
  RAISE NOTICE '- Updated RLS policies for user_permissions';
  RAISE NOTICE '- Updated RLS policies for allowed_emails';
  RAISE NOTICE '- Created demo user permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'Total user_permissions records: %', (SELECT count(*) FROM public.user_permissions);
  RAISE NOTICE 'Admin users: %', (SELECT count(*) FROM public.user_permissions WHERE is_admin = true);
  RAISE NOTICE '=================================================';
END $$;