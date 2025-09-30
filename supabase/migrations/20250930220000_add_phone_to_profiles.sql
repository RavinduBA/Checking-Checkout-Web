-- Add phone number field to profiles table for SMS notifications
ALTER TABLE public.profiles 
ADD COLUMN phone VARCHAR(20);

-- Add comment explaining the phone field
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for SMS notifications. Format: country code + number (e.g., 94719528589)';