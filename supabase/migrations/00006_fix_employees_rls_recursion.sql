-- 1. Drop ALL older buggy policies from previous migrations
DROP POLICY IF EXISTS "District Controllers can manage employees" ON public.employees;
DROP POLICY IF EXISTS "District admin manage all employees" ON public.employees;
DROP POLICY IF EXISTS "District admin insert employees" ON public.employees;
DROP POLICY IF EXISTS "District admin update employees" ON public.employees;
DROP POLICY IF EXISTS "District admin delete employees" ON public.employees;
DROP POLICY IF EXISTS "Allow read employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view all employees" ON public.employees;

-- 2. Re-create the safe SELECT policy (everyone can read the list)
CREATE POLICY "Allow read employees" ON public.employees 
FOR SELECT TO authenticated 
USING (true);

-- 3. Re-create the safe INSERT, UPDATE, DELETE policies (no infinite loops)
CREATE POLICY "District admin insert employees" ON public.employees 
FOR INSERT TO authenticated 
WITH CHECK (public.is_district_controller());

CREATE POLICY "District admin update employees" ON public.employees 
FOR UPDATE TO authenticated 
USING (public.is_district_controller());

CREATE POLICY "District admin delete employees" ON public.employees 
FOR DELETE TO authenticated 
USING (public.is_district_controller());
