-- 1. Add target_role to forms table if not already present
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'forms' 
    AND column_name = 'target_role'
  ) THEN
    ALTER TABLE public.forms ADD COLUMN target_role VARCHAR(50) DEFAULT 'ALL';
  END IF;
END $$;

-- 2. Allow authenticated users to read active forms
DROP POLICY IF EXISTS "Allow read forms" ON public.forms;
DROP POLICY IF EXISTS "Read forms" ON public.forms;
CREATE POLICY "Read forms" ON public.forms FOR SELECT TO authenticated
USING (active = true);

-- 3. Allow authenticated users to read form sections, fields and options
DROP POLICY IF EXISTS "Read form sections" ON public.form_sections;
CREATE POLICY "Read form sections" ON public.form_sections FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Read form fields" ON public.form_fields;
CREATE POLICY "Read form fields" ON public.form_fields FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Read form options" ON public.form_field_options;
CREATE POLICY "Read form options" ON public.form_field_options FOR SELECT TO authenticated
USING (true);

-- 4. RLS policies for report_submissions
DROP POLICY IF EXISTS "Read report submissions" ON public.report_submissions;
DROP POLICY IF EXISTS "Employees view own submissions" ON public.report_submissions;
DROP POLICY IF EXISTS "Employees insert own submissions" ON public.report_submissions;
DROP POLICY IF EXISTS "Employees can insert their own reports" ON public.report_submissions;
DROP POLICY IF EXISTS "Employees can view their own reports" ON public.report_submissions;
DROP POLICY IF EXISTS "Controllers can view all reports" ON public.report_submissions;
DROP POLICY IF EXISTS "Controllers update submissions" ON public.report_submissions;
DROP POLICY IF EXISTS "Employees update own submissions" ON public.report_submissions;

-- SELECT Policy
CREATE POLICY "Read report submissions" ON public.report_submissions FOR SELECT TO authenticated
USING (
  public.is_district_controller() OR
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.employee_type = 'TALUKA_CONTROLLER' 
    AND viewer.taluka_id = (SELECT taluka_id FROM public.employees target WHERE target.id = public.report_submissions.employee_id)
    AND viewer.status = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.employee_type = 'PHC_CONTROLLER' 
    AND viewer.phc_id = (SELECT phc_id FROM public.employees target WHERE target.id = public.report_submissions.employee_id)
    AND viewer.status = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid()
    AND viewer.sub_centre_id = (SELECT sub_centre_id FROM public.employees target WHERE target.id = public.report_submissions.employee_id)
    AND viewer.status = true
    AND viewer.sub_centre_id IS NOT NULL
  ) OR
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- INSERT Policy: Employees can submit their own reports
CREATE POLICY "Employees insert own submissions" ON public.report_submissions FOR INSERT TO authenticated
WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- UPDATE Policy: Employees can update their unapproved reports, Controllers can update status
CREATE POLICY "Employees and controllers update submissions" ON public.report_submissions FOR UPDATE TO authenticated
USING (
  public.is_district_controller() OR
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.employee_type IN ('TALUKA_CONTROLLER', 'PHC_CONTROLLER')
    AND viewer.status = true
  ) OR
  (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status != 'Approved')
);

-- 5. RLS policies for report_submission_values
DROP POLICY IF EXISTS "Employees insert own values" ON public.report_submission_values;
DROP POLICY IF EXISTS "View submission values" ON public.report_submission_values;
DROP POLICY IF EXISTS "Update submission values" ON public.report_submission_values;
DROP POLICY IF EXISTS "Employees can insert submission values" ON public.report_submission_values;
DROP POLICY IF EXISTS "Employees can view their submission values" ON public.report_submission_values;
DROP POLICY IF EXISTS "Controllers can view all submission values" ON public.report_submission_values;
DROP POLICY IF EXISTS "Delete submission values" ON public.report_submission_values;

CREATE POLICY "View submission values" ON public.report_submission_values FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.report_submissions s
    WHERE s.id = public.report_submission_values.submission_id
  )
);

CREATE POLICY "Employees insert own values" ON public.report_submission_values FOR INSERT TO authenticated
WITH CHECK (
  submission_id IN (
    SELECT id FROM public.report_submissions 
    WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Employees update own values" ON public.report_submission_values FOR UPDATE TO authenticated
USING (
  submission_id IN (
    SELECT id FROM public.report_submissions 
    WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Employees delete own values" ON public.report_submission_values FOR DELETE TO authenticated
USING (
  submission_id IN (
    SELECT id FROM public.report_submissions 
    WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);
