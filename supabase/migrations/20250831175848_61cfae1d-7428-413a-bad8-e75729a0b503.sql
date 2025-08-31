-- Insert Asaliya Villa location
INSERT INTO public.locations (name, is_active)
SELECT 'Asaliya Villa', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.locations WHERE name = 'Asaliya Villa'
);