-- Create account_transfers table that was missing
CREATE TABLE IF NOT EXISTS public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NOT NULL REFERENCES public.accounts(id),
  to_account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC NOT NULL,
  conversion_rate NUMERIC NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for account transfers
CREATE POLICY "Authenticated can read account_transfers" ON public.account_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write account_transfers" ON public.account_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);