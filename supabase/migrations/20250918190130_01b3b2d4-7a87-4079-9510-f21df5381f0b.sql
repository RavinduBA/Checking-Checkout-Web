-- Update RLS policies for reservations to be location-based
DROP POLICY IF EXISTS "Authenticated can read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated can write reservations" ON public.reservations;

-- Create location-based policies for reservations
CREATE POLICY "Users can view reservations for their locations" 
ON public.reservations 
FOR SELECT 
USING (
  -- Allow access if user is admin
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR
  -- Allow access if user has booking permissions for the location
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.locations l ON up.location_id = l.id
    WHERE up.user_id = auth.uid() 
    AND l.id = reservations.location_id
    AND (up.access_bookings = true OR up.access_calendar = true)
  )
);

CREATE POLICY "Users can create reservations for their locations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR
  -- Allow if user has booking permissions for the location
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.locations l ON up.location_id = l.id
    WHERE up.user_id = auth.uid() 
    AND l.id = location_id
    AND up.access_bookings = true
  )
);

CREATE POLICY "Users can update reservations for their locations" 
ON public.reservations 
FOR UPDATE 
USING (
  -- Allow if user is admin
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR
  -- Allow if user has booking permissions for the location
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.locations l ON up.location_id = l.id
    WHERE up.user_id = auth.uid() 
    AND l.id = reservations.location_id
    AND up.access_bookings = true
  )
);

CREATE POLICY "Users can delete reservations for their locations" 
ON public.reservations 
FOR DELETE 
USING (
  -- Allow if user is admin
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR
  -- Allow if user has booking permissions for the location
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.locations l ON up.location_id = l.id
    WHERE up.user_id = auth.uid() 
    AND l.id = reservations.location_id
    AND up.access_bookings = true
  )
);