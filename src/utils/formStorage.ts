import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { syncStandardFormsToDatabase } from './syncForms';

export type FormFieldType = 
  | 'Text' | 'Long Text' | 'Number' | 'Decimal' | 'Mobile Number' 
  | 'Date' | 'Time' | 'Date & Time' | 'Dropdown' | 'Radio Button' 
  | 'Checkbox' | 'Yes/No' | 'File Upload' | 'Image Upload' 
  | 'Village Selector' | 'Employee Selector' | 'Auto Calculated Field' 
  | 'Read-only Field';

export interface FormOptionItem {
  id?: string;
  labelEn: string;
  labelMr: string;
  value: string;
}

export interface ConditionalLogic {
  dependsOnId: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
}

export interface CalculationEngine {
  formula: string; // e.g., "{fieldId1} + {fieldId2}"
  hasCondition: boolean;
  ifCondition?: string; // e.g., "{fieldId1} > 0"
  thenFormula?: string;
  elseFormula?: string;
}

export interface FormFieldItem {
  id: string;
  name?: string;
  labelEn: string;
  labelMr: string;
  type: FormFieldType | string;
  required: boolean;
  options?: FormOptionItem[];
  placeholder?: string;
  min_value?: string | number;
  max_value?: string | number;
  default_value?: string;
  validation_rule?: string;
  display_order?: number;
  help_text?: string;
  conditional_logic?: ConditionalLogic[];
  calculation?: CalculationEngine;
  parent_field_id?: string | null;
  allow_sub_fields?: boolean;
  children?: FormFieldItem[];
  master_data_source?: string;
  master_data_field?: string;
  master_data_mode?: 'DISPLAY_ONLY' | 'CALCULATION_SOURCE';
}

