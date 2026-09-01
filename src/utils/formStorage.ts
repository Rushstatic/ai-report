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
 * and associated submissions directly from Supabase database.
 */
export async function deleteFormCompletely(formId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    // 1. Find the target form in Supabase to get its exact ID and code
    const { data: dbForm } = await (supabase.from('forms') as any)
      .select('id, code')
      .or(`id.eq.${formId},code.eq.${formId}`)
      .maybeSingle();

    const actualFormId = dbForm?.id || formId;
    const actualFormCode = dbForm?.code;

    // 2. Find all sections belonging to this form
    const { data: sections } = await (supabase
      .from('form_sections') as any)
      .select('id')
      .eq('form_id', actualFormId);

    const sectionIds = (sections || []).map((s: any) => s.id);

    if (sectionIds.length > 0) {
      // Find all fields belonging to these sections
      const { data: fields } = await (supabase
        .from('form_fields') as any)
        .select('id')
        .in('section_id', sectionIds);

      const fieldIds = (fields || []).map((f: any) => f.id);

      if (fieldIds.length > 0) {
        // Delete options
        await (supabase.from('form_field_options') as any).delete().in('field_id', fieldIds);
        // Delete fields
        await (supabase.from('form_fields') as any).delete().in('id', fieldIds);
      }

      // Delete sections
      await (supabase.from('form_sections') as any).delete().in('id', sectionIds);
    }

    // 3. Delete report submissions and values tied to this form
    let subQuery = (supabase.from('report_submissions') as any).select('id');
    if (actualFormCode && actualFormCode !== actualFormId) {
      subQuery = subQuery.or(`form_id.eq.${actualFormId},form_id.eq.${actualFormCode}`);
    } else {
      subQuery = subQuery.eq('form_id', actualFormId);
    }
    const { data: subs } = await subQuery;

    const subIds = (subs || []).map((s: any) => s.id);
    if (subIds.length > 0) {
      await (supabase.from('report_submission_values') as any).delete().in('submission_id', subIds);
      await (supabase.from('report_submissions') as any).delete().in('id', subIds);
    }

    // 4. Delete the form record from forms table
    const { error: formDelErr } = await (supabase.from('forms') as any)
      .delete()
      .eq('id', actualFormId);

    if (formDelErr) {
      throw formDelErr;
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteFormCompletely:', err);
    return { success: false, error: err.message || 'Failed to delete form from database.' };
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

    // If no forms exist yet in database, sync baseline standard forms directly to Supabase
    if (!dbForms || dbForms.length === 0) {
      await syncStandardFormsToDatabase();
      const { data: reloadedForms } = await (supabase.from('forms') as any).select('*').order('name');
      if (reloadedForms && reloadedForms.length > 0) {
        return filterFormsByRole(reloadedForms.map(formatDbForm), targetRole);
      }
      return [];
    }

    const mapped = dbForms.map(formatDbForm);
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
