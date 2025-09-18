-- Make allowed email check case-insensitive and normalize existing data

-- Normalize existing allowed_emails to lowercase to avoid mismatches
UPDATE public.allowed_emails SET email = lower(email);

-- Update function to compare emails case-insensitively
CREATE OR REPLACE FUNCTION public.is_email_allowed(email_address text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails 
    WHERE lower(email) = lower(email_address) AND is_active = true
  );
$function$;