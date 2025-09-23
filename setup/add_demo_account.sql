-- ================================================
-- Add Demo Account Migration
-- ================================================
-- This migration adds a demo account for testing purposes
-- Email: demo@checkingcheckout.com
-- Password: Netronk@123
-- ================================================

-- First, add the demo email to allowed emails
INSERT INTO public.allowed_emails (email, is_active) 
VALUES ('demo@checkingcheckout.com', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;

-- Note: The user account creation needs to be done through Supabase Auth
-- You can either:
-- 1. Use the Supabase Dashboard to create the user manually
-- 2. Use the Supabase CLI auth signup command
-- 3. Use the signup API endpoint

-- After creating the user through Supabase Auth, the profile will be automatically 
-- created via the handle_new_user() trigger function.

-- However, if you need to manually insert the profile (after getting the auth user ID):
-- Replace 'USER_UUID_FROM_AUTH' with the actual UUID from auth.users table

-- Example profile insert (uncomment and update UUID after user creation):
/*
INSERT INTO public.profiles (id, email, name, role) 
VALUES (
  'USER_UUID_FROM_AUTH', -- Replace with actual auth.users.id
  'demo@checkingcheckout.com', 
  'Demo User', 
  'admin'
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
*/

-- Grant all permissions to demo user for all locations
-- (This will be executed after the profile is created)
-- Replace 'USER_UUID_FROM_AUTH' with the actual UUID from auth.users table

/*
DO $$
DECLARE
    demo_user_id UUID := 'USER_UUID_FROM_AUTH'; -- Replace with actual auth.users.id
    location_record RECORD;
BEGIN
    -- Grant permissions for all locations
    FOR location_record IN SELECT id FROM public.locations LOOP
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
            access_beds24
        ) VALUES (
            demo_user_id,
            location_record.id,
            true, -- dashboard
            true, -- income
            true, -- expenses
            true, -- reports
            true, -- calendar
            true, -- bookings
            true, -- rooms
            true, -- master_files
            true, -- accounts
            true, -- users
            true, -- settings
            true  -- beds24
        ) ON CONFLICT (user_id, location_id) DO UPDATE SET
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
            access_beds24 = true;
    END LOOP;
    
    RAISE NOTICE 'Demo user permissions granted for all locations';
END $$;
*/

-- ================================================
-- Manual Steps Required:
-- ================================================
-- 1. Create the user account through one of these methods:
--
--    Method A - Supabase Dashboard:
--    - Go to Authentication > Users in your Supabase dashboard
--    - Click "Add user"
--    - Email: demo@checkingcheckout.com
--    - Password: Netronk@123
--    - Email Confirm: true
--
--    Method B - Supabase CLI:
--    supabase auth signup --email demo@checkingcheckout.com --password Netronk@123
--
--    Method C - API Call:
--    curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/auth/v1/signup' \
--    -H "apikey: YOUR-ANON-KEY" \
--    -H "Content-Type: application/json" \
--    -d '{
--      "email": "demo@checkingcheckout.com",
--      "password": "Netronk@123"
--    }'
--
-- 2. After user creation, get the user UUID from auth.users table:
--    SELECT id FROM auth.users WHERE email = 'demo@checkingcheckout.com';
--
-- 3. Uncomment and update the profile and permissions sections above
--    Replace 'USER_UUID_FROM_AUTH' with the actual UUID
--
-- 4. Run the updated migration
-- ================================================

SELECT 'Demo account migration prepared. Follow the manual steps above to complete setup.' as status;