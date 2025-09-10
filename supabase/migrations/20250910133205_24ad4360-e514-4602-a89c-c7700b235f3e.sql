-- Add currency columns to relevant tables
ALTER TABLE public.rooms ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;
ALTER TABLE public.reservations ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;
ALTER TABLE public.expenses ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;
ALTER TABLE public.income ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;
ALTER TABLE public.booking_payments ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;
ALTER TABLE public.payments ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;
ALTER TABLE public.additional_services ADD COLUMN currency currency_type NOT NULL DEFAULT 'LKR'::currency_type;

-- Add conversion rate table for currency management
CREATE TABLE public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for currency_rates
CREATE POLICY "Authenticated can read currency_rates" 
ON public.currency_rates 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can write currency_rates" 
ON public.currency_rates 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default USD to LKR rate (can be updated via settings)
INSERT INTO public.currency_rates (from_currency, to_currency, rate) 
VALUES ('USD', 'LKR', 300.00);

-- Create trigger for automatic timestamp updates on currency_rates
CREATE TRIGGER update_currency_rates_updated_at
BEFORE UPDATE ON public.currency_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();