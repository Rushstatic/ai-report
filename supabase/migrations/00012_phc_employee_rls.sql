-- Allow PHC controllers to insert and update employees in their PHC
CREATE POLICY "PHC admin insert employees" ON public.employees FOR INSERT TO authenticated
WITH CHECK (
  public.get_auth_user_employee_type() = 'PHC_CONTROLLER' AND
  phc_id = public.get_auth_user_phc_id() AND
  employee_type IN ('MPW', 'ANM', 'CHO')
);

CREATE POLICY "PHC admin update employees" ON public.employees FOR UPDATE TO authenticated
USING (
  public.get_auth_user_employee_type() = 'PHC_CONTROLLER' AND
  phc_id = public.get_auth_user_phc_id() AND
  employee_type IN ('MPW', 'ANM', 'CHO')
);
