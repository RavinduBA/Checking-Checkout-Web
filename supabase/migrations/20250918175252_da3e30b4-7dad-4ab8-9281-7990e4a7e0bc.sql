-- Clear all existing allowed emails
DELETE FROM public.allowed_emails;

-- Add www.hotelina@gmail.com with admin access
INSERT INTO public.allowed_emails (email, is_active) VALUES ('www.hotelina@gmail.com', true);