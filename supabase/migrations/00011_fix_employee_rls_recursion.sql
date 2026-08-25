-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Read employees" ON public.employees;

-- 2. Create a safe, non-recursive read policy
CREATE POLICY "Read employees" ON public.employees FOR SELECT TO authenticated
USING (true);
