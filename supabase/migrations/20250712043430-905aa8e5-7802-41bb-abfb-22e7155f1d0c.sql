-- Insert sample data for testing

-- Insert sample locations (if not exists)
INSERT INTO public.locations (id, name, is_active) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Asaliya Villa', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Rusty Bunk', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Antiqua Serenity', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample accounts
INSERT INTO public.accounts (id, name, currency, initial_balance, location_access) VALUES 
  ('750e8400-e29b-41d4-a716-446655440001', 'Cash Box', 'LKR', 50000, '{"550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"}'),
  ('750e8400-e29b-41d4-a716-446655440002', 'Sampath Bank LKR', 'LKR', 150000, '{"550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"}'),
  ('750e8400-e29b-41d4-a716-446655440003', 'Payoneer USD', 'USD', 500, '{"550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002","550e8400-e29b-41d4-a716-446655440003"}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample expense types
INSERT INTO public.expense_types (main_type, sub_type) VALUES 
  ('Utilities', 'Electricity'),
  ('Utilities', 'Water'),
  ('Utilities', 'Internet'),
  ('Maintenance', 'Cleaning'),
  ('Maintenance', 'Repairs'),
  ('Administrative', 'Insurance'),
  ('Administrative', 'Licenses'),
  ('Food & Beverages', 'Breakfast Items'),
  ('Food & Beverages', 'Welcome Drinks')
ON CONFLICT (main_type, sub_type) DO NOTHING;

-- Insert sample bookings
INSERT INTO public.bookings (id, location_id, source, guest_name, check_in, check_out, total_amount, advance_amount, paid_amount, status) VALUES 
  ('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'booking_com', 'John Smith', '2025-01-15 14:00:00+00', '2025-01-17 11:00:00+00', 25000, 0, 25000, 'confirmed'),
  ('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'airbnb', 'Sarah Johnson', '2025-01-20 14:00:00+00', '2025-01-23 11:00:00+00', 30000, 0, 0, 'pending'),
  ('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'direct', 'Mike Wilson', '2025-01-25 14:00:00+00', '2025-01-28 11:00:00+00', 40000, 15000, 15000, 'confirmed'),
  ('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'booking_com', 'Emma Davis', '2025-02-01 14:00:00+00', '2025-02-05 11:00:00+00', 35000, 0, 0, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Insert sample income records
INSERT INTO public.income (location_id, type, booking_id, amount, is_advance, payment_method, account_id, note) VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'booking', '850e8400-e29b-41d4-a716-446655440001', 25000, false, 'Bank Transfer', '750e8400-e29b-41d4-a716-446655440002', 'Full payment for John Smith booking'),
  ('550e8400-e29b-41d4-a716-446655440001', 'booking', '850e8400-e29b-41d4-a716-446655440003', 15000, true, 'Cash', '750e8400-e29b-41d4-a716-446655440001', 'Advance payment for Mike Wilson'),
  ('550e8400-e29b-41d4-a716-446655440002', 'laundry', null, 2000, false, 'Cash', '750e8400-e29b-41d4-a716-446655440001', 'Laundry service'),
  ('550e8400-e29b-41d4-a716-446655440001', 'food', null, 3500, false, 'Cash', '750e8400-e29b-41d4-a716-446655440001', 'Guest food order');

-- Insert sample expenses
INSERT INTO public.expenses (location_id, main_type, sub_type, amount, account_id, note) VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'Utilities', 'Electricity', 8500, '750e8400-e29b-41d4-a716-446655440002', 'Monthly electricity bill'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Utilities', 'Water', 3200, '750e8400-e29b-41d4-a716-446655440002', 'Monthly water bill'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Maintenance', 'Cleaning', 5000, '750e8400-e29b-41d4-a716-446655440001', 'Weekly cleaning service'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Food & Beverages', 'Breakfast Items', 4500, '750e8400-e29b-41d4-a716-446655440001', 'Grocery shopping for guest breakfast');

-- Insert booking sync URL for Rusty Bunk
INSERT INTO public.booking_sync_urls (location_id, source, ical_url) VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'booking_com', 'https://ical.booking.com/v1/export?t=1d0bea4b-1994-40ec-a9c9-8a718b6cb06a')
ON CONFLICT (location_id, source) DO NOTHING;