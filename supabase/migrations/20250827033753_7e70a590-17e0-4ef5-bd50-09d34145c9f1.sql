-- Create reservation status enum
DO $$ BEGIN
  CREATE TYPE public.reservation_status AS ENUM ('tentative','confirmed','checked_in','checked_out','cancelled','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create reservations table for hotel management
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number TEXT NOT NULL UNIQUE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_address TEXT,
  guest_id_number TEXT,
  guest_nationality TEXT,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL,
  room_rate NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  advance_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC DEFAULT 0,
  status public.reservation_status NOT NULL DEFAULT 'tentative',
  special_requests TEXT,
  arrival_time TIME,
  created_by UUID REFERENCES auth.users(id),
  grc_approved BOOLEAN DEFAULT false,
  grc_approved_by UUID REFERENCES auth.users(id),
  grc_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  payment_type TEXT NOT NULL, -- 'advance', 'full', 'balance', 'extra'
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create additional services table  
CREATE TABLE IF NOT EXISTS public.additional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id),
  service_type TEXT NOT NULL, -- 'laundry', 'room_service', 'spa', 'transport', 'other'
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated can read reservations" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write reservations" ON public.reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read services" ON public.additional_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write services" ON public.additional_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate reservation numbers
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current year
  SELECT EXTRACT(YEAR FROM CURRENT_DATE) INTO counter;
  
  -- Generate a unique reservation number
  SELECT 'RES' || counter || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  FROM public.reservations 
  WHERE EXTRACT(YEAR FROM created_at) = counter
  INTO new_number;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate payment numbers
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current year
  SELECT EXTRACT(YEAR FROM CURRENT_DATE) INTO counter;
  
  -- Generate a unique payment number
  SELECT 'PAY' || counter || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  FROM public.payments 
  WHERE EXTRACT(YEAR FROM created_at) = counter
  INTO new_number;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;