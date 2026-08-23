-- 1. Seed District Admin User in auth.users
-- This block safely injects the admin directly into the Supabase authentication system.
-- (The trigger created in migration 00002 will automatically link this to the employees table)
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  admin_phone VARCHAR := '919730266586';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = admin_phone) THEN
    INSERT INTO auth.users (id, instance_id, phone, encrypted_password, aud, role, created_at, updated_at, phone_confirmed_at)
    VALUES (
      new_user_id, 
      '00000000-0000-0000-0000-000000000000', 
      admin_phone, 
      crypt('123456', gen_salt('bf')), 
      'authenticated', 
      'authenticated', 
      now(), 
      now(), 
      now()
    );
  END IF;
END $$;

-- 2. CREATE ROW LEVEL SECURITY (RLS) POLICIES

-- Hierarchy Tables (Read-Only for all authenticated users)
CREATE POLICY "Allow read access to all authenticated users on districts" ON districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users on talukas" ON talukas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users on phcs" ON phcs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users on sub_centres" ON sub_centres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users on villages" ON villages FOR SELECT TO authenticated USING (true);

-- Employees Table Policies
CREATE POLICY "Employees can view all employees" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "District Controllers can manage employees" ON employees FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.employee_type = 'DISTRICT_CONTROLLER')
);

-- Forms & Form Fields Policies (Read for all, Write for District Controllers)
CREATE POLICY "All authenticated users can view forms" ON forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "District Controllers can manage forms" ON forms FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.employee_type = 'DISTRICT_CONTROLLER')
);

CREATE POLICY "All authenticated users can view form sections" ON form_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "District Controllers can manage form sections" ON form_sections FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.employee_type = 'DISTRICT_CONTROLLER')
);

CREATE POLICY "All authenticated users can view form fields" ON form_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "District Controllers can manage form fields" ON form_fields FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.employee_type = 'DISTRICT_CONTROLLER')
);

-- Report Submissions Policies
-- Users can insert their own reports
CREATE POLICY "Employees can insert their own reports" ON report_submissions FOR INSERT TO authenticated WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);
-- Users can read their own reports
CREATE POLICY "Employees can view their own reports" ON report_submissions FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);
-- Controllers can read all reports
CREATE POLICY "Controllers can view all reports" ON report_submissions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.employee_type IN ('DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER'))
);

-- Report Submission Values Policies
-- Inherit from submissions by joining
CREATE POLICY "Employees can insert submission values" ON report_submission_values FOR INSERT TO authenticated WITH CHECK (
  submission_id IN (SELECT id FROM report_submissions WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
);
CREATE POLICY "Employees can view their submission values" ON report_submission_values FOR SELECT TO authenticated USING (
  submission_id IN (SELECT id FROM report_submissions WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
);
CREATE POLICY "Controllers can view all submission values" ON report_submission_values FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.employee_type IN ('DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER'))
);
