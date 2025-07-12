-- Delete all existing bookings to reset calendar
DELETE FROM bookings;

-- Create income_types table for managing income categories
CREATE TABLE public.income_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.income_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view income types" 
ON public.income_types 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage income types" 
ON public.income_types 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role))));

-- Insert default income types
INSERT INTO public.income_types (type_name) VALUES 
('booking'),
('laundry'),
('food'),
('other');