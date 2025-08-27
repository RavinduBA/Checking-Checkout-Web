-- Enums (create if not exists)
DO $$ BEGIN
  CREATE TYPE public.currency_type AS ENUM ('LKR','USD','EUR','GBP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','checked_in','checked_out','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_source AS ENUM ('direct','airbnb','booking_com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.income_type AS ENUM ('booking','service','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin','manager','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency public.currency_type NOT NULL DEFAULT 'LKR',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  location_access TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
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

-- Booking payments
CREATE TABLE IF NOT EXISTS public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  is_advance BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking sync URLs
CREATE TABLE IF NOT EXISTS public.booking_sync_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  source TEXT NOT NULL,
  ical_url TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expense types
CREATE TABLE IF NOT EXISTS public.expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  main_type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Income
CREATE TABLE IF NOT EXISTS public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  type public.income_type NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL,
  is_advance BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  booking_source TEXT CHECK ((booking_source = ANY (ARRAY['direct'::text, 'airbnb'::text, 'booking_com'::text])) OR booking_source IS NULL),
  check_in_date DATE,
  check_out_date DATE
);

-- Monthly rent payments
CREATE TABLE IF NOT EXISTS public.monthly_rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles: align with auth.users id
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  access_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
  access_income BOOLEAN NOT NULL DEFAULT TRUE,
  access_expenses BOOLEAN NOT NULL DEFAULT TRUE,
  access_reports BOOLEAN NOT NULL DEFAULT FALSE,
  access_calendar BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enablement
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_sync_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Basic policies (permissive for authenticated users to get you started)
CREATE POLICY "Authenticated can read locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write locations" ON public.locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read accounts" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write accounts" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write bookings" ON public.bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read booking_payments" ON public.booking_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write booking_payments" ON public.booking_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read booking_sync_urls" ON public.booking_sync_urls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write booking_sync_urls" ON public.booking_sync_urls FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read expense_types" ON public.expense_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write expense_types" ON public.expense_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read income" ON public.income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write income" ON public.income FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read monthly_rent_payments" ON public.monthly_rent_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write monthly_rent_payments" ON public.monthly_rent_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User permissions policies
CREATE POLICY "Authenticated can read own permissions" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own permissions" ON public.user_permissions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();