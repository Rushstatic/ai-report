-- 1. Clean up old ambiguous policies
DROP POLICY IF EXISTS "Taluka controller manage own phcs" ON public.phcs;
DROP POLICY IF EXISTS "Taluka controller update own phcs" ON public.phcs;
DROP POLICY IF EXISTS "Taluka controller delete own phcs" ON public.phcs;
DROP POLICY IF EXISTS "Taluka controller insert own phcs" ON public.phcs;

DROP POLICY IF EXISTS "Taluka controller manage own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "Taluka controller update own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "Taluka controller delete own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "Taluka controller insert own subcentres" ON public.sub_centres;

DROP POLICY IF EXISTS "PHC controller manage own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "PHC controller update own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "PHC controller delete own subcentres" ON public.sub_centres;
DROP POLICY IF EXISTS "PHC controller insert own subcentres" ON public.sub_centres;

-- 2. PHCS POLICIES (Explicit Split)
CREATE POLICY "Taluka controller update own phcs" ON public.phcs FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees manager WHERE manager.user_id = auth.uid() AND manager.employee_type = 'TALUKA_CONTROLLER' AND manager.taluka_id = public.phcs.taluka_id AND manager.status = true)
);

CREATE POLICY "Taluka controller delete own phcs" ON public.phcs FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees manager WHERE manager.user_id = auth.uid() AND manager.employee_type = 'TALUKA_CONTROLLER' AND manager.taluka_id = public.phcs.taluka_id AND manager.status = true)
);

CREATE POLICY "Taluka controller insert own phcs" ON public.phcs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.employees manager WHERE manager.user_id = auth.uid() AND manager.employee_type = 'TALUKA_CONTROLLER' AND manager.taluka_id = taluka_id AND manager.status = true)
);

-- 3. SUB CENTRES POLICIES (Taluka Controller - Explicit Split)
CREATE POLICY "Taluka controller update own subcentres" ON public.sub_centres FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees manager JOIN public.phcs p ON p.taluka_id = manager.taluka_id WHERE manager.user_id = auth.uid() AND manager.employee_type = 'TALUKA_CONTROLLER' AND public.sub_centres.phc_id = p.id AND manager.status = true)
);

CREATE POLICY "Taluka controller delete own subcentres" ON public.sub_centres FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees manager JOIN public.phcs p ON p.taluka_id = manager.taluka_id WHERE manager.user_id = auth.uid() AND manager.employee_type = 'TALUKA_CONTROLLER' AND public.sub_centres.phc_id = p.id AND manager.status = true)
);

CREATE POLICY "Taluka controller insert own subcentres" ON public.sub_centres FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.employees manager JOIN public.phcs p ON p.taluka_id = manager.taluka_id WHERE manager.user_id = auth.uid() AND manager.employee_type = 'TALUKA_CONTROLLER' AND phc_id = p.id AND manager.status = true)
);

-- 4. SUB CENTRES POLICIES (PHC Controller - Explicit Split)
CREATE POLICY "PHC controller update own subcentres" ON public.sub_centres FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees manager WHERE manager.user_id = auth.uid() AND manager.employee_type = 'PHC_CONTROLLER' AND manager.phc_id = public.sub_centres.phc_id AND manager.status = true)
);

CREATE POLICY "PHC controller delete own subcentres" ON public.sub_centres FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees manager WHERE manager.user_id = auth.uid() AND manager.employee_type = 'PHC_CONTROLLER' AND manager.phc_id = public.sub_centres.phc_id AND manager.status = true)
);

CREATE POLICY "PHC controller insert own subcentres" ON public.sub_centres FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.employees manager WHERE manager.user_id = auth.uid() AND manager.employee_type = 'PHC_CONTROLLER' AND manager.phc_id = phc_id AND manager.status = true)
);
