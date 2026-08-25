-- 1. First, we replace the report_submissions policy so we can safely drop the helper functions
DROP POLICY IF EXISTS "Read report submissions" ON public.report_submissions;
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
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- 2. Clean up old helper functions that cause recursion
DROP FUNCTION IF EXISTS public.get_auth_employee_type() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_taluka_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_phc_id() CASCADE;

-- 3. Drop all old conflicting policies
DROP POLICY IF EXISTS "Controllers manage phcs" ON public.phcs;
DROP POLICY IF EXISTS "District controller manage phcs" ON public.phcs;
DROP POLICY IF EXISTS "Taluka controller manage own phcs" ON public.phcs;
DROP POLICY IF EXISTS "Controllers manage sub_centres" ON public.sub_centres;
DROP POLICY IF EXISTS "District controller manage subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "Taluka controller manage own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "PHC controller manage own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "Allow read phcs" ON public.phcs;
DROP POLICY IF EXISTS "Read phcs" ON public.phcs;
DROP POLICY IF EXISTS "Allow read sub_centres" ON public.sub_centres;
DROP POLICY IF EXISTS "Read subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "Allow read talukas" ON public.talukas;
DROP POLICY IF EXISTS "Read talukas" ON public.talukas;
DROP POLICY IF EXISTS "District controller manage talukas" ON public.talukas;

-- 4. TALUKAS POLICIES
CREATE POLICY "Read talukas" ON public.talukas FOR SELECT TO authenticated
USING (
  public.is_district_controller() OR 
  EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND taluka_id = public.talukas.id AND status = true)
);

CREATE POLICY "District controller manage talukas" ON public.talukas FOR ALL TO authenticated
USING (public.is_district_controller());

-- 5. PHCS POLICIES
CREATE POLICY "Read phcs" ON public.phcs FOR SELECT TO authenticated
USING (
  public.is_district_controller() OR 
  EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND taluka_id = public.phcs.taluka_id AND status = true)
);

CREATE POLICY "District controller manage phcs" ON public.phcs FOR ALL TO authenticated
USING (public.is_district_controller());

CREATE POLICY "Taluka controller manage own phcs" ON public.phcs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() 
    AND employee_type = 'TALUKA_CONTROLLER' 
    AND taluka_id = public.phcs.taluka_id 
    AND status = true
  )
);

-- 6. SUB CENTRES POLICIES
CREATE POLICY "Read subcentres" ON public.sub_centres FOR SELECT TO authenticated
USING (
  public.is_district_controller() OR 
  EXISTS (
    SELECT 1 FROM public.employees e 
    JOIN public.phcs p ON p.taluka_id = e.taluka_id 
    WHERE e.user_id = auth.uid() AND public.sub_centres.phc_id = p.id AND e.status = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND phc_id = public.sub_centres.phc_id AND status = true
  )
);

CREATE POLICY "District controller manage subcentres" ON public.sub_centres FOR ALL TO authenticated
USING (public.is_district_controller());

CREATE POLICY "Taluka controller manage own subcentres" ON public.sub_centres FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    JOIN public.phcs p ON p.taluka_id = e.taluka_id 
    WHERE e.user_id = auth.uid() 
    AND e.employee_type = 'TALUKA_CONTROLLER' 
    AND public.sub_centres.phc_id = p.id 
    AND e.status = true
  )
);

CREATE POLICY "PHC controller manage own subcentres" ON public.sub_centres FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() 
    AND employee_type = 'PHC_CONTROLLER' 
    AND phc_id = public.sub_centres.phc_id 
    AND status = true
  )
);

-- 7. Fix Employee Add/Update Policies for Taluka Controller
DROP POLICY IF EXISTS "Taluka admin insert employees" ON public.employees;
DROP POLICY IF EXISTS "Taluka admin update employees" ON public.employees;
DROP POLICY IF EXISTS "Read employees" ON public.employees;

CREATE POLICY "Taluka admin insert employees" ON public.employees FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees manager
    WHERE manager.user_id = auth.uid() 
    AND manager.employee_type = 'TALUKA_CONTROLLER'
    AND manager.taluka_id = public.employees.taluka_id
    AND manager.status = true
  )
  AND employee_type IN ('PHC_CONTROLLER', 'MPW', 'ANM', 'CHO')
);

CREATE POLICY "Taluka admin update employees" ON public.employees FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees manager
    WHERE manager.user_id = auth.uid() 
    AND manager.employee_type = 'TALUKA_CONTROLLER'
    AND manager.taluka_id = public.employees.taluka_id
    AND manager.status = true
  )
  AND employee_type IN ('PHC_CONTROLLER', 'MPW', 'ANM', 'CHO')
);

CREATE POLICY "Read employees" ON public.employees FOR SELECT TO authenticated
USING (
  public.is_district_controller() OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.employee_type = 'TALUKA_CONTROLLER' 
    AND viewer.taluka_id = public.employees.taluka_id
    AND viewer.status = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid() 
    AND viewer.employee_type = 'PHC_CONTROLLER' 
    AND viewer.phc_id = public.employees.phc_id
    AND viewer.status = true
  )
);

