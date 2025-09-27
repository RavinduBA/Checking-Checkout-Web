-- ================================================
-- Hospitality ERP System - Complete Database Setup
-- ================================================
-- This file contains all database schema, policies, functions, and initial data
-- for setting up a new Supabase project for the hospitality ERP system.
-- 
-- Features included:
-- - Multi-location hotel management
-- - Room and reservation system
-- - Income and expense tracking
-- - User permissions and role-based access
-- - External booking integration (Beds24, Airbnb, Booking.com)
-- - Currency management
-- - SMS notifications
-- - Email restrictions
-- ================================================

-- ================================================
-- EXTENSIONS
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================
-- ENUMS
-- ================================================

-- Create enums for various types
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE public.booking_source AS ENUM ('direct', 'airbnb', 'booking_com', 'expedia', 'agoda', 'beds24', 'manual', 'online', 'phone', 'email', 'walk_in', 'ical');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE public.reservation_status AS ENUM ('tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'pending');
CREATE TYPE public.income_type AS ENUM ('booking', 'service', 'other');
CREATE TYPE public.currency_type AS ENUM ('LKR', 'USD', 'EUR', 'GBP');

-- ================================================
-- CORE TABLES
-- ================================================

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  location_access TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (linked to Supabase auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  access_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
  access_income BOOLEAN NOT NULL DEFAULT TRUE,
  access_expenses BOOLEAN NOT NULL DEFAULT TRUE,
  access_reports BOOLEAN NOT NULL DEFAULT FALSE,
  access_calendar BOOLEAN NOT NULL DEFAULT TRUE,
  access_bookings BOOLEAN NOT NULL DEFAULT TRUE,
  access_rooms BOOLEAN NOT NULL DEFAULT FALSE,
  access_master_files BOOLEAN NOT NULL DEFAULT FALSE,
  access_accounts BOOLEAN NOT NULL DEFAULT FALSE,
  access_users BOOLEAN NOT NULL DEFAULT FALSE,
  access_settings BOOLEAN NOT NULL DEFAULT FALSE,
  access_beds24 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Allowed emails table for access control
CREATE TABLE public.allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- MASTER FILES TABLES
-- ================================================

-- Guides table for tour guide management
CREATE TABLE public.guides (
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

-- Agents table for travel agent management
CREATE TABLE public.agents (
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
-- ROOM MANAGEMENT TABLES
-- ================================================

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  bed_type TEXT NOT NULL,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  base_price NUMERIC NOT NULL DEFAULT 0,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  description TEXT,
  amenities TEXT[],
  property_type TEXT NOT NULL DEFAULT 'Room' CHECK (property_type IN ('Room', 'Villa')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, room_number)
);

-- Room pricing table for dynamic pricing
CREATE TABLE public.room_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, date)
);

-- ================================================
-- RESERVATION SYSTEM TABLES
-- ================================================

-- Reservations table
CREATE TABLE public.reservations (
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
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  status public.reservation_status NOT NULL DEFAULT 'tentative',
  special_requests TEXT,
  arrival_time TIME,
  guide_id UUID REFERENCES public.guides(id),
  agent_id UUID REFERENCES public.agents(id),
  guide_commission NUMERIC DEFAULT 0,
  agent_commission NUMERIC DEFAULT 0,
  booking_source TEXT CHECK (booking_source IN ('direct', 'airbnb', 'booking_com', 'expedia', 'agoda', 'beds24', 'manual', 'online', 'phone', 'email', 'walk_in', 'ical') OR booking_source IS NULL),
  created_by UUID REFERENCES auth.users(id),
  grc_approved BOOLEAN DEFAULT false,
  grc_approved_by UUID REFERENCES auth.users(id),
  grc_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id),
  amount NUMERIC NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  payment_type TEXT NOT NULL, -- 'advance', 'full', 'balance', 'extra'
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additional services table
CREATE TABLE public.additional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id),
  service_type TEXT NOT NULL, -- 'laundry', 'room_service', 'spa', 'transport', 'other'
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- LEGACY BOOKING SYSTEM TABLES
-- ================================================

