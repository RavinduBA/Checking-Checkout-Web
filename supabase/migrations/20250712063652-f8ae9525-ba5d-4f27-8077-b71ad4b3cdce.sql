-- Check and fix accounts RLS policies
DROP POLICY IF EXISTS "Admins can manage accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can view accounts" ON accounts;

-- Create new policies that allow all authenticated users to manage accounts
CREATE POLICY "Authenticated users can view accounts" 
ON accounts FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert accounts" 
ON accounts FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update accounts" 
ON accounts FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete accounts" 
ON accounts FOR DELETE 
USING (auth.role() = 'authenticated');

-- Check and fix expense_types RLS policies
DROP POLICY IF EXISTS "Admins can manage expense types" ON expense_types;
DROP POLICY IF EXISTS "Authenticated users can view expense types" ON expense_types;

-- Create new policies that allow all authenticated users to manage expense types
CREATE POLICY "Authenticated users can view expense types" 
ON expense_types FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert expense types" 
ON expense_types FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update expense types" 
ON expense_types FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete expense types" 
ON expense_types FOR DELETE 
USING (auth.role() = 'authenticated');

-- Check and fix income_types RLS policies
DROP POLICY IF EXISTS "Admins can manage income types" ON income_types;
DROP POLICY IF EXISTS "Authenticated users can view income types" ON income_types;

-- Create new policies that allow all authenticated users to manage income types
CREATE POLICY "Authenticated users can view income types" 
ON income_types FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert income types" 
ON income_types FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update income types" 
ON income_types FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete income types" 
ON income_types FOR DELETE 
USING (auth.role() = 'authenticated');