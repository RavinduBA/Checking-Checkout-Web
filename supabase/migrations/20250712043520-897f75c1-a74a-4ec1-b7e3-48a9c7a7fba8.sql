-- Insert sample data for testing

-- Insert sample locations (if not exists)
INSERT INTO public.locations (id, name, is_active) 
SELECT '550e8400-e29b-41d4-a716-446655440001', 'Asaliya Villa', true
WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE id = '550e8400-e29b-41d4-a716-446655440001');

INSERT INTO public.locations (id, name, is_active) 
SELECT '550e8400-e29b-41d4-a716-446655440002', 'Rusty Bunk', true
WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE id = '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO public.locations (id, name, is_active) 
SELECT '550e8400-e29b-41d4-a716-446655440003', 'Antiqua Serenity', true
WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE id = '550e8400-e29b-41d4-a716-446655440003');

-- Insert sample accounts
INSERT INTO public.accounts (id, name, currency, initial_balance, location_access) 
SELECT '750e8400-e29b-41d4-a716-446655440001', 'Cash Box', 'LKR', 50000, '{"550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"}'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = '750e8400-e29b-41d4-a716-446655440001');

INSERT INTO public.accounts (id, name, currency, initial_balance, location_access) 
SELECT '750e8400-e29b-41d4-a716-446655440002', 'Sampath Bank LKR', 'LKR', 150000, '{"550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"}'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = '750e8400-e29b-41d4-a716-446655440002');

INSERT INTO public.accounts (id, name, currency, initial_balance, location_access) 
SELECT '750e8400-e29b-41d4-a716-446655440003', 'Payoneer USD', 'USD', 500, '{"550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"}'
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = '750e8400-e29b-41d4-a716-446655440003');

-- Insert sample expense types
INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Utilities', 'Electricity'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Utilities' AND sub_type = 'Electricity');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Utilities', 'Water'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Utilities' AND sub_type = 'Water');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Utilities', 'Internet'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Utilities' AND sub_type = 'Internet');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Maintenance', 'Cleaning'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Maintenance' AND sub_type = 'Cleaning');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Maintenance', 'Repairs'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Maintenance' AND sub_type = 'Repairs');