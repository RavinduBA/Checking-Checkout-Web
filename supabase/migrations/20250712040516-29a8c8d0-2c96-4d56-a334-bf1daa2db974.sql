-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE booking_source AS ENUM ('airbnb', 'booking_com', 'direct');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'settled');
CREATE TYPE income_type AS ENUM ('booking', 'laundry', 'food', 'other');
CREATE TYPE currency_type AS ENUM ('LKR', 'USD');

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table (using Supabase auth)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  access_dashboard BOOLEAN NOT NULL DEFAULT true,
  access_income BOOLEAN NOT NULL DEFAULT true,
  access_expenses BOOLEAN NOT NULL DEFAULT true,
  access_reports BOOLEAN NOT NULL DEFAULT false,
  access_calendar BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  UNIQUE(user_id, location_id)
);

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  currency currency_type NOT NULL DEFAULT 'LKR',
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  location_access TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
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
CREATE TABLE public.booking_payments (
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
CREATE TABLE public.booking_sync_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  source TEXT NOT NULL,
  ical_url TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT booking_sync_urls_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

-- Create income table
CREATE TABLE public.income (
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
CREATE TABLE public.expense_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(main_type, sub_type)
);

-- Create expenses table
CREATE TABLE public.expenses (
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
CREATE TABLE public.account_transfers (
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
CREATE TABLE public.monthly_rent_payments (
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

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_sync_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rent_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view accounts" ON public.accounts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage accounts" ON public.accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can view bookings" ON public.bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage bookings" ON public.bookings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view booking payments" ON public.booking_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage booking payments" ON public.booking_payments FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sync urls" ON public.booking_sync_urls FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage sync urls" ON public.booking_sync_urls FOR ALL USING (
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

-- Insert default data
INSERT INTO public.locations (name) VALUES 
  ('Asaliya Villa'),
  ('Rusty Bunk'),
  ('Antiqua Serenity');

INSERT INTO public.accounts (name, currency, initial_balance, location_access) VALUES 
  ('Sampath Bank', 'LKR', 0, ARRAY['Asaliya Villa', 'Rusty Bunk', 'Antiqua Serenity']),
  ('Payoneer', 'USD', 0, ARRAY['Asaliya Villa', 'Rusty Bunk', 'Antiqua Serenity']),
  ('Asaliya Cash', 'LKR', 0, ARRAY['Asaliya Villa']),
  ('Wishva Account', 'LKR', 0, ARRAY['Asaliya Villa', 'Rusty Bunk']);

INSERT INTO public.expense_types (main_type, sub_type) VALUES 
  ('Utilities', 'Electricity'),
  ('Utilities', 'Water'),
  ('Utilities', 'Telephone'),
  ('Staff', 'Caretaker'),
  ('Maintenance', 'Repairs'),
  ('Maintenance', 'Cleaning'),
  ('Laundry', 'External Service'),
  ('Commission', 'Booking.com'),
  ('Rent', 'Monthly Rent');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;