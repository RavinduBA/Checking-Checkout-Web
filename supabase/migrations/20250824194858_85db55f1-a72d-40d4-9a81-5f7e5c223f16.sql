-- Add booking source and date range fields to income table
ALTER TABLE public.income 
ADD COLUMN booking_source TEXT,
ADD COLUMN check_in_date DATE,
ADD COLUMN check_out_date DATE;

-- Create booking source type constraint
ALTER TABLE public.income 
ADD CONSTRAINT booking_source_check 
CHECK (booking_source IN ('direct', 'airbnb', 'booking_com') OR booking_source IS NULL);