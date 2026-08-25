-- ==============================================================================
-- DISTRICT ADMIN SETUP & FULL ROLE-BASED ACCESS CONTROL (RLS)
-- District Admin Mobile: 9730266586 | Role: DISTRICT_CONTROLLER
-- ==============================================================================

-- 1. Ensure Default District exists
INSERT INTO public.districts (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'District Health Office')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Ensure District Admin exists in employees table
INSERT INTO public.employees (
    name, 
    mobile_number, 
    employee_type, 
    designation, 
    employee_code, 
    district_id, 
    status
)
VALUES (
    'District Administrator', 
    '9730266586', 
    'DISTRICT_CONTROLLER', 
    'Chief Medical Officer / District Admin', 
    'ADMIN-001', 
    'a0000000-0000-0000-0000-000000000001', 
    true
)
ON CONFLICT (mobile_number) DO UPDATE SET 
    employee_type = 'DISTRICT_CONTROLLER',
    district_id = EXCLUDED.district_id,
    status = true;

-- 3. Auto-link trigger between Supabase Auth and Employees
CREATE OR REPLACE FUNCTION public.link_auth_user_to_employee()
RETURNS trigger AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    UPDATE public.employees
    SET user_id = NEW.id
    WHERE mobile_number = RIGHT(NEW.phone, 10);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF phone ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.link_auth_user_to_employee();

-- If auth user already exists for this phone, link immediately
UPDATE public.employees e
SET user_id = u.id
FROM auth.users u
WHERE u.phone IS NOT NULL 
  AND RIGHT(u.phone, 10) = e.mobile_number;

-- 4. Helper Security Definer functions for RLS performance & recursion prevention
CREATE OR REPLACE FUNCTION public.is_district_controller()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid()
      AND employee_type = 'DISTRICT_CONTROLLER'
      AND status = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_controller()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid()
      AND employee_type IN ('DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER')
      AND status = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talukas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_submission_values ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- A. HIERARCHY TABLES (Districts, Talukas, PHCs, Sub-Centres, Villages)
-- ----------------------------------------------------
-- Districts
DROP POLICY IF EXISTS "Allow read districts" ON districts;
CREATE POLICY "Allow read districts" ON districts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District controller manage districts" ON districts;
CREATE POLICY "District controller manage districts" ON districts FOR ALL TO authenticated USING (public.is_district_controller());

-- Talukas
DROP POLICY IF EXISTS "Allow read talukas" ON talukas;
CREATE POLICY "Allow read talukas" ON talukas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District controller manage talukas" ON talukas;
CREATE POLICY "District controller manage talukas" ON talukas FOR ALL TO authenticated USING (public.is_district_controller());

-- PHCs
DROP POLICY IF EXISTS "Allow read phcs" ON phcs;
CREATE POLICY "Allow read phcs" ON phcs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Controllers manage phcs" ON phcs;
CREATE POLICY "Controllers manage phcs" ON phcs FOR ALL TO authenticated USING (public.is_controller());

-- Sub Centres
DROP POLICY IF EXISTS "Allow read sub_centres" ON sub_centres;
CREATE POLICY "Allow read sub_centres" ON sub_centres FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Controllers manage sub_centres" ON sub_centres;
CREATE POLICY "Controllers manage sub_centres" ON sub_centres FOR ALL TO authenticated USING (public.is_controller());

-- Villages
DROP POLICY IF EXISTS "Allow read villages" ON villages;
CREATE POLICY "Allow read villages" ON villages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Controllers manage villages" ON villages;
CREATE POLICY "Controllers manage villages" ON villages FOR ALL TO authenticated USING (public.is_controller());

-- ----------------------------------------------------
-- B. EMPLOYEES & TALUKA ADMIN MANAGEMENT
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Allow read employees" ON employees;
CREATE POLICY "Allow read employees" ON employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "District admin manage all employees" ON employees;
CREATE POLICY "District admin manage all employees" ON employees FOR ALL TO authenticated USING (public.is_district_controller());

-- ----------------------------------------------------
-- C. FORMS, SECTIONS, FIELDS & ASSIGNMENTS
-- ----------------------------------------------------
-- Forms
DROP POLICY IF EXISTS "Allow read forms" ON forms;
CREATE POLICY "Allow read forms" ON forms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District admin manage forms" ON forms;
CREATE POLICY "District admin manage forms" ON forms FOR ALL TO authenticated USING (public.is_district_controller());

-- Form Sections
DROP POLICY IF EXISTS "Allow read form_sections" ON form_sections;
CREATE POLICY "Allow read form_sections" ON form_sections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District admin manage form_sections" ON form_sections;
CREATE POLICY "District admin manage form_sections" ON form_sections FOR ALL TO authenticated USING (public.is_district_controller());

-- Form Fields
DROP POLICY IF EXISTS "Allow read form_fields" ON form_fields;
CREATE POLICY "Allow read form_fields" ON form_fields FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District admin manage form_fields" ON form_fields;
CREATE POLICY "District admin manage form_fields" ON form_fields FOR ALL TO authenticated USING (public.is_district_controller());

-- Form Field Options
DROP POLICY IF EXISTS "Allow read form_field_options" ON form_field_options;
CREATE POLICY "Allow read form_field_options" ON form_field_options FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District admin manage form_field_options" ON form_field_options;
CREATE POLICY "District admin manage form_field_options" ON form_field_options FOR ALL TO authenticated USING (public.is_district_controller());

-- Form Assignments
DROP POLICY IF EXISTS "Allow read form_assignments" ON form_assignments;
CREATE POLICY "Allow read form_assignments" ON form_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "District admin manage form_assignments" ON form_assignments;
CREATE POLICY "District admin manage form_assignments" ON form_assignments FOR ALL TO authenticated USING (public.is_district_controller());

-- ----------------------------------------------------
-- D. REPORT SUBMISSIONS & VALUES
-- ----------------------------------------------------
-- Submissions
DROP POLICY IF EXISTS "Employees insert own submissions" ON report_submissions;
CREATE POLICY "Employees insert own submissions" ON report_submissions FOR INSERT TO authenticated WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Employees view own submissions" ON report_submissions;
CREATE POLICY "Employees view own submissions" ON report_submissions FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR public.is_controller()
);

DROP POLICY IF EXISTS "Controllers update submissions" ON report_submissions;
CREATE POLICY "Controllers update submissions" ON report_submissions FOR UPDATE TO authenticated USING (
  public.is_controller() OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Submission Values
DROP POLICY IF EXISTS "Employees insert own values" ON report_submission_values;
CREATE POLICY "Employees insert own values" ON report_submission_values FOR INSERT TO authenticated WITH CHECK (
  submission_id IN (SELECT id FROM report_submissions WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "View submission values" ON report_submission_values;
CREATE POLICY "View submission values" ON report_submission_values FOR SELECT TO authenticated USING (
  submission_id IN (SELECT id FROM report_submissions WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
  OR public.is_controller()
);

DROP POLICY IF EXISTS "Update submission values" ON report_submission_values;
CREATE POLICY "Update submission values" ON report_submission_values FOR UPDATE TO authenticated USING (
  submission_id IN (SELECT id FROM report_submissions WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
  OR public.is_controller()
);
