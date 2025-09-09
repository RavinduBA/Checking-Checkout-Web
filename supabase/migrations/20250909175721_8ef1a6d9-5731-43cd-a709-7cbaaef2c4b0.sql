-- Fix RLS policy for profiles table to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add foreign key relationship between external_bookings and locations
ALTER TABLE public.external_bookings 
ADD CONSTRAINT fk_external_bookings_location 
FOREIGN KEY (location_id) REFERENCES public.locations(id);

-- Create an index for better performance
CREATE INDEX idx_external_bookings_location_id ON public.external_bookings(location_id);
CREATE INDEX idx_external_bookings_source ON public.external_bookings(source);
CREATE INDEX idx_external_bookings_check_in ON public.external_bookings(check_in);
CREATE INDEX idx_external_bookings_external_id ON public.external_bookings(external_id);