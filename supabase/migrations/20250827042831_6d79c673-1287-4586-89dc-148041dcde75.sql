-- Create guides table
CREATE TABLE public.guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  agency_name TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policies for guides
CREATE POLICY "Authenticated can read guides" 
ON public.guides 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can write guides" 
ON public.guides 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for agents
CREATE POLICY "Authenticated can read agents" 
ON public.agents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can write agents" 
ON public.agents 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_guides_updated_at
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add guide_id and agent_id to reservations table
ALTER TABLE public.reservations 
ADD COLUMN guide_id UUID REFERENCES public.guides(id),
ADD COLUMN agent_id UUID REFERENCES public.agents(id),
ADD COLUMN guide_commission NUMERIC DEFAULT 0,
ADD COLUMN agent_commission NUMERIC DEFAULT 0;