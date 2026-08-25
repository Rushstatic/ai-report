-- ==============================================================================
-- ADD EMPLOYEE-WISE SUBMISSION RULE TO FORMS
-- Allows defining whether a form requires individual employee submissions or
-- a single consolidated submission for the whole sub-centre.
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'forms' 
      AND column_name = 'employee_wise_submission'
  ) THEN
    ALTER TABLE public.forms ADD COLUMN employee_wise_submission BOOLEAN DEFAULT false;
  END IF;
END $$;
