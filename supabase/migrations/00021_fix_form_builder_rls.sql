-- ==============================================================================
-- FIX FORM BUILDER PERMISSIONS AND RLS POLICIES (Idempotent)
-- ==============================================================================

-- FORMS TABLE
DROP POLICY IF EXISTS "Allow read forms" ON public.forms;
DROP POLICY IF EXISTS "Read forms" ON public.forms;
DROP POLICY IF EXISTS "District admin manage forms" ON public.forms;
DROP POLICY IF EXISTS "Controllers manage forms" ON public.forms;
DROP POLICY IF EXISTS "Authenticated users insert forms" ON public.forms;
DROP POLICY IF EXISTS "Authenticated users update forms" ON public.forms;
DROP POLICY IF EXISTS "Controllers insert forms" ON public.forms;
DROP POLICY IF EXISTS "Controllers update forms" ON public.forms;
DROP POLICY IF EXISTS "Controllers delete forms" ON public.forms;

CREATE POLICY "Allow read forms" ON public.forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Controllers insert forms" ON public.forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Controllers update forms" ON public.forms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Controllers delete forms" ON public.forms FOR DELETE TO authenticated USING (true);

-- FORM SECTIONS TABLE
DROP POLICY IF EXISTS "Allow read form_sections" ON public.form_sections;
DROP POLICY IF EXISTS "Read form sections" ON public.form_sections;
DROP POLICY IF EXISTS "District admin manage form_sections" ON public.form_sections;
DROP POLICY IF EXISTS "Controllers manage form_sections" ON public.form_sections;
DROP POLICY IF EXISTS "Controllers insert form_sections" ON public.form_sections;
DROP POLICY IF EXISTS "Controllers update form_sections" ON public.form_sections;
DROP POLICY IF EXISTS "Controllers delete form_sections" ON public.form_sections;

CREATE POLICY "Allow read form_sections" ON public.form_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Controllers insert form_sections" ON public.form_sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Controllers update form_sections" ON public.form_sections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Controllers delete form_sections" ON public.form_sections FOR DELETE TO authenticated USING (true);

-- FORM FIELDS TABLE
DROP POLICY IF EXISTS "Allow read form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Read form fields" ON public.form_fields;
DROP POLICY IF EXISTS "District admin manage form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Controllers manage form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Controllers insert form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Controllers update form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Controllers delete form_fields" ON public.form_fields;

CREATE POLICY "Allow read form_fields" ON public.form_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Controllers insert form_fields" ON public.form_fields FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Controllers update form_fields" ON public.form_fields FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Controllers delete form_fields" ON public.form_fields FOR DELETE TO authenticated USING (true);

-- FORM FIELD OPTIONS TABLE
DROP POLICY IF EXISTS "Allow read form_field_options" ON public.form_field_options;
DROP POLICY IF EXISTS "Read form field options" ON public.form_field_options;
DROP POLICY IF EXISTS "District admin manage form_field_options" ON public.form_field_options;
DROP POLICY IF EXISTS "Controllers manage form_field_options" ON public.form_field_options;
DROP POLICY IF EXISTS "Controllers insert form_field_options" ON public.form_field_options;
DROP POLICY IF EXISTS "Controllers update form_field_options" ON public.form_field_options;
DROP POLICY IF EXISTS "Controllers delete form_field_options" ON public.form_field_options;

CREATE POLICY "Allow read form_field_options" ON public.form_field_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Controllers insert form_field_options" ON public.form_field_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Controllers update form_field_options" ON public.form_field_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Controllers delete form_field_options" ON public.form_field_options FOR DELETE TO authenticated USING (true);

