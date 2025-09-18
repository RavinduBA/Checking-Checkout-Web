-- Add missing booking_source column to reservations table
ALTER TABLE public.reservations 
ADD COLUMN booking_source TEXT DEFAULT 'direct';

-- Delete specific rooms that user doesn't want
DELETE FROM public.rooms WHERE room_number IN ('Rusty Villa', 'Asaliya Villa', '101');

-- Delete locations except BYLAKE KANDY (keep the location but delete others)
DELETE FROM public.locations WHERE name != 'BYLAKE KANDY';