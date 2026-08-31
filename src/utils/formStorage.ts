import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { STANDARD_FORMS, StandardFormDefinition } from './syncForms';

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
  is_local?: boolean;
}

const LOCAL_FORMS_KEY = 'health_portal_custom_forms_v1';

export function getLocalForms(): StoredForm[] {
  try {
    const raw = localStorage.getItem(LOCAL_FORMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading local forms:', err);
    return [];
  }
}

export function saveLocalForm(form: StoredForm): void {
  try {
    const existing = getLocalForms();
    const idx = existing.findIndex(f => f.id === form.id || f.code === form.code);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...form, updated_at: new Date().toISOString() };
    } else {
      existing.unshift({ ...form, is_local: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Error saving local form:', err);
  }
}

export function deleteLocalForm(formId: string): void {
  try {
    const existing = getLocalForms();
    const filtered = existing.filter(f => f.id !== formId && f.code !== formId);
    localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error deleting local form:', err);
  }
}

/**
 * Loads all active forms by combining database forms, local storage forms, and standard definitions
 */
export async function fetchAllActiveForms(targetRole?: string, includeDrafts: boolean = false): Promise<StoredForm[]> {
  const combinedMap = new Map<string, StoredForm>();

  // 1. Add standard forms as baseline
  for (const sf of STANDARD_FORMS) {
    const fields: FormFieldItem[] = [];
    sf.sections.forEach(sec => {
      sec.fields.forEach((f, fIdx) => {
        fields.push({
          id: `${sf.id}_f_${fIdx}`,
          name: f.name,
          labelEn: f.label_en,
          labelMr: f.label_mr,
          type: f.field_type,
          required: f.is_required,
          options: f.options?.map(o => ({ labelEn: o.label_en, labelMr: o.label_mr, value: o.value })) || []
        });
      });
    });

    combinedMap.set(sf.id, {
      id: sf.id,
      name: sf.name,
      code: sf.code,
      description: sf.description,
      reporting_period: sf.reporting_period,
      report_type: sf.report_type,
      target_role: sf.target_role,
      employee_wise_submission: sf.employee_wise_submission ?? false,
      version: 1,
      active: true,
      fields
    });
  }

  // 2. Fetch from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      let query = (supabase.from('forms') as any).select('*').order('name');
      if (!includeDrafts) {
        query = query.or('active.is.null,active.eq.true');
      }
      const { data: dbForms, error } = await query;

      if (!error && dbForms && dbForms.length > 0) {
        for (const dbf of dbForms) {
          combinedMap.set(dbf.id, {
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
            fields: [] // fields will be loaded on demand or cached
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch forms from Supabase:', e);
    }
  }

  // 3. Merge locally created/published forms (overrides baseline if newer)
  const localForms = getLocalForms();
  for (const lf of localForms) {
    if (includeDrafts || lf.active !== false) {
      combinedMap.set(lf.id, lf);
    }
  }

  // Filter by role if specified
  const allForms = Array.from(combinedMap.values());
  if (!targetRole || targetRole === 'ALL') {
    return allForms;
  }

  const roleUpper = targetRole.toUpperCase();
  return allForms.filter(f => {
    if (!f.target_role || f.target_role === 'ALL' || f.target_role === 'All' || f.target_role === '') return true;
    const roles = f.target_role.toUpperCase().split(/[,/| ]+/).map(r => r.trim());
    return roles.includes('ALL') || roles.includes(roleUpper);
  });
}

/**
 * Fetch a single form along with all its fields and options
 */
export async function getFormWithFields(formIdOrCode: string): Promise<StoredForm | null> {
  // Check local forms first
  const localForms = getLocalForms();
  const localMatch = localForms.find(f => f.id === formIdOrCode || f.code === formIdOrCode);
  if (localMatch && localMatch.fields && localMatch.fields.length > 0) {
    return localMatch;
  }

  // Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data: dbForm } = await (supabase
        .from('forms') as any)
        .select('*')
        .or(`id.eq.${formIdOrCode},code.eq.${formIdOrCode}`)
        .maybeSingle();

      if (dbForm) {
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
              calculation: f.calculation_formula ? JSON.parse(f.calculation_formula) : undefined,
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

        if (loadedFields.length > 0) {
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
            fields: loadedFields
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching form details from Supabase:', err);
    }
  }

  // Fallback to standard definitions
  const stdMatch = STANDARD_FORMS.find(f => f.id === formIdOrCode || f.code === formIdOrCode);
  if (stdMatch) {
    const fields: FormFieldItem[] = [];
    stdMatch.sections.forEach(sec => {
      sec.fields.forEach((f, fIdx) => {
        fields.push({
          id: `${stdMatch.id}_f_${fIdx}`,
          name: f.name,
          labelEn: f.label_en,
          labelMr: f.label_mr,
          type: f.field_type,
          required: f.is_required,
          options: f.options?.map(o => ({ labelEn: o.label_en, labelMr: o.label_mr, value: o.value })) || []
        });
      });
    });

    return {
      id: stdMatch.id,
      name: stdMatch.name,
      code: stdMatch.code,
      description: stdMatch.description,
      reporting_period: stdMatch.reporting_period,
      report_type: stdMatch.report_type,
      target_role: stdMatch.target_role,
      employee_wise_submission: stdMatch.employee_wise_submission ?? false,
      version: 1,
      active: true,
      fields
    };
  }

  return localMatch || null;
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
