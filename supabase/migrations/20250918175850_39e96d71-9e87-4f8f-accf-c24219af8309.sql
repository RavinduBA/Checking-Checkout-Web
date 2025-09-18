-- Update www.hotelina@gmail.com to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'www.hotelina@gmail.com';

-- Get the user ID for permission setup
DO $$
DECLARE
    target_user_id uuid;
    location_record RECORD;
BEGIN
    -- Get the user ID
    SELECT id INTO target_user_id FROM public.profiles WHERE email = 'www.hotelina@gmail.com';
    
    -- Remove any existing permissions for this user
    DELETE FROM public.user_permissions WHERE public.user_permissions.user_id = target_user_id;
    
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
            access_beds24
        ) VALUES (
            target_user_id,
            location_record.id,
            true, true, true, true, true, true, true, true, true, true, true, true
        );
    END LOOP;
END $$;