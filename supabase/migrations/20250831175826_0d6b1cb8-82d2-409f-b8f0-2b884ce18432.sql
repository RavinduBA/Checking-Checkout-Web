-- Insert Asaliya Villa location if it doesn't exist
INSERT INTO public.locations (name, is_active)
VALUES ('Asaliya Villa', true)
ON CONFLICT (name) DO NOTHING;