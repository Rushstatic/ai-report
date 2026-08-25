-- 1. Read villages
DROP POLICY IF EXISTS "Read villages" ON public.villages;
DROP POLICY IF EXISTS "Allow read access to all authenticated users on villages" ON public.villages;
DROP POLICY IF EXISTS "Allow read villages" ON public.villages;

CREATE POLICY "Read villages" ON public.villages FOR SELECT TO authenticated
USING (true);

-- 2. Manage villages
DROP POLICY IF EXISTS "Controllers manage villages" ON public.villages;
DROP POLICY IF EXISTS "District controller manage villages" ON public.villages;
DROP POLICY IF EXISTS "Taluka controller manage own villages" ON public.villages;
DROP POLICY IF EXISTS "PHC controller manage own villages" ON public.villages;

-- District Controller
CREATE POLICY "District controller manage villages" ON public.villages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees manager
    WHERE manager.user_id = auth.uid()
    AND manager.employee_type = 'DISTRICT_CONTROLLER'
    AND manager.status = true
  )
);

-- Taluka Controller
CREATE POLICY "Taluka controller manage own villages" ON public.villages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    JOIN public.phcs p ON p.taluka_id = e.taluka_id
    JOIN public.sub_centres sc ON sc.phc_id = p.id
    WHERE e.user_id = auth.uid() 
    AND e.employee_type = 'TALUKA_CONTROLLER' 
    AND public.villages.sub_centre_id = sc.id 
    AND e.status = true
  )
);

-- PHC Controller
CREATE POLICY "PHC controller manage own villages" ON public.villages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.sub_centres sc ON sc.phc_id = e.phc_id
    WHERE e.user_id = auth.uid()
    AND e.employee_type = 'PHC_CONTROLLER'
    AND public.villages.sub_centre_id = sc.id
    AND e.status = true
  )
);
