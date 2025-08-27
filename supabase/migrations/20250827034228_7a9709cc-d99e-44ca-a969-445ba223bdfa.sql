-- Create income_types table
CREATE TABLE public.income_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.income_types ENABLE ROW LEVEL SECURITY;

-- Create policies for income_types
CREATE POLICY "Authenticated can read income_types" 
ON public.income_types 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated can write income_types" 
ON public.income_types 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert some default income types
INSERT INTO public.income_types (type_name) VALUES 
('Room Revenue'),
('Food & Beverage'),
('Laundry Service'),
('Extra Bed'),
('Late Check-out'),
('Early Check-in'),
('Other Services');