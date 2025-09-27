-- ================================================
-- Missing Tables Migration - Agents and Guides
-- ================================================
-- This migration adds the missing agents and guides tables
-- that are referenced in ReservationForm.tsx but missing from the main setup
-- ================================================

-- ================================================
-- GUIDES TABLE
-- ================================================

-- Create guides table for tour guide management
CREATE TABLE IF NOT EXISTS public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 10.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- AGENTS TABLE
-- ================================================

-- Create agents table for travel agent management
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  agency_name TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 15.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- UPDATE RESERVATIONS TABLE
-- ================================================

-- Add guide and agent fields to reservations table if they don't exist
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES public.guides(id),
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id),
ADD COLUMN IF NOT EXISTS guide_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_source TEXT CHECK (booking_source IN ('direct', 'airbnb', 'booking_com') OR booking_source IS NULL);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on new tables
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policies for guides
CREATE POLICY "Authenticated can read guides" 
ON public.guides 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated can write guides" 
ON public.guides 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create policies for agents
CREATE POLICY "Authenticated can read agents" 
ON public.agents 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated can write agents" 
ON public.agents 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guides_name ON public.guides(name);
CREATE INDEX IF NOT EXISTS idx_guides_is_active ON public.guides(is_active);
CREATE INDEX IF NOT EXISTS idx_guides_email ON public.guides(email);

CREATE INDEX IF NOT EXISTS idx_agents_name ON public.agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON public.agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_agency_name ON public.agents(agency_name);
CREATE INDEX IF NOT EXISTS idx_agents_email ON public.agents(email);

CREATE INDEX IF NOT EXISTS idx_reservations_guide_id ON public.reservations(guide_id);
CREATE INDEX IF NOT EXISTS idx_reservations_agent_id ON public.reservations(agent_id);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_source ON public.reservations(booking_source);

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_guides_updated_at
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- SAMPLE DATA
-- ================================================

-- Insert sample guides
INSERT INTO public.guides (name, phone, email, commission_rate, is_active) VALUES 
  ('Sampath Fernando', '+94771234567', 'sampath@guides.lk', 10.0, true),
  ('Nimal Perera', '+94772345678', 'nimal@guides.lk', 12.0, true),
  ('Kumara Silva', '+94773456789', 'kumara@guides.lk', 8.0, true),
  ('Tharaka Wijesinghe', '+94774567890', 'tharaka@guides.lk', 15.0, true)
ON CONFLICT DO NOTHING;

-- Insert sample agents
INSERT INTO public.agents (name, phone, email, agency_name, commission_rate, is_active) VALUES 
  ('Pradeep Tours', '+94112345678', 'info@pradeeptours.lk', 'Pradeep Tours & Travels', 15.0, true),
  ('Lanka Leisure', '+94112345679', 'booking@lankaleisure.com', 'Lanka Leisure Travels', 12.0, true),
  ('Serendib Travels', '+94112345680', 'reservations@serendibtravels.lk', 'Serendib Travels (Pvt) Ltd', 18.0, true),
  ('Ceylon Tours', '+94112345681', 'info@ceylontours.lk', 'Ceylon Tours & Safaris', 20.0, true),
  ('Island Holidays', '+94112345682', 'bookings@islandholidays.lk', 'Island Holidays Sri Lanka', 14.0, true)
ON CONFLICT DO NOTHING;

-- ================================================
-- ADDITIONAL MISSING TABLES CHECK
-- ================================================

-- Let's also check if guest_id_number field is missing from reservations
-- (Referenced in the form but might be missing)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS guest_id_number TEXT;

-- Add arrival_time if missing
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS arrival_time TIME;

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Agents and Guides migration completed successfully!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '- guides (% records)', (SELECT count(*) FROM public.guides);
  RAISE NOTICE '- agents (% records)', (SELECT count(*) FROM public.agents);
  RAISE NOTICE '';
  RAISE NOTICE 'Updated reservations table with:';
  RAISE NOTICE '- guide_id, agent_id columns';
  RAISE NOTICE '- guide_commission, agent_commission columns';
  RAISE NOTICE '- booking_source column';
  RAISE NOTICE '- guest_id_number, arrival_time columns';
  RAISE NOTICE '=================================================';
END $$;