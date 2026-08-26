ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS parent_field_id UUID REFERENCES public.form_fields(id) ON DELETE CASCADE;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS allow_sub_fields BOOLEAN DEFAULT false;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS placeholder TEXT;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS min_value TEXT;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS max_value TEXT;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS default_value TEXT;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS help_text TEXT;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS calculation_formula TEXT;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS conditional_logic JSONB;