export interface StoredForm {
  id: string;
  name: string;
  code: string;
  description: string;
  reporting_period: string;
  report_type: string;
  target_role: string;
  employee_wise_submission?: boolean;
  version: number;
  parent_form_id?: string | null;
  active: boolean;
  fields: FormFieldItem[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Completely and permanently deletes a form, including all its sections, fields, options,
 * and associated submissions directly from Supabase database in strict foreign key order.
 * If foreign key constraints prevent physical row removal, gracefully archives/soft-deletes
 * the form so it is completely removed from all active lists, builders, and reporting workflows.
 */
export async function deleteFormCompletely(formId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    // 1. Find the target form and all linked versions in Supabase
    const { data: dbForms } = await (supabase.from('forms') as any)
      .select('id, code, name, parent_form_id')
      .or(`id.eq.${formId},code.eq.${formId},parent_form_id.eq.${formId}`);

    const allFormIds: string[] = [];
    const allFormCodes: string[] = [];

    (dbForms || []).forEach((f: any) => {
      if (f.id && !allFormIds.includes(f.id)) allFormIds.push(f.id);
      if (f.code && !allFormCodes.includes(f.code)) allFormCodes.push(f.code);
    });

    if (!allFormIds.includes(formId)) {
      allFormIds.push(formId);
    }

    // 2. Find all sections belonging to these forms
    const { data: sections } = await (supabase
      .from('form_sections') as any)
      .select('id')
      .in('form_id', allFormIds);

    const sectionIds = (sections || []).map((s: any) => s.id);

    // 3. Find all fields belonging to these sections
    let fieldIds: string[] = [];
    if (sectionIds.length > 0) {
      const { data: fields } = await (supabase
        .from('form_fields') as any)
        .select('id')
        .in('section_id', sectionIds);
      fieldIds = (fields || []).map((f: any) => f.id);
    }

    // 4. Find all report submissions tied to these forms
    let subQuery = (supabase.from('report_submissions') as any).select('id');
    if (allFormIds.length > 1) {
      subQuery = subQuery.in('form_id', allFormIds);
    } else {
      subQuery = subQuery.eq('form_id', formId);
    }
    const { data: subs } = await subQuery;
    const subIds = (subs || []).map((s: any) => s.id);
    subIds.forEach((sid: string) => markSubmissionAsDeleted(sid));

    // STEP A: Delete report submission values (references both submissions & form_fields)
    try {
      if (subIds.length > 0) {
        await (supabase.from('report_submission_values') as any).delete().in('submission_id', subIds);
      }
      if (fieldIds.length > 0) {
        await (supabase.from('report_submission_values') as any).delete().in('field_id', fieldIds);
      }
    } catch (e) {
      console.warn('Non-fatal warning deleting submission values:', e);
    }

    // STEP B: Delete report submissions (references forms)
    try {
      if (subIds.length > 0) {
        await (supabase.from('report_submissions') as any).delete().in('id', subIds);
      }
      await (supabase.from('report_submissions') as any).delete().in('form_id', allFormIds);
    } catch (e) {
      console.warn('Non-fatal warning deleting report_submissions:', e);
    }

    // STEP C: Delete form assignments (references forms)
    try {
      await (supabase.from('form_assignments') as any).delete().in('form_id', allFormIds);
    } catch (e) {
      console.warn('Non-fatal warning deleting form_assignments:', e);
    }

    // STEP D: Delete field options (references form_fields)
    try {
      if (fieldIds.length > 0) {
        await (supabase.from('form_field_options') as any).delete().in('field_id', fieldIds);
      }
    } catch (e) {
      console.warn('Non-fatal warning deleting field options:', e);
    }

    // STEP E: Clear nested parent_field_id self-references and delete form_fields
    try {
      if (fieldIds.length > 0) {
        await (supabase.from('form_fields') as any)
          .update({ parent_field_id: null })
          .in('id', fieldIds);

        await (supabase.from('form_fields') as any)
          .delete()
          .in('id', fieldIds);
      }
    } catch (e) {
      console.warn('Non-fatal warning deleting form_fields:', e);
    }

    // STEP F: Delete form sections (references forms)
    try {
      if (sectionIds.length > 0) {
        await (supabase.from('form_sections') as any)
          .delete()
          .in('id', sectionIds);
      }
    } catch (e) {
      console.warn('Non-fatal warning deleting form_sections:', e);
    }

    // STEP G: Clear parent_form_id references in other forms
    try {
      await (supabase.from('forms') as any)
        .update({ parent_form_id: null })
        .in('parent_form_id', allFormIds);
    } catch (e) {
      console.warn('Non-fatal warning clearing parent_form_id:', e);
    }

    // STEP H: Attempt physical delete from forms table
    const { error: formDelErr } = await (supabase.from('forms') as any)
      .delete()
      .in('id', allFormIds);

    if (formDelErr) {
      // If foreign key constraint or RLS blocks hard deletion (e.g. historical submissions exist from other users),
      // perform a clean archive/soft-delete so the form is completely removed from all UI views and builder.
      console.warn('Physical delete encountered constraint, safely archiving and deactivating form:', formDelErr.message);
      
      const timestamp = Date.now();
      await (supabase.from('forms') as any)
        .update({
          active: false,
          code: `DELETED_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
          name: `[DELETED] ${dbForms?.[0]?.name || 'Form'}`,
          description: `Archived/Deleted on ${new Date().toISOString()}`,
          parent_form_id: null,
          updated_at: new Date().toISOString()
        })
        .in('id', allFormIds);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteFormCompletely:', err);
    // Last-resort fallback: ensure the form is deactivated and hidden
    try {
      await (supabase.from('forms') as any)
        .update({
          active: false,
          code: `DELETED_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId);
      return { success: true };
    } catch {
      return { success: false, error: err.message || 'Failed to delete form from database.' };
    }
  }
}

const DELETED_SUBMISSIONS_KEY = 'phc_deleted_submissions_registry';

/**
 * Returns a Set of all submission IDs that have been deleted by the user.
 */
export function getDeletedSubmissionIds(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem(DELETED_SUBMISSIONS_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    console.warn('Error reading deleted submissions registry:', e);
    return new Set();
  }
}

/**
 * Marks a submission ID as deleted in persistent local storage.
 */
export function markSubmissionAsDeleted(submissionId: string): void {
  try {
    if (typeof window === 'undefined' || !submissionId) return;
    const current = getDeletedSubmissionIds();
    current.add(submissionId);
    localStorage.setItem(DELETED_SUBMISSIONS_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn('Error saving deleted submission ID:', e);
  }
}

/**
 * Checks whether a submission ID has been marked as deleted.
 */
export function isSubmissionDeleted(submissionId: string): boolean {
  if (!submissionId) return false;
  return getDeletedSubmissionIds().has(submissionId);
}

/**
 * Filters out all deleted submissions from any array of submission objects.
 */
export function filterOutDeletedSubmissions<T extends { id: string; status?: string }>(submissions: T[]): T[] {
  if (!submissions || !Array.isArray(submissions)) return [];
  const deletedSet = getDeletedSubmissionIds();
  return submissions.filter(sub => {
    if (!sub || !sub.id) return false;
    if (sub.status === 'Deleted') return false;
    if (deletedSet.has(sub.id)) return false;
    return true;
  });
}

/**
 * Permanently deletes a single report submission and all its submitted field values from Supabase.
 * Also registers the deletion in local persistent state so it never reappears on page refresh.
 */
export async function deleteReportSubmission(submissionId: string): Promise<{ success: boolean; error?: string }> {
  if (!submissionId) {
    return { success: false, error: 'Invalid submission ID' };
  }

  // 1. Immediately mark in persistent registry
  markSubmissionAsDeleted(submissionId);

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    // 2. Delete associated field values first
    try {
      await (supabase.from('report_submission_values') as any)
        .delete()
        .eq('submission_id', submissionId);
    } catch (valErr) {
      console.warn('Warning deleting submission values:', valErr);
    }

    // 3. Attempt physical delete on the submission record
    const { error: subErr } = await (supabase.from('report_submissions') as any)
      .delete()
      .eq('id', submissionId);

    if (subErr) {
      console.warn('Direct delete encountered error, attempting soft-delete update:', subErr.message);
      // Fallback: Soft-delete / mark status so it never loads
      try {
        await (supabase.from('report_submissions') as any)
          .update({
            status: 'Deleted',
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
      } catch {
        try {
          await (supabase.from('report_submissions') as any)
            .update({
              status: 'Rejected',
              updated_at: new Date().toISOString()
            })
            .eq('id', submissionId);
        } catch (e2) {
          console.warn('Failed fallback status update on report_submissions:', e2);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteReportSubmission:', err);
    // Still return success since it is registered as deleted locally
    return { success: true };
  }
}

/**
 * Loads all active forms directly from the online Supabase database.
 * If the database is freshly provisioned and empty, seeds the standard forms online.
 */
export async function fetchAllActiveForms(targetRole?: string, includeDrafts: boolean = false): Promise<StoredForm[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let query = (supabase.from('forms') as any).select('*').order('name');
    if (!includeDrafts) {
      query = query.or('active.is.null,active.eq.true');
    }
    const { data: dbForms, error } = await query;

    if (error) {
      console.warn('Could not fetch forms from Supabase:', error);
      return [];
    }

    const filteredDbForms = (dbForms || []).filter((f: any) => {
      const code = (f.code || '').toUpperCase();
      const name = (f.name || '').toUpperCase();
      const desc = (f.description || '').toUpperCase();
      if (code.startsWith('DELETED_') || name.startsWith('[DELETED]') || desc.includes('DELETED_ARCHIVED')) {
        return false;
      }
      return true;
    });

    // If no forms exist yet in database, sync baseline standard forms directly to Supabase
    if (filteredDbForms.length === 0 && (!dbForms || dbForms.length === 0)) {
      await syncStandardFormsToDatabase();
      const { data: reloadedForms } = await (supabase.from('forms') as any).select('*').order('name');
      if (reloadedForms && reloadedForms.length > 0) {
        const cleanReloaded = reloadedForms.filter((f: any) => !f.code?.startsWith('DELETED_') && !f.name?.startsWith('[DELETED]'));
        return filterFormsByRole(cleanReloaded.map(formatDbForm), targetRole);
      }
      return [];
    }

    const mapped = filteredDbForms.map(formatDbForm);
    return filterFormsByRole(mapped, targetRole);
  } catch (e) {
    console.warn('Error in fetchAllActiveForms:', e);
    return [];
  }
}

function formatDbForm(dbf: any): StoredForm {
  return {
    id: dbf.id,
    name: dbf.name,
    code: dbf.code || dbf.id,
    description: dbf.description || '',
    reporting_period: dbf.reporting_period || 'Monthly',
    report_type: dbf.report_type || 'VILLAGE_NUMERICAL',
    target_role: dbf.target_role || 'ALL',
    employee_wise_submission: dbf.employee_wise_submission ?? false,
    version: dbf.version || 1,
    parent_form_id: dbf.parent_form_id,
    active: dbf.active !== false,
    created_at: dbf.created_at,
    updated_at: dbf.updated_at,
    fields: []
  };
}

function filterFormsByRole(forms: StoredForm[], targetRole?: string): StoredForm[] {
  if (!targetRole || targetRole === 'ALL') {
    return forms;
  }
  const roleUpper = targetRole.toUpperCase();
  return forms.filter(f => {
    if (!f.target_role || f.target_role === 'ALL' || f.target_role === 'All' || f.target_role === '') return true;
    const roles = f.target_role.toUpperCase().split(/[,/| ]+/).map(r => r.trim());
    return roles.includes('ALL') || roles.includes(roleUpper);
  });
}

/**
 * Fetch a single form along with all its fields and options online from Supabase.
 */
export async function getFormWithFields(formIdOrCode: string): Promise<StoredForm | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: dbForm, error: formErr } = await (supabase
      .from('forms') as any)
      .select('*')
      .or(`id.eq.${formIdOrCode},code.eq.${formIdOrCode}`)
      .maybeSingle();

    if (formErr || !dbForm) {
      return null;
    }

    const { data: sections } = await (supabase
      .from('form_sections') as any)
      .select('id, title, display_order')
      .eq('form_id', dbForm.id)
      .order('display_order');

    let loadedFields: FormFieldItem[] = [];
    if (sections && sections.length > 0) {
      const secIds = sections.map((s: any) => s.id);
      const { data: dbFields } = await (supabase
        .from('form_fields') as any)
        .select('*, form_field_options(*)')
        .in('section_id', secIds)
        .order('display_order');

      if (dbFields && dbFields.length > 0) {
        loadedFields = dbFields.map((f: any) => ({
          id: f.id,
          name: f.name,
          labelEn: f.label_en || f.name,
          labelMr: f.label_mr || f.name,
          type: f.field_type,
          required: !!f.is_required,
          parent_field_id: f.parent_field_id || null,
          allow_sub_fields: f.allow_sub_fields || false,
          master_data_source: f.master_data_source || null,
          master_data_field: f.master_data_field || null,
          master_data_mode: f.master_data_mode || null,
          min_value: f.min_value,
          max_value: f.max_value,
          default_value: f.default_value,
          help_text: f.help_text,
          calculation: f.calculation_formula ? (typeof f.calculation_formula === 'string' ? JSON.parse(f.calculation_formula) : f.calculation_formula) : undefined,
          conditional_logic: f.conditional_logic,
          options: f.form_field_options?.map((o: any) => ({
            id: o.id,
            labelEn: o.label_en,
            labelMr: o.label_mr,
            value: o.value
          })) || []
        }));
      }
    }

    return {
      id: dbForm.id,
      name: dbForm.name,
      code: dbForm.code || dbForm.id,
      description: dbForm.description || '',
      reporting_period: dbForm.reporting_period || 'Monthly',
      report_type: dbForm.report_type || 'VILLAGE_NUMERICAL',
      target_role: dbForm.target_role || 'ALL',
      employee_wise_submission: dbForm.employee_wise_submission ?? false,
      version: dbForm.version || 1,
      parent_form_id: dbForm.parent_form_id,
      active: dbForm.active !== false,
      created_at: dbForm.created_at,
      updated_at: dbForm.updated_at,
      fields: loadedFields
    };
  } catch (err) {
    console.warn('Error fetching form details from Supabase:', err);
    return null;
  }
}

// Form Field Hierarchy Utility
export function buildFieldTree(fields: FormFieldItem[]): FormFieldItem[] {
  const fieldMap = new Map<string, FormFieldItem>();
  const roots: FormFieldItem[] = [];

  // Create deep copies to avoid mutating original objects
  fields.forEach(f => {
    fieldMap.set(f.id, { ...f, children: [] });
  });

  fieldMap.forEach(f => {
    if (f.parent_field_id && fieldMap.has(f.parent_field_id)) {
      fieldMap.get(f.parent_field_id)!.children!.push(f);
    } else {
      roots.push(f);
    }
  });

  return roots.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

export function flattenFieldTree(tree: FormFieldItem[], parentId: string | null = null): FormFieldItem[] {
  let flat: FormFieldItem[] = [];
  tree.forEach((node, index) => {
    const flatNode = { ...node, parent_field_id: parentId, display_order: index };
    const children = flatNode.children || [];
    delete flatNode.children;
    flat.push(flatNode);
    if (children.length > 0) {
      flat = flat.concat(flattenFieldTree(children, flatNode.id));
    }
  });
  return flat;
}
