-- Migration: 00023_fix_cascading_foreign_keys.sql
-- Ensure cascading foreign keys on forms, submissions, and values to prevent constraint errors

-- 1. Ensure report_submissions cascades when a form is deleted
ALTER TABLE IF EXISTS report_submissions 
  DROP CONSTRAINT IF EXISTS report_submissions_form_id_fkey,
  ADD CONSTRAINT report_submissions_form_id_fkey 
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;

-- 2. Ensure report_submission_values cascades when a report submission is deleted
ALTER TABLE IF EXISTS report_submission_values 
  DROP CONSTRAINT IF EXISTS report_submission_values_submission_id_fkey,
  ADD CONSTRAINT report_submission_values_submission_id_fkey 
    FOREIGN KEY (submission_id) REFERENCES report_submissions(id) ON DELETE CASCADE;

-- 3. Ensure report_submission_values cascades when a form field is deleted
ALTER TABLE IF EXISTS report_submission_values 
  DROP CONSTRAINT IF EXISTS report_submission_values_field_id_fkey,
  ADD CONSTRAINT report_submission_values_field_id_fkey 
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE;

-- 4. Ensure form_sections cascades when a form is deleted
ALTER TABLE IF EXISTS form_sections 
  DROP CONSTRAINT IF EXISTS form_sections_form_id_fkey,
  ADD CONSTRAINT form_sections_form_id_fkey 
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;

-- 5. Ensure form_fields cascades when a form_section is deleted
ALTER TABLE IF EXISTS form_fields 
  DROP CONSTRAINT IF EXISTS form_fields_section_id_fkey,
  ADD CONSTRAINT form_fields_section_id_fkey 
    FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE;

-- 6. Ensure form_assignments cascades when a form is deleted
ALTER TABLE IF EXISTS form_assignments 
  DROP CONSTRAINT IF EXISTS form_assignments_form_id_fkey,
  ADD CONSTRAINT form_assignments_form_id_fkey 
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
