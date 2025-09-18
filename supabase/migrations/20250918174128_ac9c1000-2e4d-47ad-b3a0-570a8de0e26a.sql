-- Add allowed_emails table for Gmail restriction
CREATE TABLE public.allowed_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage allowed emails" 
ON public.allowed_emails 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Insert some default allowed emails
INSERT INTO public.allowed_emails (email) VALUES 
('admin@hotelina.com'),
('manager@hotelina.com'),
('staff@hotelina.com');

-- Update user_permissions table to include all sidebar permissions
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS access_bookings boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS access_rooms boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS access_master_files boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS access_accounts boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS access_users boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS access_settings boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS access_beds24 boolean NOT NULL DEFAULT false;

-- Create function to check if email is allowed
CREATE OR REPLACE FUNCTION public.is_email_allowed(email_address text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails 
    WHERE email = email_address AND is_active = true
  );
$$;

-- Create comprehensive permission management view
CREATE OR REPLACE VIEW public.user_permissions_view AS
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