-- Bookings table (legacy system)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  room_id UUID REFERENCES public.rooms(id),
  source public.booking_source NOT NULL,
  guest_name TEXT NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  total_amount NUMERIC NOT NULL,
  advance_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking payments table (legacy system)
CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  is_advance BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- EXTERNAL BOOKING INTEGRATION TABLES
-- ================================================

-- Booking sync URLs table
CREATE TABLE public.booking_sync_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  source TEXT NOT NULL,
  ical_url TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- External bookings table (from Beds24, Airbnb, etc.)
CREATE TABLE public.external_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  source TEXT NOT NULL, -- 'airbnb' or 'booking_com'
  guest_name TEXT NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  total_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  location_id UUID REFERENCES public.locations(id),
  room_name TEXT,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB -- Store the full API response for reference
);

-- Beds24 property mappings table
CREATE TABLE public.beds24_property_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  room_id UUID REFERENCES public.rooms(id),
  beds24_property_id TEXT NOT NULL,
  beds24_property_name TEXT NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('villa', 'room')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- FINANCIAL MANAGEMENT TABLES
-- ================================================

-- Expense types table
CREATE TABLE public.expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(main_type, sub_type)
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Income table
CREATE TABLE public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  type public.income_type NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  is_advance BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  booking_source TEXT CHECK (booking_source IN ('direct', 'airbnb', 'booking_com', 'expedia', 'agoda', 'beds24', 'manual', 'online', 'phone', 'email', 'walk_in', 'ical') OR booking_source IS NULL),
  check_in_date DATE,
  check_out_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account transfers table
CREATE TABLE public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NOT NULL REFERENCES public.accounts(id),
  to_account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC NOT NULL,
  conversion_rate NUMERIC NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly rent payments table
CREATE TABLE public.monthly_rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, month, year)
);

-- Currency rates table
CREATE TABLE public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency public.currency_type NOT NULL,
  to_currency public.currency_type NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- External bookings indexes
CREATE INDEX idx_external_bookings_location_id ON public.external_bookings(location_id);
CREATE INDEX idx_external_bookings_source ON public.external_bookings(source);
CREATE INDEX idx_external_bookings_check_in ON public.external_bookings(check_in);
CREATE INDEX idx_external_bookings_external_id ON public.external_bookings(external_id);
CREATE UNIQUE INDEX idx_external_bookings_unique ON public.external_bookings(external_id, property_id, source);

-- Beds24 property mappings indexes
CREATE INDEX idx_beds24_property_mappings_location_id ON public.beds24_property_mappings(location_id);
CREATE INDEX idx_beds24_property_mappings_room_id ON public.beds24_property_mappings(room_id);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_sync_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds24_property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles 
FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- User permissions policies
CREATE POLICY "Authenticated can read own permissions" ON public.user_permissions 
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own permissions" ON public.user_permissions 
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Allowed emails policies
CREATE POLICY "Admins can manage allowed emails" ON public.allowed_emails 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- General policies for authenticated users (simplified for initial setup)
CREATE POLICY "Authenticated can read locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write locations" ON public.locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read accounts" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write accounts" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read guides" ON public.guides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write guides" ON public.guides FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read agents" ON public.agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write agents" ON public.agents FOR ALL TO authenticated USING (true) WITH CHECK (true);

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

CREATE POLICY "Authenticated can read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write bookings" ON public.bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read booking_payments" ON public.booking_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write booking_payments" ON public.booking_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read booking_sync_urls" ON public.booking_sync_urls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write booking_sync_urls" ON public.booking_sync_urls FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read external_bookings" ON public.external_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write external_bookings" ON public.external_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read beds24_property_mappings" ON public.beds24_property_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write beds24_property_mappings" ON public.beds24_property_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read income" ON public.income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write income" ON public.income FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read expense_types" ON public.expense_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write expense_types" ON public.expense_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read transfers" ON public.account_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write transfers" ON public.account_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read rent_payments" ON public.monthly_rent_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write rent_payments" ON public.monthly_rent_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read currency_rates" ON public.currency_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write currency_rates" ON public.currency_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate reservation numbers
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

