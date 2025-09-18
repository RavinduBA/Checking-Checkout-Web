-- Drop the problematic view since RLS can't be applied to views
DROP VIEW IF EXISTS public.user_permissions_view;

-- Create helper function to get user permissions
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
        'beds24', up.access_beds24
      )
    ) FILTER (WHERE l.id IS NOT NULL),
    '{}'::json
  )
  FROM public.user_permissions up
  LEFT JOIN public.locations l ON up.location_id = l.id
  WHERE up.user_id = user_id_param;
$$;