-- Create rooms table for hotel management
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  bed_type TEXT NOT NULL,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  base_price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  amenities TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, room_number)
);

-- Create room pricing table for dynamic pricing
CREATE TABLE IF NOT EXISTS public.room_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, date)
);

-- Update bookings table to include room_id
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Authenticated can read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write rooms" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for room pricing
CREATE POLICY "Authenticated can read room_pricing" ON public.room_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write room_pricing" ON public.room_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add trigger for room updates
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample room types for reference
INSERT INTO public.locations (name) VALUES 
('Hotel Paradise Main Building'),
('Hotel Paradise Annex')
ON CONFLICT DO NOTHING;