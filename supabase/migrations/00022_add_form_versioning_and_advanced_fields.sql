-- ==============================================================================
-- ADD MISSING COLUMNS FOR ADVANCED FORM BUILDER FEATURES
-- ==============================================================================

-- 1. Add versioning and hierarchy columns to forms table
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS parent_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) DEFAULT 'ALL';

-- 2. Add advanced field configuration columns to form_fields table
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS parent_field_id UUID REFERENCES public.form_fields(id) ON DELETE CASCADE;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS allow_sub_fields BOOLEAN DEFAULT false;
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS master_data_source VARCHAR(100);
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS master_data_field VARCHAR(100);
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS master_data_mode VARCHAR(50);

