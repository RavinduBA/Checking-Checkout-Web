-- =====================================================
-- Fix Tenants RLS Policy for INSERT operations
-- =====================================================
-- This migration adds the missing INSERT policy for tenants table
-- so users can create tenants during onboarding

BEGIN;

-- Add INSERT policy for tenants - users can create their own tenant
CREATE POLICY "Users can create their own tenant" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (owner_profile_id = auth.uid());

-- Also ensure there's a proper INSERT policy for user_invitations
CREATE POLICY "Tenant admins can create invitations" ON public.user_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_permissions up
      WHERE up.user_id = auth.uid() AND up.is_tenant_admin = true
    ) OR
    tenant_id IN (
      SELECT t.id FROM public.tenants t 
      WHERE t.owner_profile_id = auth.uid()
    )
  );

COMMIT;