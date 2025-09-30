-- Fix user_invitations RLS policy to allow unauthenticated token validation
-- This allows anyone to read invitations by token for the invitation acceptance flow

-- Add policy to allow unauthenticated access for valid invitations by token
CREATE POLICY "Allow unauthenticated access for valid invitation tokens" ON public.user_invitations
  FOR SELECT TO anon
  USING (
    expires_at > now() AND 
    accepted_at IS NULL
  );

-- Also ensure authenticated users can read invitations by token (for logged-in invitation acceptance)
CREATE POLICY "Allow authenticated access for valid invitation tokens" ON public.user_invitations
  FOR SELECT TO authenticated
  USING (
    expires_at > now() AND 
    accepted_at IS NULL
  );

-- Allow invitation acceptance (UPDATE) for authenticated users when they have the token
CREATE POLICY "Allow invitation acceptance by token" ON public.user_invitations
  FOR UPDATE TO authenticated
  USING (
    expires_at > now() AND 
    accepted_at IS NULL
  )
  WITH CHECK (
    expires_at > now() AND 
    accepted_by = auth.uid()
  );