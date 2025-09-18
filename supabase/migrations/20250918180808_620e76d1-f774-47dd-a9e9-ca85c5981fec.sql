-- Fix security issues: Add search_path to functions that are missing it

CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current year
  SELECT EXTRACT(YEAR FROM CURRENT_DATE) INTO counter;
  
  -- Generate a unique reservation number
  SELECT 'RES' || counter || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  FROM public.reservations 
  WHERE EXTRACT(YEAR FROM created_at) = counter
  INTO new_number;
  
  RETURN new_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current year
  SELECT EXTRACT(YEAR FROM CURRENT_DATE) INTO counter;
  
  -- Generate a unique payment number
  SELECT 'PAY' || counter || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  FROM public.payments 
  WHERE EXTRACT(YEAR FROM created_at) = counter
  INTO new_number;
  
  RETURN new_number;
END;
$function$;