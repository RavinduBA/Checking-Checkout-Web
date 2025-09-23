-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT FOR HOSPITALITY ERP
-- ============================================================================
-- Run this script in your Supabase SQL Editor to set up the complete database

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE booking_source AS ENUM ('airbnb', 'booking_com', 'direct');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'settled');
CREATE TYPE income_type AS ENUM ('booking', 'laundry', 'food', 'other');
CREATE TYPE currency_type AS ENUM ('LKR', 'USD', 'EUR', 'GBP');
DO $$ BEGIN
  CREATE TYPE public.reservation_status AS ENUM ('tentative','confirmed','checked_in','checked_out','cancelled','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table (using Supabase auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create allowed_emails table for email restriction
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  access_dashboard BOOLEAN NOT NULL DEFAULT true,
  access_income BOOLEAN NOT NULL DEFAULT true,
  access_expenses BOOLEAN NOT NULL DEFAULT true,
  access_reports BOOLEAN NOT NULL DEFAULT false,
  access_calendar BOOLEAN NOT NULL DEFAULT true,
  access_bookings BOOLEAN NOT NULL DEFAULT true,
  access_rooms BOOLEAN NOT NULL DEFAULT false,
  access_master_files BOOLEAN NOT NULL DEFAULT false,
  access_accounts BOOLEAN NOT NULL DEFAULT false,
  access_users BOOLEAN NOT NULL DEFAULT false,
  access_settings BOOLEAN NOT NULL DEFAULT false,
  access_booking_channels BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  UNIQUE(user_id, location_id)
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  currency currency_type NOT NULL DEFAULT 'LKR',
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  location_access TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
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
  property_type TEXT NOT NULL DEFAULT 'Room' CHECK (property_type IN ('Room', 'Villa')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, room_number)
);

-- Create room pricing table
CREATE TABLE IF NOT EXISTS public.room_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, date)
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number TEXT NOT NULL UNIQUE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  room_id UUID NULL REFERENCES public.rooms(id),
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
  booking_source TEXT DEFAULT 'direct',
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

-- Create bookings table (legacy)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  room_id UUID REFERENCES public.rooms(id),
  source booking_source NOT NULL,
  guest_name TEXT NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  advance_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

-- Create booking_payments table
CREATE TABLE IF NOT EXISTS public.booking_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL,
  is_advance BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT booking_payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT
);

-- Create booking_sync_urls table
CREATE TABLE IF NOT EXISTS public.booking_sync_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  source TEXT NOT NULL,
  ical_url TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT booking_sync_urls_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

-- Create channel property mappings table
CREATE TABLE IF NOT EXISTS public.channel_property_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  channel_property_id TEXT NOT NULL,
  channel_property_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_id, channel_property_id)
);

-- Create income table
CREATE TABLE IF NOT EXISTS public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  type income_type NOT NULL,
  booking_id UUID,
  amount DECIMAL(15,2) NOT NULL,
  is_advance BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT income_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  CONSTRAINT income_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL,
  CONSTRAINT income_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT
);

-- Create expense_types table
CREATE TABLE IF NOT EXISTS public.expense_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(main_type, sub_type)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  account_id UUID NOT NULL,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT expenses_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  CONSTRAINT expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT
);

-- Create account_transfers table
CREATE TABLE IF NOT EXISTS public.account_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_account_id UUID NOT NULL,
  to_account_id UUID NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  conversion_rate DECIMAL(10,4) NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT account_transfers_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT,
  CONSTRAINT account_transfers_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT
);

