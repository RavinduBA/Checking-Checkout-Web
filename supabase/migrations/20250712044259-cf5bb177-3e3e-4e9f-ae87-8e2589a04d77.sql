-- Fix profile creation policy to allow users to create their own profile
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create iCal sync edge function for booking calendar sync
CREATE OR REPLACE FUNCTION public.sync_ical_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called by edge function to sync iCal data
  -- Edge function will handle the actual iCal parsing and call this with clean data
  RAISE NOTICE 'iCal sync function created';
END;
$$;