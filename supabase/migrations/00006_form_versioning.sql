-- ==============================================================================
-- FORM VERSIONING SYSTEM
-- Adds versioning support to prevent corrupting existing reports on form updates
-- ==============================================================================

-- 1. Drop existing UNIQUE constraint on 'code' if it exists, so we can have multiple versions of the same code
DO $$ 
DECLARE 
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'forms' AND tc.constraint_type = 'UNIQUE'
  AND EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    WHERE kcu.constraint_name = tc.constraint_name AND kcu.column_name = 'code'
  );

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.forms DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- 2. Add versioning columns
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;

-- 3. Add composite unique constraint so (code, version) must be unique
ALTER TABLE public.forms 
ADD CONSTRAINT forms_code_version_key UNIQUE (code, version);
