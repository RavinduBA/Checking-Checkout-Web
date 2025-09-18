-- Fix security issue: Remove security definer view and create normal view
DROP VIEW IF EXISTS public.user_permissions_view;

-- Create regular view without SECURITY DEFINER
CREATE VIEW public.user_permissions_view AS
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  p.created_at,
  COALESCE(
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
  ) as permissions_by_location
FROM public.profiles p
LEFT JOIN public.user_permissions up ON p.id = up.user_id
LEFT JOIN public.locations l ON up.location_id = l.id
GROUP BY p.id, p.name, p.email, p.role, p.created_at;

-- Enable RLS on the view
ALTER VIEW public.user_permissions_view SET (security_barrier = true);

-- Create RLS policies for the view
CREATE POLICY "Users can view user permissions" 
ON public.user_permissions_view 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);