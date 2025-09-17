-- Create beds24_property_mappings table for managing property mappings
CREATE TABLE public.beds24_property_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  room_id UUID NULL REFERENCES public.rooms(id),
  beds24_property_id TEXT NOT NULL,
  beds24_property_name TEXT NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('villa', 'room')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beds24_property_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated can read beds24_property_mappings" 
ON public.beds24_property_mappings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can write beds24_property_mappings" 
ON public.beds24_property_mappings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX idx_beds24_property_mappings_location_id ON public.beds24_property_mappings(location_id);
CREATE INDEX idx_beds24_property_mappings_room_id ON public.beds24_property_mappings(room_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beds24_property_mappings_updated_at
BEFORE UPDATE ON public.beds24_property_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add property_type column to rooms table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'property_type') THEN
    ALTER TABLE public.rooms ADD COLUMN property_type TEXT NOT NULL DEFAULT 'Room' CHECK (property_type IN ('Room', 'Villa'));
  END IF;
END $$;