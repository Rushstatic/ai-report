-- Fix infinite recursion on employees table
DROP POLICY IF EXISTS "Read employees" ON public.employees;

-- Allow all authenticated users to read the employee directory (UI filters the data)
CREATE POLICY "Read employees" ON public.employees FOR SELECT TO authenticated
USING (true);
