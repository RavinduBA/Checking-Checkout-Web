-- Add missing booking_source column to reservations table first
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'direct';

-- First, let's check which rooms/locations we need to keep or move data to
-- Update any reservations that reference rooms we want to delete to use BYLAKE KANDY rooms instead
-- We'll need to create or identify a room in BYLAKE KANDY first

-- Get the BYLAKE KANDY location ID
-- If there are reservations using the rooms we want to delete, we need to handle them
-- For now, let's just add the column and handle the cleanup after