-- Function to generate payment numbers
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

-- Function to check if email is allowed
CREATE OR REPLACE FUNCTION public.is_email_allowed(email_address text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails 
    WHERE email = email_address AND is_active = true
  );
$$;

-- Function to get user permissions
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
        'beds24', up.access_beds24
      )
    ) FILTER (WHERE l.id IS NOT NULL),
    '{}'::json
  )
  FROM public.user_permissions up
  LEFT JOIN public.locations l ON up.location_id = l.id
  WHERE up.user_id = user_id_param;
$$;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Triggers for updated_at columns
CREATE TRIGGER update_guides_updated_at
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_bookings_updated_at
BEFORE UPDATE ON public.external_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beds24_property_mappings_updated_at
BEFORE UPDATE ON public.beds24_property_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_currency_rates_updated_at
BEFORE UPDATE ON public.currency_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- INITIAL DATA
-- ================================================

-- Insert default locations
INSERT INTO public.locations (name) VALUES 
  ('Asaliya Villa'),
  ('Rusty Bunk'),
  ('Antiqua Serenity')
ON CONFLICT DO NOTHING;

-- Insert default accounts
INSERT INTO public.accounts (name, currency, initial_balance, location_access) VALUES 
  ('Sampath Bank', 'LKR', 0, ARRAY['Asaliya Villa', 'Rusty Bunk', 'Antiqua Serenity']),
  ('Payoneer', 'USD', 0, ARRAY['Asaliya Villa', 'Rusty Bunk', 'Antiqua Serenity']),
  ('Asaliya Cash', 'LKR', 0, ARRAY['Asaliya Villa']),
  ('Wishva Account', 'LKR', 0, ARRAY['Asaliya Villa', 'Rusty Bunk'])
ON CONFLICT DO NOTHING;

-- Insert default expense types
INSERT INTO public.expense_types (main_type, sub_type) VALUES 
  ('Utilities', 'Electricity'),
  ('Utilities', 'Water'),
  ('Utilities', 'Internet'),
  ('Utilities', 'Telephone'),
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

-- Insert default currency rates
INSERT INTO public.currency_rates (from_currency, to_currency, rate) VALUES 
  ('USD', 'LKR', 300.00),
  ('EUR', 'LKR', 320.00),
  ('GBP', 'LKR', 380.00)
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- Insert default allowed emails
INSERT INTO public.allowed_emails (email) VALUES 
  ('admin@hotelina.com'),
  ('manager@hotelina.com'),
  ('staff@hotelina.com')
ON CONFLICT (email) DO NOTHING;

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
-- SCHEDULED TASKS (CRON JOBS)
-- ================================================

-- Schedule daily calendar sync at 6 AM UTC
-- NOTE: Replace the URL and Bearer token with your actual Supabase project details
-- SELECT cron.schedule(
--   'daily-calendar-sync',
--   '0 6 * * *', -- Every day at 6 AM UTC
--   $$
--   SELECT
--     net.http_post(
--         url:='https://YOUR-PROJECT-REF.supabase.co/functions/v1/scheduled-calendar-sync',
--         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR-ANON-KEY"}'::jsonb,
--         body:=concat('{"time": "', now(), '"}')::jsonb
--     ) as request_id;
--   $$
-- );

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Created tables: % total', (
    SELECT count(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE 'Created policies: % total', (
    SELECT count(*) FROM pg_policies 
    WHERE schemaname = 'public'
  );
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update the scheduled task URLs with your project details';
  RAISE NOTICE '2. Configure your Edge Functions';
  RAISE NOTICE '3. Add your allowed email addresses';
  RAISE NOTICE '4. Create your first admin user';
  RAISE NOTICE '=================================================';
END $$;
