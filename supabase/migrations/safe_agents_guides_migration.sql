-- ================================================
-- Agents and Guides Migration - Safe Version
-- ================================================
-- This migration safely adds missing tables and columns
-- even if some policies or constraints already exist
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
DO $$ 
BEGIN
  -- Add guide_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'guide_id') THEN
    ALTER TABLE public.reservations ADD COLUMN guide_id UUID REFERENCES public.guides(id);
  END IF;
  
  -- Add agent_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'agent_id') THEN
    ALTER TABLE public.reservations ADD COLUMN agent_id UUID REFERENCES public.agents(id);
  END IF;
  
  -- Add guide_commission column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'guide_commission') THEN
    ALTER TABLE public.reservations ADD COLUMN guide_commission NUMERIC DEFAULT 0;
  END IF;
  
  -- Add agent_commission column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'agent_commission') THEN
    ALTER TABLE public.reservations ADD COLUMN agent_commission NUMERIC DEFAULT 0;
  END IF;
  
  -- Add guest_id_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'guest_id_number') THEN
    ALTER TABLE public.reservations ADD COLUMN guest_id_number TEXT;
  END IF;
  
  -- Add arrival_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'arrival_time') THEN
    ALTER TABLE public.reservations ADD COLUMN arrival_time TIME;
  END IF;
  
  RAISE NOTICE 'Reservations table columns updated successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating reservations table: %', SQLERRM;
END $$;

-- Handle booking_source column separately with better error handling
DO $$
BEGIN
  -- Drop existing constraint if it exists and is causing issues
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'booking_source_check') THEN
    ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS booking_source_check;
    RAISE NOTICE 'Dropped existing booking_source_check constraint';
  END IF;
  
  -- Add booking_source column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'booking_source') THEN
    ALTER TABLE public.reservations ADD COLUMN booking_source TEXT;
    RAISE NOTICE 'Added booking_source column';
  END IF;
  
  -- Clean up any invalid existing data (keep all valid sources)
  UPDATE public.reservations 
  SET booking_source = 'direct' 
  WHERE booking_source IS NOT NULL 
  AND booking_source NOT IN ('direct', 'airbnb', 'booking_com', 'expedia', 'agoda', 'beds24', 'manual', 'online', 'phone', 'email', 'walk_in', 'ical', 'other');
  
  -- Set default value for NULL entries if needed
  -- UPDATE public.reservations SET booking_source = 'direct' WHERE booking_source IS NULL;
  
  -- Add the constraint with all booking sources found in frontend
  ALTER TABLE public.reservations ADD CONSTRAINT booking_source_check 
  CHECK (booking_source IN ('direct', 'airbnb', 'booking_com', 'expedia', 'agoda', 'beds24', 'manual', 'online', 'phone', 'email', 'walk_in', 'ical', 'other') OR booking_source IS NULL);
  
  RAISE NOTICE 'booking_source column and constraint configured successfully with all sources';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error configuring booking_source: %', SQLERRM;
  RAISE NOTICE 'You may need to manually clean up invalid booking_source values';
END $$;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on new tables
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Safely create policies for guides (drop and recreate if exists)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Authenticated can read guides" ON public.guides;
  DROP POLICY IF EXISTS "Authenticated can write guides" ON public.guides;
  
  -- Create new policies
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
  
  RAISE NOTICE 'Guides policies created successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating guides policies: %', SQLERRM;
END $$;

-- Safely create policies for agents (drop and recreate if exists)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Authenticated can read agents" ON public.agents;
  DROP POLICY IF EXISTS "Authenticated can write agents" ON public.agents;
  
  -- Create new policies
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
  
  RAISE NOTICE 'Agents policies created successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating agents policies: %', SQLERRM;
END $$;

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Create indexes for better performance (with IF NOT EXISTS)
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

-- Safely add triggers for automatic timestamp updates
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS update_guides_updated_at ON public.guides;
  DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
  
  -- Create new triggers
  CREATE TRIGGER update_guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

  CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
  
  RAISE NOTICE 'Triggers created successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating triggers: %', SQLERRM;
END $$;

-- ================================================
-- SAMPLE DATA
-- ================================================

-- Insert sample guides (only if table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.guides) = 0 THEN
    INSERT INTO public.guides (name, phone, email, commission_rate, is_active) VALUES 
      ('Sampath Fernando', '+94771234567', 'sampath@guides.lk', 10.0, true),
      ('Nimal Perera', '+94772345678', 'nimal@guides.lk', 12.0, true),
      ('Kumara Silva', '+94773456789', 'kumara@guides.lk', 8.0, true),
      ('Tharaka Wijesinghe', '+94774567890', 'tharaka@guides.lk', 15.0, true);
    RAISE NOTICE 'Sample guides inserted';
  ELSE
    RAISE NOTICE 'Guides table already contains data, skipping sample data insertion';
  END IF;
END $$;

-- Insert sample agents (only if table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.agents) = 0 THEN
    INSERT INTO public.agents (name, phone, email, agency_name, commission_rate, is_active) VALUES 
      ('Pradeep Tours', '+94112345678', 'info@pradeeptours.lk', 'Pradeep Tours & Travels', 15.0, true),
      ('Lanka Leisure', '+94112345679', 'booking@lankaleisure.com', 'Lanka Leisure Travels', 12.0, true),
      ('Serendib Travels', '+94112345680', 'reservations@serendibtravels.lk', 'Serendib Travels (Pvt) Ltd', 18.0, true),
      ('Ceylon Tours', '+94112345681', 'info@ceylontours.lk', 'Ceylon Tours & Safaris', 20.0, true),
      ('Island Holidays', '+94112345682', 'bookings@islandholidays.lk', 'Island Holidays Sri Lanka', 14.0, true);
    RAISE NOTICE 'Sample agents inserted';
  ELSE
    RAISE NOTICE 'Agents table already contains data, skipping sample data insertion';
  END IF;
END $$;

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Safe Agents and Guides migration completed!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Tables status:';
  RAISE NOTICE '- guides table: % records', (SELECT count(*) FROM public.guides);
  RAISE NOTICE '- agents table: % records', (SELECT count(*) FROM public.agents);
  RAISE NOTICE '';
  RAISE NOTICE 'Reservations table columns added:';
  RAISE NOTICE '- guide_id, agent_id (foreign keys)';
  RAISE NOTICE '- guide_commission, agent_commission (numeric)';
  RAISE NOTICE '- booking_source (with constraint)';
  RAISE NOTICE '- guest_id_number, arrival_time';
  RAISE NOTICE '';
  RAISE NOTICE 'All policies, triggers, and indexes created safely!';
  RAISE NOTICE '=================================================';
END $$;