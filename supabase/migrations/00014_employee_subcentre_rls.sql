-- Allow employees to read report submissions from their own sub_centre
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
  EXISTS (
    SELECT 1 FROM public.employees viewer
    WHERE viewer.user_id = auth.uid()
    AND viewer.sub_centre_id = (SELECT sub_centre_id FROM public.employees target WHERE target.id = public.report_submissions.employee_id)
    AND viewer.status = true
    AND viewer.sub_centre_id IS NOT NULL
  ) OR
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
