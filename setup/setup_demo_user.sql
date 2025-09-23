-- ============================================================================
-- POST-SETUP SCRIPT: Configure Demo User
-- ============================================================================
-- Run this script AFTER creating the demo@checkingcheckout.com user in Supabase Auth
-- This script will set up the demo user profile and permissions

-- First, get the user ID from auth.users (replace with actual UUID after user creation)
-- You'll need to get this from Supabase Auth Dashboard or by querying auth.users

-- Create demo user profile (replace 'USER_UUID_HERE' with actual UUID)
-- INSERT INTO public.profiles (id, email, name, role) VALUES 
--   ('USER_UUID_HERE', 'demo@checkingcheckout.com', 'Demo User', 'admin');

-- Alternative: Update existing profile to admin
UPDATE public.profiles 
SET role = 'admin', name = 'Demo User Admin'
WHERE email = 'demo@checkingcheckout.com';

-- Set up admin permissions for all locations
DO $$
DECLARE
    user_id uuid;
    location_record RECORD;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id FROM public.profiles WHERE email = 'demo@checkingcheckout.com';
    
    IF user_id IS NOT NULL THEN
        -- Remove any existing permissions for this user
        DELETE FROM public.user_permissions WHERE user_id = user_id;
        
        -- Add full admin permissions for all active locations
        FOR location_record IN 
            SELECT id FROM public.locations WHERE is_active = true
        LOOP
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
                access_booking_channels
            ) VALUES (
                user_id,
                location_record.id,
                true, true, true, true, true, true, true, true, true, true, true, true
            );
        END LOOP;
        
        RAISE NOTICE 'Demo user configured successfully with admin permissions for all locations';
    ELSE
        RAISE NOTICE 'Demo user not found. Please create the user account first in Supabase Auth.';
    END IF;
END $$;

-- Add some sample data for the demo
INSERT INTO public.rooms (location_id, room_number, room_type, bed_type, max_occupancy, base_price, description, amenities) 
SELECT 
    l.id,
    'R-' || substr(gen_random_uuid()::text, 1, 8),
    'Deluxe',
    'King',
    2,
    15000,
    'Comfortable deluxe room with modern amenities',
    ARRAY['WiFi', 'AC', 'TV', 'Mini Bar']
FROM public.locations l
WHERE l.name = 'Asaliya Villa'
LIMIT 3
ON CONFLICT DO NOTHING;

-- Add sample bookings
INSERT INTO public.bookings (location_id, room_id, source, guest_name, check_in, check_out, total_amount, status)
SELECT 
    l.id,
    r.id,
    'direct',
    'John Doe',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '10 days',
    45000,
    'confirmed'
FROM public.locations l
JOIN public.rooms r ON r.location_id = l.id
WHERE l.name = 'Asaliya Villa'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add sample income
INSERT INTO public.income (location_id, type, amount, payment_method, account_id, note)
SELECT 
    l.id,
    'booking',
    25000,
    'Cash',
    a.id,
    'Sample booking payment'
FROM public.locations l
JOIN public.accounts a ON 'Asaliya Villa' = ANY(a.location_access)
WHERE l.name = 'Asaliya Villa' AND a.name = 'Asaliya Cash'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add sample expenses
INSERT INTO public.expenses (location_id, main_type, sub_type, amount, account_id, note)
SELECT 
    l.id,
    'Utilities',
    'Electricity',
    8500,
    a.id,
    'Monthly electricity bill'
FROM public.locations l
JOIN public.accounts a ON 'Asaliya Villa' = ANY(a.location_access)
WHERE l.name = 'Asaliya Villa' AND a.name = 'Asaliya Cash'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEMO USER SETUP COMPLETE
-- ============================================================================