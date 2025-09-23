-- ============================================================================
-- FIX: Add Missing income_types Table
-- ============================================================================
-- Run this script in Supabase SQL Editor to add the missing income_types table

-- Create income_types table
CREATE TABLE IF NOT EXISTS public.income_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.income_types ENABLE ROW LEVEL SECURITY;

-- Create policies for income_types
CREATE POLICY "Authenticated can read income_types" 
ON public.income_types 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated can write income_types" 
ON public.income_types 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Insert default income types to match the enum values
INSERT INTO public.income_types (type_name) VALUES 
  ('booking'),
  ('laundry'),
  ('food'),
  ('other')
ON CONFLICT (type_name) DO NOTHING;

-- ============================================================================
-- INCOME TYPES TABLE ADDED
-- ============================================================================