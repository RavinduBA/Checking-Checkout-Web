-- =====================================================
-- SaaS Conversion Migration for Hospitality ERP
-- =====================================================
-- This migration adds multi-tenant SaaS functionality including:
-- 1. Tenants (hotel organizations)
-- 2. Subscription plans and billing
-- 3. Multi-tenant isolation
-- 4. Enhanced permissions system
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE TENANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- URL-friendly identifier
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  hotel_name text,
  hotel_address text,
  hotel_phone text,
  hotel_email text,
  hotel_website text,
  hotel_timezone text DEFAULT 'UTC',
  logo_url text,
  onboarding_completed boolean DEFAULT false,
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. CREATE SUBSCRIPTION PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  max_locations integer,
  max_rooms integer,
  features jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. CREATE SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id text REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'unpaid')),
  creem_customer_id text,
  creem_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. CREATE INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date timestamptz,
  paid_at timestamptz,
  creem_invoice_id text,
  invoice_number text UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. CREATE TENANT LIMITS OVERRIDE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenant_limits (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  max_locations integer,
  max_rooms integer,
  custom_features jsonb DEFAULT '{}',
  notes text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. CREATE USER INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. ADD TENANT_ID TO EXISTING TABLES
-- =====================================================
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- =====================================================
-- 8. UPDATE USER_PERMISSIONS FOR MULTI-TENANT ROLES
-- =====================================================
-- Add new role system
CREATE TYPE IF NOT EXISTS public.tenant_role AS ENUM ('tenant_admin', 'tenant_billing', 'tenant_manager', 'tenant_staff');
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS tenant_role public.tenant_role DEFAULT 'tenant_staff';
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS is_tenant_admin boolean DEFAULT false;

-- Update booking channels access column
ALTER TABLE public.user_permissions RENAME COLUMN access_beds24 TO access_booking_channels;

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creem ON public.subscriptions(creem_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON public.locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant ON public.rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON public.reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant ON public.user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);

-- =====================================================
-- 10. CREATE FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_tenant_slug(hotel_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(hotel_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'hotel';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS(SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to check tenant limits
CREATE OR REPLACE FUNCTION public.get_tenant_limits(tenant_id_param uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'max_locations', COALESCE(tl.max_locations, p.max_locations),
    'max_rooms', COALESCE(tl.max_rooms, p.max_rooms),
    'features', COALESCE(tl.custom_features, p.features, '{}')
  ) INTO result
  FROM public.tenants t
  LEFT JOIN public.subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
  LEFT JOIN public.plans p ON s.plan_id = p.id
  LEFT JOIN public.tenant_limits tl ON t.id = tl.tenant_id
  WHERE t.id = tenant_id_param;
  
  RETURN COALESCE(result, '{"max_locations": 1, "max_rooms": 1, "features": {}}');
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text AS $$
DECLARE
  year_part text;
  sequence_num integer;
  invoice_number text;
BEGIN
  year_part := extract(year from now())::text;
  
  -- Get next sequence number for the year
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ ('^' || year_part || '-[0-9]+$') 
      THEN split_part(invoice_number, '-', 2)::integer 
      ELSE 0 
    END
  ), 0) + 1 INTO sequence_num
  FROM public.invoices 
  WHERE invoice_number IS NOT NULL;
  
  invoice_number := year_part || '-' || lpad(sequence_num::text, 6, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. CREATE TRIGGERS
-- =====================================================

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_number();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 13. CREATE RLS POLICIES
-- =====================================================

-- Tenants policies
CREATE POLICY "Users can view their own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    owner_profile_id = auth.uid() OR
    id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant admins can update their tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    owner_profile_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid() 
      AND up.tenant_id = tenants.id 
      AND up.is_tenant_admin = true
    )
  );

-- Plans policies (public read)
CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Subscriptions policies
CREATE POLICY "Users can view their tenant subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants t 
      WHERE t.owner_profile_id = auth.uid() OR 
      t.id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Invoices policies
CREATE POLICY "Users can view their tenant invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants t 
      WHERE t.owner_profile_id = auth.uid() OR 
      t.id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- User invitations policies
CREATE POLICY "Tenant admins can manage invitations" ON public.user_invitations
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_permissions up
      WHERE up.user_id = auth.uid() AND up.is_tenant_admin = true
    )
  );

-- Update existing table policies to include tenant isolation
-- Note: These will need to be customized based on your existing RLS setup

-- =====================================================
-- 14. SEED DEFAULT PLANS
-- =====================================================
INSERT INTO public.plans (id, name, description, price_cents, currency, max_locations, max_rooms, features) VALUES
  ('free', 'Free Plan', 'Perfect for trying out the system with basic features', 0, 'USD', 1, 1, '{"dashboard": true, "income": true, "expenses": true, "calendar": true, "reports": false, "booking_channels": false}'),
  ('starter', 'Starter Plan', 'Great for small hotels with multiple rooms', 1999, 'USD', 1, 10, '{"dashboard": true, "income": true, "expenses": true, "calendar": true, "reports": true, "booking_channels": false}'),
  ('professional', 'Professional Plan', 'For growing hotel businesses with multiple locations', 4999, 'USD', 5, 100, '{"dashboard": true, "income": true, "expenses": true, "calendar": true, "reports": true, "booking_channels": true}'),
  ('enterprise', 'Enterprise Plan', 'Unlimited access for large hotel chains', 9999, 'USD', NULL, NULL, '{"dashboard": true, "income": true, "expenses": true, "calendar": true, "reports": true, "booking_channels": true, "custom_features": true}')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- NOTES FOR IMPLEMENTATION:
-- =====================================================
-- 1. After running this migration, you'll need to:
--    - Update your auth context to include tenant_id in JWT claims
--    - Modify existing queries to filter by tenant_id
--    - Implement the onboarding flow in React
--    - Set up Creem.io webhook handlers
--    - Configure Resend for user invitations
--
-- 2. To create a demo tenant and assign existing data:
--    INSERT INTO tenants (name, slug, hotel_name) VALUES ('Demo Hotel', 'demo-hotel', 'Demo Hotel') RETURNING id;
--    -- Then update all existing records with the returned tenant_id
--
-- 3. The free plan limits users to 1 location and 1 room
--    Implement these checks in your application logic
-- =====================================================