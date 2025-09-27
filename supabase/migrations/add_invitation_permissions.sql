-- Add permissions column to user_invitations table
-- This will store the selected permissions as JSONB

ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';

-- Add a comment to describe the permissions structure
COMMENT ON COLUMN public.user_invitations.permissions IS 'JSON object containing selected permissions like {"access_dashboard": true, "access_income": false, ...}';