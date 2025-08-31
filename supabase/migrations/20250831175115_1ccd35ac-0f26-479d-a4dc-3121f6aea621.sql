-- Create table for storing external bookings from Beds24
CREATE TABLE public.external_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  source TEXT NOT NULL, -- 'airbnb' or 'booking_com'
  guest_name TEXT NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  total_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  location_id UUID,
  room_name TEXT,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB -- Store the full API response for reference
);

-- Enable Row Level Security
ALTER TABLE public.external_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for external_bookings
CREATE POLICY "Authenticated can read external_bookings" 
ON public.external_bookings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can write external_bookings" 
ON public.external_bookings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_external_bookings_updated_at
BEFORE UPDATE ON public.external_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint to prevent duplicate bookings
CREATE UNIQUE INDEX idx_external_bookings_unique 
ON public.external_bookings(external_id, property_id, source);