-- Create monthly_rent_payments table
CREATE TABLE IF NOT EXISTS public.monthly_rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  account_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT monthly_rent_payments_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  CONSTRAINT monthly_rent_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT,
  UNIQUE(location_id, month, year)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_sync_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rent_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage allowed emails" ON public.allowed_emails FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view accounts" ON public.accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage accounts" ON public.accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated can read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write rooms" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read room_pricing" ON public.room_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write room_pricing" ON public.room_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read reservations" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write reservations" ON public.reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read services" ON public.additional_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write services" ON public.additional_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view bookings" ON public.bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage bookings" ON public.bookings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view booking payments" ON public.booking_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage booking payments" ON public.booking_payments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sync urls" ON public.booking_sync_urls FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage sync urls" ON public.booking_sync_urls FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can view channel mappings" ON public.channel_property_mappings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage channel mappings" ON public.channel_property_mappings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can view income" ON public.income FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage income" ON public.income FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage expenses" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view expense types" ON public.expense_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage expense types" ON public.expense_types FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can view transfers" ON public.account_transfers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage transfers" ON public.account_transfers FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view rent payments" ON public.monthly_rent_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage rent payments" ON public.monthly_rent_payments FOR ALL USING (auth.role() = 'authenticated');

-- Add triggers for updated_at
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper functions
CREATE OR REPLACE FUNCTION public.is_email_allowed(email_address text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails 
    WHERE lower(email) = lower(email_address) AND is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id_param uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    json_object_agg(
      l.name,
      json_build_object(
        'dashboard', up.access_dashboard,
        'income', up.access_income,
        'expenses', up.access_expenses,
        'reports', up.access_reports,
        'calendar', up.access_calendar,
        'bookings', up.access_bookings,
        'rooms', up.access_rooms,
        'master_files', up.access_master_files,
        'accounts', up.access_accounts,
        'users', up.access_users,
        'settings', up.access_settings,
        'booking_channels', up.access_booking_channels
      )
    ) FILTER (WHERE l.id IS NOT NULL),
    '{}'::json
  )
  FROM public.user_permissions up
  LEFT JOIN public.locations l ON up.location_id = l.id
  WHERE up.user_id = user_id_param;
$$;

-- Create function to generate reservation numbers
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current year
  SELECT EXTRACT(YEAR FROM CURRENT_DATE) INTO counter;
  
  -- Generate a unique reservation number with format YYYY-NNNN
  SELECT LPAD((COUNT(*) + 1)::TEXT, 4, '0') INTO new_number
  FROM public.reservations 
  WHERE EXTRACT(YEAR FROM created_at) = counter;
  
  RETURN counter || '-' || new_number;
END;
$$ LANGUAGE plpgsql;

-- Insert default data
INSERT INTO public.locations (name) VALUES 
  ('Asaliya Villa'),
  ('Rusty Bunk'),
  ('Antiqua Serenity')
ON CONFLICT DO NOTHING;

INSERT INTO public.accounts (name, currency, initial_balance, location_access) VALUES 
  ('Sampath Bank', 'LKR', 0, ARRAY['Asaliya Villa', 'Rusty Bunk', 'Antiqua Serenity']),
  ('Payoneer', 'USD', 0, ARRAY['Asaliya Villa', 'Rusty Bunk', 'Antiqua Serenity']),
  ('Asaliya Cash', 'LKR', 0, ARRAY['Asaliya Villa']),
  ('Wishva Account', 'LKR', 0, ARRAY['Asaliya Villa', 'Rusty Bunk'])
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_types (main_type, sub_type) VALUES 
  ('Utilities', 'Electricity'),
  ('Utilities', 'Water'),
  ('Utilities', 'Telephone'),
  ('Utilities', 'Internet'),
  ('Staff', 'Caretaker'),
  ('Maintenance', 'Repairs'),
  ('Maintenance', 'Cleaning'),
  ('Laundry', 'External Service'),
  ('Commission', 'Booking.com'),
  ('Commission', 'Airbnb'),
  ('Rent', 'Monthly Rent'),
  ('Administrative', 'Insurance'),
  ('Administrative', 'Licenses'),
  ('Food & Beverages', 'Breakfast Items'),
  ('Food & Beverages', 'Welcome Drinks')
ON CONFLICT (main_type, sub_type) DO NOTHING;

-- Insert demo account email
INSERT INTO public.allowed_emails (email, is_active) VALUES 
  ('demo@checkingcheckout.com', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- DATABASE SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Create the demo user account manually in Supabase Auth
-- 2. Run the post-setup script to configure the demo user profile
-- ============================================================================