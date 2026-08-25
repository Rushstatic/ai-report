-- 1. Drop the FOR ALL policy that causes infinite recursion on SELECT
DROP POLICY IF EXISTS "District admin manage all employees" ON employees;

-- 2. Replace with specific policies for INSERT, UPDATE, DELETE
-- We intentionally do NOT create a SELECT policy that calls is_district_controller()
-- because there is already a "Allow read employees" policy with USING (true), 
-- and evaluating is_district_controller() on SELECT causes infinite recursion.
CREATE POLICY "District admin insert employees" ON employees FOR INSERT TO authenticated WITH CHECK (public.is_district_controller());
CREATE POLICY "District admin update employees" ON employees FOR UPDATE TO authenticated USING (public.is_district_controller());
CREATE POLICY "District admin delete employees" ON employees FOR DELETE TO authenticated USING (public.is_district_controller());
