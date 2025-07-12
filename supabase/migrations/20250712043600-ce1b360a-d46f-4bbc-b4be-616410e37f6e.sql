-- Continue inserting sample data

-- Insert more expense types
INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Administrative', 'Insurance'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Administrative' AND sub_type = 'Insurance');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Administrative', 'Licenses'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Administrative' AND sub_type = 'Licenses');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Food & Beverages', 'Breakfast Items'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Food & Beverages' AND sub_type = 'Breakfast Items');

INSERT INTO public.expense_types (main_type, sub_type) 
SELECT 'Food & Beverages', 'Welcome Drinks'
WHERE NOT EXISTS (SELECT 1 FROM public.expense_types WHERE main_type = 'Food & Beverages' AND sub_type = 'Welcome Drinks');

-- Insert sample bookings
INSERT INTO public.bookings (id, location_id, source, guest_name, check_in, check_out, total_amount, advance_amount, paid_amount, status) 
SELECT '850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'booking_com', 'John Smith', '2025-01-15 14:00:00+00', '2025-01-17 11:00:00+00', 25000, 0, 25000, 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = '850e8400-e29b-41d4-a716-446655440001');

INSERT INTO public.bookings (id, location_id, source, guest_name, check_in, check_out, total_amount, advance_amount, paid_amount, status) 
SELECT '850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'airbnb', 'Sarah Johnson', '2025-01-20 14:00:00+00', '2025-01-23 11:00:00+00', 30000, 0, 0, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = '850e8400-e29b-41d4-a716-446655440002');

INSERT INTO public.bookings (id, location_id, source, guest_name, check_in, check_out, total_amount, advance_amount, paid_amount, status) 
SELECT '850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'direct', 'Mike Wilson', '2025-01-25 14:00:00+00', '2025-01-28 11:00:00+00', 40000, 15000, 15000, 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = '850e8400-e29b-41d4-a716-446655440003');

INSERT INTO public.bookings (id, location_id, source, guest_name, check_in, check_out, total_amount, advance_amount, paid_amount, status) 
SELECT '850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'booking_com', 'Emma Davis', '2025-02-01 14:00:00+00', '2025-02-05 11:00:00+00', 35000, 0, 0, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = '850e8400-e29b-41d4-a716-446655440004');

-- Insert booking sync URL for Rusty Bunk
INSERT INTO public.booking_sync_urls (location_id, source, ical_url) 
SELECT '550e8400-e29b-41d4-a716-446655440002', 'booking_com', 'https://ical.booking.com/v1/export?t=1d0bea4b-1994-40ec-a9c9-8a718b6cb06a'
WHERE NOT EXISTS (SELECT 1 FROM public.booking_sync_urls WHERE location_id = '550e8400-e29b-41d4-a716-446655440002' AND source = 'booking_com');