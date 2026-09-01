import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Calendar, 
  Building2, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  UserCheck,
  Download,
  Layers,
  Sparkles,
  Calculator,
  Loader2,
  Database,
  Cloud,
  Check
} from 'lucide-react';
import ReportDownloadModal from '@/components/ReportDownloadModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/languageStore';
import { syncStandardFormsToDatabase } from '@/utils/syncForms';
import { getFormWithFields, filterOutDeletedSubmissions } from '@/utils/formStorage';

type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No' | 'Auto Calculated Field' | 'Read-only Field' | 'Master Data Field';

interface FormField {
  id: string;
  name: string;
  label_en: string;
  label_mr: string;
  field_type: FieldType | string;
  is_required: boolean;
  allow_sub_fields?: boolean;
  options?: { id: string; label_en: string; label_mr: string; value: string }[];
  master_data_source?: string;
  master_data_field?: string;
  master_data_mode?: string;
  calculation_formula?: string;
  parent_field_id?: string | null;
  children?: FormField[];
}

interface FormDefinition {
  id: string;
  name: string;
  code?: string;
  description: string;
  reporting_period: string;
  report_type?: string;
  target_role?: string;
  employee_wise_submission?: boolean;
  fields: FormField[];
}

interface Village {
  id: string;
  name: string;
  code?: string;
  population?: number;
  house_count?: number;
}

export default function ReportSubmission() {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { language } = useLanguageStore();

  const isEditMode = !!submissionId;

  const [form, setForm] = useState<FormDefinition | null>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [employeesList, setEmployeesList] = useState<Array<{ id: string; name: string; designation?: string }>>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [existingSubmissions, setExistingSubmissions] = useState<any[]>([]);
  
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(submissionId || null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Auto-save State for Supabase
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Set default period (Current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setPeriodStart(firstDay);
    setPeriodEnd(lastDay);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!formId && !submissionId) return;
      setLoading(true);
      setError(null);

      try {
        let activeFormId = formId;

        // If editing an existing submission, get its form_id first
        if (submissionId) {
          const { data: subRec, error: subRecErr } = await (supabase
            .from('report_submissions') as any)
            .select('form_id')
            .eq('id', submissionId)
            .single();

          if (subRecErr) throw subRecErr;
          if (subRec?.form_id) {
            activeFormId = subRec.form_id;
          }
        }

        if (!activeFormId) {
          setError('No form identifier provided.');
          setLoading(false);
          return;
        }

        // 1. Fetch form definition and its fields
        let formObj: any = await getFormWithFields(activeFormId);

        // If form or its fields are not present, try standard sync
        if (!formObj || !formObj.fields || formObj.fields.length === 0) {
          await syncStandardFormsToDatabase();
          formObj = await getFormWithFields(activeFormId);
        }

        if (!formObj) {
          setError('The requested form was not found or has been removed.');
          setLoading(false);
          return;
        }

        // Map FormFieldItem to FormField
        const mappedFields: FormField[] = (formObj.fields || []).map((f: any) => ({
          id: f.id,
          name: f.name || f.id,
          label_en: f.labelEn || f.label_en || f.name,
          label_mr: f.labelMr || f.label_mr || f.name,
          field_type: (f.type || f.field_type || 'Text') as FieldType,
          is_required: f.required !== undefined ? !!f.required : !!f.is_required,
          allow_sub_fields: !!(f.allow_sub_fields || f.allowSubFields || f.type === 'Group Header' || f.field_type === 'Group Header'),
          parent_field_id: f.parent_field_id || f.parentFieldId || null,
          options: (f.options || []).map((o: any) => ({
            id: o.id || o.value,
            label_en: o.labelEn || o.label_en || o.value,
            label_mr: o.labelMr || o.label_mr || o.value,
            value: o.value
          }))
        }));

        setForm({
          id: formObj.id,
          name: formObj.name,
          code: formObj.code,
          description: formObj.description || '',
          reporting_period: formObj.reporting_period || 'Monthly',
          report_type: formObj.report_type,
          target_role: formObj.target_role,
          employee_wise_submission: formObj.employee_wise_submission ?? false,
          fields: mappedFields
        });

        // 2. Fetch live Villages for Employee's Sub-centre
        if (employee?.sub_centre_id) {
          const { data: vData } = await (supabase
            .from('villages') as any)
            .select('id, name, code, population, house_count')
            .eq('sub_centre_id', employee.sub_centre_id)
            .order('name');

          if (vData && vData.length > 0) {
            setVillages(vData);
            setSelectedVillageId(vData[0].id);
          } else {
            setVillages([]);
            setSelectedVillageId('');
          }

          // Fetch existing submissions for this sub-centre and form
          const { data: subRecs } = await (supabase
            .from('report_submissions') as any)
            .select('id, village_id, period_start, period_end, status, submitted_at, employee_id')
            .or(`form_id.eq.${activeFormId},form_id.eq.${formObj?.code || activeFormId}`)
            .eq('sub_centre_id', employee.sub_centre_id);

          if (subRecs) {
            setExistingSubmissions(filterOutDeletedSubmissions(subRecs));
          }
        } else {
          // Controller or General user
          const { data: vData } = await (supabase.from('villages') as any).select('id, name, code, population, house_count').limit(100);
          if (vData && vData.length > 0) {
            setVillages(vData);
            setSelectedVillageId(vData[0].id);
          } else {
            setVillages([]);
            setSelectedVillageId('');
          }
        }

        // Fetch employees list for Employee Selector fields
        const { data: empData } = await (supabase.from('employees') as any).select('id, name, designation').order('name');
        if (empData) {
          setEmployeesList(empData);
        }

        // 3. If Edit Mode, fetch live submission record and values
        if (submissionId) {
          const { data: subData, error: subDataErr } = await (supabase
            .from('report_submissions') as any)
            .select('*, report_submission_values(*)')
            .eq('id', submissionId)
            .single();

          if (subDataErr) throw subDataErr;

          if (subData) {
            setActiveSubmissionId(subData.id);
            if (subData.village_id) setSelectedVillageId(subData.village_id);
            if (subData.period_start) setPeriodStart(subData.period_start);
            if (subData.period_end) setPeriodEnd(subData.period_end);

            const initialVals: Record<string, any> = {};
            if (subData.report_submission_values) {
              subData.report_submission_values.forEach((valRow: any) => {
                if (valRow.value_numeric !== null && valRow.value_numeric !== undefined) {
                  initialVals[valRow.field_id] = valRow.value_numeric;
                } else if (valRow.value_boolean !== null && valRow.value_boolean !== undefined) {
                  initialVals[valRow.field_id] = valRow.value_boolean ? 'yes' : 'no';
                } else if (valRow.value_date) {
                  initialVals[valRow.field_id] = valRow.value_date;
                } else {
                  initialVals[valRow.field_id] = valRow.value_text || '';
                }
              });
            }
            setFormData(initialVals);
          }
        }
      } catch (err: any) {
        console.error('Error loading form data:', err);
        setError(err.message || 'Error loading live form data.');
      } finally {
        setLoading(false);
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 800);
      }
    }

    loadData();
  }, [formId, submissionId, employee]);

  
  // Check submissions for the selected period
  const periodMatchingSubs = existingSubmissions.filter(sub => {
    if (isEditMode && sub.id === submissionId) return false;
    const isSamePeriod = !periodStart || sub.period_start === periodStart;
    const isActiveStatus = sub.status === 'Submitted' || sub.status === 'Approved';
    return isSamePeriod && isActiveStatus;
  });

  // Determine submitted village IDs according to submission condition
  const submittedVillageIds = new Set<string>();
  const submittedVillageDetails: Array<{ id: string; name: string; submittedAt?: string; status: string }> = [];

  periodMatchingSubs.forEach(sub => {
    if (form?.employee_wise_submission) {
      if (sub.employee_id === employee?.id && sub.village_id) {
        submittedVillageIds.add(sub.village_id);
        const vObj = villages.find(v => v.id === sub.village_id);
        if (vObj && !submittedVillageDetails.some(d => d.id === vObj.id)) {
          submittedVillageDetails.push({ id: vObj.id, name: vObj.name, submittedAt: sub.submitted_at, status: sub.status });
        }
      }
    } else {
      if (sub.village_id) {
        submittedVillageIds.add(sub.village_id);
        const vObj = villages.find(v => v.id === sub.village_id);
        if (vObj && !submittedVillageDetails.some(d => d.id === vObj.id)) {
          submittedVillageDetails.push({ id: vObj.id, name: vObj.name, submittedAt: sub.submitted_at, status: sub.status });
        }
      }
    }
  });

  // Non-list forms hide submitted villages for specific conditions/period
  const isNonListVillageForm = form?.report_type !== 'LIST' && form?.report_type !== 'SUBCENTRE_LEVEL';
  const availableVillages = isEditMode || !isNonListVillageForm
    ? villages
    : villages.filter(v => !submittedVillageIds.has(v.id));

  // Sub-centre level report duplicate check
  const isSubCentreLevelAlreadySubmitted = !isEditMode && form?.report_type === 'SUBCENTRE_LEVEL' && periodMatchingSubs.some(sub => 
    form.employee_wise_submission ? sub.employee_id === employee?.id : true
  );

  // All villages submitted check
  const isAllVillagesAlreadySubmitted = !isEditMode && isNonListVillageForm && villages.length > 0 && availableVillages.length === 0;

  // Auto-switch selected village if current selection is not available
  useEffect(() => {
    if (isEditMode) return;
    if (isNonListVillageForm && availableVillages.length > 0) {
      if (!selectedVillageId || !availableVillages.some(v => v.id === selectedVillageId)) {
        setSelectedVillageId(availableVillages[0].id);
      }
    }
  }, [availableVillages, isNonListVillageForm, isEditMode, selectedVillageId]);

  // Auto-populate Master Data when village is selected or changed
  useEffect(() => {
    if (!form || !form.fields || !villages.length || !selectedVillageId) return;

    const v = villages.find(x => x.id === selectedVillageId);
    if (v) {
      let hasChanges = false;
      const newData = { ...formData };
      
      form.fields.forEach(f => {
        if (f.field_type === 'Master Data Field' && f.master_data_source === 'VILLAGE_MASTER') {
          let expectedVal: any = '';
          if (f.master_data_field === 'Population') expectedVal = (v as any).population || 0;
          if (f.master_data_field === 'House Count') expectedVal = (v as any).house_count || 0;
          if (f.master_data_field === 'Village Name') expectedVal = v.name;
          if (f.master_data_field === 'Village Code') expectedVal = v.code || '';
          
          if (newData[f.id] !== expectedVal) {
            newData[f.id] = expectedVal;
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        setFormData(newData);
      }
    }
  }, [selectedVillageId, form, villages]);

  const handleVillageChange = (vId: string) => {
    setSelectedVillageId(vId);
    if (!form || !form.fields) return;
    
    const v = villages.find(x => x.id === vId);
    if (v) {
      const newData = { ...formData };
      form.fields.forEach(f => {
        if (f.field_type === 'Master Data Field' && f.master_data_source === 'VILLAGE_MASTER') {
          if (f.master_data_field === 'Population') newData[f.id] = (v as any).population || 0;
          if (f.master_data_field === 'House Count') newData[f.id] = (v as any).house_count || 0;
          if (f.master_data_field === 'Village Name') newData[f.id] = v.name;
          if (f.master_data_field === 'Village Code') newData[f.id] = v.code || '';
        }
      });
      setFormData(newData);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // ----------------------------------------------------
  // Core Save to Supabase (Used by Submit, Save Draft & Auto-Save)
  // ----------------------------------------------------
  const executeSaveToSupabase = useCallback(async (
    status: 'Draft' | 'Submitted',
    isAutoSave: boolean = false
  ): Promise<{ success: boolean; subId?: string; error?: string }> => {
    if (!form || !employee?.id) {
      return { success: false, error: 'Employee or form not loaded' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      if (isAutoSave) {
        setAutoSaveStatus('saving');
      } else {
        setSubmitting(true);
        setError(null);
      }

      let subId = activeSubmissionId || submissionId;
      const villageIdToSave = form.report_type === 'SUBCENTRE_LEVEL' ? null : (selectedVillageId || null);

      if (subId) {
        // Update existing report submission in Supabase
        const updatePayload: any = {
          village_id: villageIdToSave,
          sub_centre_id: employee.sub_centre_id || null,
          period_start: periodStart,
          period_end: periodEnd,
          status: status,
          updated_at: new Date().toISOString()
        };

        if (status === 'Submitted') {
          updatePayload.submitted_at = new Date().toISOString();
        }

        const { error: updateErr } = await (supabase
          .from('report_submissions') as any)
          .update(updatePayload)
          .eq('id', subId);

        if (updateErr) throw updateErr;

        // Delete old values and re-insert fresh values
        await (supabase.from('report_submission_values') as any).delete().eq('submission_id', subId);
      } else {
        // Insert new report submission into Supabase
        const insertPayload: any = {
          form_id: form.id,
          employee_id: employee.id,
          village_id: villageIdToSave,
          sub_centre_id: employee.sub_centre_id || null,
          period_start: periodStart,
          period_end: periodEnd,
          status: status,
          submitted_at: status === 'Submitted' ? new Date().toISOString() : null,
          created_at: new Date().toISOString()
        };

        const { data: newSub, error: insertErr } = await (supabase
          .from('report_submissions') as any)
          .insert(insertPayload)
          .select()
          .single();

        if (insertErr) throw insertErr;
        subId = newSub.id;
        setActiveSubmissionId(newSub.id);
      }

      // Insert field values into report_submission_values table (excluding pure Group Headers)
      if (subId && form.fields && form.fields.length > 0) {
        const leafFields = form.fields.filter(f => {
          const isGroup = f.allow_sub_fields || f.field_type === 'Group Header';
          return !isGroup;
        });

        const valuesToInsert = leafFields.map(f => {
          const rawVal = formData[f.id];
          return {
            submission_id: subId,
            field_id: f.id,
            value_text: typeof rawVal === 'string' ? rawVal : (rawVal !== undefined && rawVal !== null ? String(rawVal) : null),
            value_numeric: (f.field_type === 'Number' || f.field_type === 'Decimal') && rawVal !== undefined && rawVal !== '' ? Number(rawVal) : null,
            value_boolean: f.field_type === 'Yes/No' ? rawVal === 'yes' : null,
            value_date: (f.field_type === 'Date' || f.field_type === 'Date & Time') && rawVal ? rawVal : null
          };
        });

        if (valuesToInsert.length > 0) {
          const { error: valsErr } = await (supabase.from('report_submission_values') as any).insert(valuesToInsert);
          if (valsErr) throw valsErr;
        }
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowStr);

      if (isAutoSave) {
        setAutoSaveStatus('saved');
      } else {
        // Exact explicit confirmation message
        const msg = language === 'mr' 
          ? 'डेटा Supabase मध्ये यशस्वीरीत्या जतन झाला आहे!' 
          : 'Data saved successfully in Supabase';
        setSuccessMsg(msg);
        setShowToast(true);
        setAutoSaveStatus('saved');

        // Auto hide toast after 4s
        setTimeout(() => setShowToast(false), 4000);

        // If submitted, navigate to my reports after visual confirmation
        if (status === 'Submitted') {
          setTimeout(() => {
            navigate('/reports/my');
          }, 1500);
        }
      }

      return { success: true, subId };
    } catch (err: any) {
      console.error('Supabase Save error:', err);
      if (isAutoSave) {
        setAutoSaveStatus('error');
      } else {
        setError(err.message || 'Failed to save data to Supabase.');
      }
      return { success: false, error: err.message };
    } finally {
      if (!isAutoSave) {
        setSubmitting(false);
      }
    }
  }, [form, employee, activeSubmissionId, submissionId, selectedVillageId, periodStart, periodEnd, formData, language, navigate]);

  // ----------------------------------------------------
  // Automatic Background Save to Supabase (Debounced)
  // ----------------------------------------------------
  useEffect(() => {
    if (isInitialLoadRef.current || !form || !employee?.id) return;

    // Check if form has any entered values
    const hasValues = Object.keys(formData).length > 0 && 
      Object.values(formData).some(v => v !== '' && v !== null && v !== undefined);

    if (!hasValues) return;

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set debounced auto-save (1200ms after user stops typing)
    autoSaveTimerRef.current = setTimeout(() => {
      executeSaveToSupabase('Draft', true);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, form, employee, executeSaveToSupabase]);

  // ----------------------------------------------------
  // Manual Save / Submit Handler
  // ----------------------------------------------------
  const saveReport = async (status: 'Draft' | 'Submitted') => {
    if (!form || !employee?.id) {
      setError('Employee profile or form not available.');
      return;
    }

    // Validate required fields if submitting
    if (status === 'Submitted') {
      for (const field of form.fields) {
        const isGroup = field.allow_sub_fields || field.field_type === 'Group Header';
        if (!isGroup && field.is_required && (formData[field.id] === undefined || formData[field.id] === '')) {
          setError(`Please fill in required field: ${language === 'mr' ? field.label_mr : field.label_en}`);
          return;
        }
      }
    }

    // Clear any pending autosave timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    await executeSaveToSupabase(status, false);
  };

  // Auto-calculation Engine
  useEffect(() => {
    if (!form || !form.fields) return;

    let hasChanges = false;
    const newData = { ...formData };

    form.fields.filter(f => f.field_type === 'Auto Calculated Field' && f.calculation_formula).forEach(calcField => {
      try {
        const calcObj = JSON.parse(calcField.calculation_formula!);
        if (!calcObj.formula) return;
        
        let formulaStr = calcObj.formula;
        let canEvaluate = true;

        // Replace all {field_name} with actual values
        const matches = formulaStr.match(/\{([^}]+)\}/g);
        if (matches) {
          matches.forEach((m: string) => {
            const fieldName = m.slice(1, -1);
            // Find the field with this label
            const sourceField = form.fields.find(f => (f.label_en || f.label_mr) === fieldName || f.id === fieldName);
            if (sourceField) {
              const val = newData[sourceField.id];
              if (val === undefined || val === '') {
                canEvaluate = false; // Missing data
              } else {
                formulaStr = formulaStr.replace(m, String(val));
              }
            } else {
              canEvaluate = false;
            }
          });
        }

        if (canEvaluate) {
          // Replace SUM( ) and AVG( ) safely if they exist
          formulaStr = formulaStr.replace(/SUM\(\s*\)/g, '0'); // Placeholder if SUM isn't fully implemented
          formulaStr = formulaStr.replace(/AVG\(\s*\)/g, '0');
          
          // Evaluate safely
          // eslint-disable-next-line no-new-func
          const result = new Function('return ' + formulaStr)();
          
          if (!isNaN(result) && result !== Infinity && result !== -Infinity) {
            const finalVal = Number.isInteger(result) ? result : Number(result.toFixed(2));
            if (newData[calcField.id] !== finalVal) {
              newData[calcField.id] = finalVal;
              hasChanges = true;
            }
          }
        } else {
          if (newData[calcField.id] !== '') {
            newData[calcField.id] = '';
            hasChanges = true;
          }
        }
      } catch (err) {
        console.error('Calculation error for', calcField.label_en, err);
      }
    });

    if (hasChanges) {
      setFormData(newData);
    }
  }, [formData, form]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        {language === 'mr' ? 'अहवाल लोड होत आहे...' : 'Loading report form...'}
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-8 text-center text-red-600 bg-white rounded-xl border border-red-200">
        {language === 'mr' ? 'अहवाल सापडला नाही.' : 'Form not found.'}
      </div>
    );
  }


  // ----------------------------------------------------
  // Tree building for multi-level fields
  // ----------------------------------------------------
  const buildFieldTree = (fields: FormField[]): FormField[] => {
    const fieldMap = new Map<string, FormField>();
    const roots: FormField[] = [];

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

    return roots;
  };

  const renderReportFieldNode = (field: FormField, depth: number = 0, subIndex?: string): React.ReactNode => {
    const hasChildren = field.children && field.children.length > 0;
    const isGroupHeader = field.allow_sub_fields || field.field_type === 'Group Header' || hasChildren;

    if (isGroupHeader) {
      return (
        <div 
          key={field.id} 
          className={`my-5 rounded-xl border-2 overflow-hidden shadow-xs transition-all ${
            depth > 0 
              ? 'ml-2 sm:ml-6 border-indigo-200 bg-indigo-50/20' 
              : 'border-blue-200/90 bg-slate-50/50'
          }`}
        >
          {/* Shaded Group Header */}
          <div className="bg-gradient-to-r from-slate-100 via-slate-100 to-blue-50/60 px-4 py-3.5 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  {language === 'mr' ? field.label_mr || field.label_en : field.label_en || field.label_mr}
                  <span className="text-slate-500 font-normal text-xs">
                    ({language === 'mr' ? field.label_en : field.label_mr})
                  </span>
                </h3>
                {hasChildren ? (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'mr' ? 'खालील सर्व उप-प्रश्नांची माहिती भरा' : 'Fill all nested subfield indicators below'}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'mr' ? 'विभागाचे मुख्य शीर्षक (गट)' : 'Main Category Section Header'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                📁 {language === 'mr' ? 'मुख्य गट' : 'Group Header'}
              </span>
              {hasChildren && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                  {field.children!.length} {language === 'mr' ? 'उप-प्रश्न' : 'Subfields'}
                </span>
              )}
            </div>
          </div>

          {/* Shaded Content Container with isolated child cards */}
          {hasChildren && (
            <div className="p-4 sm:p-5 space-y-3.5 bg-slate-50/30">
              <div className="grid grid-cols-1 gap-3.5">
                {field.children!.map((child, childIdx) => (
                  <div 
                    key={child.id} 
                    className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all"
                  >
                    {renderReportFieldNode(child, depth + 1, `${childIdx + 1}`)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    const isLeafInStandalone = depth === 0;

    const content = (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <label htmlFor={field.id} className="block text-sm font-semibold text-slate-800 leading-snug">
            {subIndex && (
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-blue-50 text-blue-700 text-xs font-bold mr-2 border border-blue-200">
                ↳ {subIndex}
              </span>
            )}
            {language === 'mr' ? field.label_mr || field.label_en : field.label_en || field.label_mr}
            <span className="text-slate-400 font-normal ml-1.5 text-xs">
              ({language === 'mr' ? field.label_en : field.label_mr})
            </span>
            {field.is_required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>

          {field.field_type === 'Auto Calculated Field' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
              <Calculator className="w-3 h-3" />
              {language === 'mr' ? 'स्वयंचलित गणना' : 'Calculated'}
            </span>
          )}

          {field.field_type === 'Master Data Field' && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">
              {language === 'mr' ? 'मास्टर डेटा' : 'Master Data'}
            </span>
          )}
        </div>

        {(field.field_type === 'Master Data Field' || field.field_type === 'Auto Calculated Field' || field.field_type === 'Read-only Field') && (
          <div className={`w-full px-3.5 py-2.5 border rounded-lg text-sm ${
            field.field_type === 'Master Data Field' 
              ? 'border-purple-200 text-purple-900 bg-purple-50/80 font-semibold' 
              : field.field_type === 'Auto Calculated Field'
              ? 'border-amber-200 text-amber-900 bg-amber-50/80 font-bold font-mono text-base'
              : 'border-slate-200 text-slate-600 bg-slate-100'
          }`}>
            {formData[field.id] !== undefined && formData[field.id] !== '' 
              ? formData[field.id] 
              : (field.field_type === 'Master Data Field' ? (language === 'mr' ? 'आपोआप भरले जाईल' : 'Auto-populated') : '-')}
          </div>
        )}

        {(field.field_type === 'Number' || field.field_type === 'Decimal') && (
          <input
            type="number"
            step={field.field_type === 'Decimal' ? '0.01' : '1'}
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="0"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        )}

        {(field.field_type === 'Text' || field.field_type === 'Mobile Number') && (
          <input
            type={field.field_type === 'Mobile Number' ? 'tel' : 'text'}
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.field_type === 'Mobile Number' ? '10-digit mobile number' : (language === 'mr' ? 'माहिती प्रविष्ट करा...' : 'Enter details...')}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        )}

        {field.field_type === 'Long Text' && (
          <textarea
            id={field.id}
            required={field.is_required}
            rows={3}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={language === 'mr' ? 'सविस्तर माहिती प्रविष्ट करा...' : 'Enter detailed description...'}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        )}

        {field.field_type === 'Date' && (
          <input
            type="date"
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        )}

        {field.field_type === 'Time' && (
          <input
            type="time"
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        )}

        {field.field_type === 'Date & Time' && (
          <input
            type="datetime-local"
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        )}

        {field.field_type === 'Yes/No' && (
          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                checked={formData[field.id] === 'yes'}
                onChange={() => handleInputChange(field.id, 'yes')}
                className="text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
              />
              <span>{language === 'mr' ? 'होय (Yes)' : 'Yes (होय)'}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                checked={formData[field.id] === 'no'}
                onChange={() => handleInputChange(field.id, 'no')}
                className="text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
              />
              <span>{language === 'mr' ? 'नाही (No)' : 'No (नाही)'}</span>
            </label>
          </div>
        )}

        {field.field_type === 'Radio Button' && (
          <div className="flex flex-wrap gap-3 pt-1">
            {field.options && field.options.length > 0 ? (
              field.options.map((opt) => (
                <label 
                  key={opt.id || opt.value} 
                  className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                    formData[field.id] === (opt.value || opt.label_en)
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={field.id}
                    checked={formData[field.id] === (opt.value || opt.label_en)}
                    onChange={() => handleInputChange(field.id, opt.value || opt.label_en)}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                  />
                  <span>{language === 'mr' ? opt.label_mr || opt.label_en : opt.label_en || opt.label_mr}</span>
                </label>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No options configured for this radio field.</p>
            )}
          </div>
        )}

        {field.field_type === 'Checkbox' && (
          <div className="flex flex-wrap gap-3 pt-1">
            {field.options && field.options.length > 0 ? (
              field.options.map((opt) => {
                const optVal = opt.value || opt.label_en;
                const currentVals = Array.isArray(formData[field.id]) 
                  ? formData[field.id] 
                  : (typeof formData[field.id] === 'string' && formData[field.id] ? formData[field.id].split(', ') : []);
                const isChecked = currentVals.includes(optVal);

                const toggleCheckbox = () => {
                  let updated: string[];
                  if (isChecked) {
                    updated = currentVals.filter((v: string) => v !== optVal);
                  } else {
                    updated = [...currentVals, optVal];
                  }
                  handleInputChange(field.id, updated.join(', '));
                };

                return (
                  <label 
                    key={opt.id || optVal} 
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={toggleCheckbox}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300 rounded"
                    />
                    <span>{language === 'mr' ? opt.label_mr || opt.label_en : opt.label_en || opt.label_mr}</span>
                  </label>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic">No options configured for this checkbox field.</p>
            )}
          </div>
        )}

        {field.field_type === 'Dropdown' && (
          <select
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">{language === 'mr' ? '-- निवडा --' : '-- Select --'}</option>
            {field.options?.map((opt) => (
              <option key={opt.id} value={opt.value || opt.label_en}>
                {language === 'mr' ? opt.label_mr || opt.label_en : opt.label_en}
              </option>
            ))}
          </select>
        )}

        {field.field_type === 'Village Selector' && (
          <select
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">{language === 'mr' ? '-- गाव निवडा --' : '-- Select Village --'}</option>
            {villages.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name} {v.code ? `(${v.code})` : ''}
              </option>
            ))}
          </select>
        )}

        {field.field_type === 'Employee Selector' && (
          <select
            id={field.id}
            required={field.is_required}
            value={formData[field.id] !== undefined ? formData[field.id] : ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">{language === 'mr' ? '-- कर्मचारी निवडा --' : '-- Select Employee --'}</option>
            {employeesList.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name} {emp.designation ? `(${emp.designation})` : ''}
              </option>
            ))}
          </select>
        )}

        {(field.field_type === 'File Upload' || field.field_type === 'Image Upload') && (
          <div className="space-y-2">
            <input
              type="file"
              id={field.id}
              accept={field.field_type === 'Image Upload' ? 'image/*' : '*/*'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleInputChange(field.id, file.name);
                }
              }}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {formData[field.id] && (
              <p className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                📎 {formData[field.id]}
              </p>
            )}
          </div>
        )}
      </div>
    );

    if (isLeafInStandalone) {
      return (
        <div key={field.id} className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
          {content}
        </div>
      );
    }

    return (
      <React.Fragment key={field.id}>
        {content}
      </React.Fragment>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Floating Supabase Success Toast Banner */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md bg-emerald-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">
              {language === 'mr' ? 'डेटा Supabase मध्ये यशस्वीरीत्या जतन झाला आहे!' : 'Data saved successfully in Supabase!'}
            </div>
            <div className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
              <Database className="w-3 h-3" />
              {language === 'mr' ? 'क्लाउड डेटाबेसवर सर्व माहिती अचूक अपडेट झाली.' : 'All record entries synchronized with Supabase cloud.'}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              {form.name}
            </h1>
            {form.description && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{form.description}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Supabase Auto-Save Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all">
            {autoSaveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-blue-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {language === 'mr' ? 'Supabase मध्ये जतन होत आहे...' : 'Saving to Supabase...'}
              </span>
            ) : autoSaveStatus === 'saved' ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'mr' ? 'डेटा Supabase मध्ये जतन झाला आहे' : 'Saved in Supabase'}
                {lastSavedTime && <span className="text-[10px] text-emerald-600 font-normal">({lastSavedTime})</span>}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">
                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                {language === 'mr' ? 'Supabase ऑटो-सेव्ह चालू' : 'Supabase Cloud Sync'}
              </span>
            )}
          </div>

          {form.target_role && form.target_role !== 'ALL' && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
              Role: {form.target_role}
            </span>
          )}
          {/* Format / Scope Badge */}
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
            form.report_type === 'SUBCENTRE_LEVEL'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {form.report_type === 'SUBCENTRE_LEVEL'
              ? (language === 'mr' ? '🏢 उपकेंद्र स्तर' : '🏢 Sub-centre Level')
              : (language === 'mr' ? '🏘️ गावनिहाय' : '🏘️ Village-wise')}
          </span>
          {/* Submission Mode Badge */}
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
            form.employee_wise_submission 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {form.employee_wise_submission 
              ? (language === 'mr' ? '👤 Employee-wise' : '👤 Individual')
              : (language === 'mr' ? '👥 Facility' : '👥 Facility')}
          </span>

          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer ml-1"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              {language === 'mr' ? 'A4 अहवाल डाऊनलोड' : 'Download A4 Report'}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div id="report-submission-error-alert" className="bg-red-50/95 border-2 border-red-200 rounded-xl p-4 sm:p-5 flex items-start justify-between shadow-sm transition-all animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                  {language === 'mr' ? 'त्रुटी (Error)' : 'Submission Error'}
                </span>
                <p className="text-sm font-bold text-red-900">
                  {language === 'mr' ? 'अहवाल सादर करताना अडचण आली' : 'Unable to submit report'}
                </p>
              </div>
              <p className="text-xs font-medium text-red-700 mt-1.5 leading-relaxed bg-red-100/50 p-2 rounded-md border border-red-200/60">
                {error}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setError(null)} 
            className="text-red-400 hover:text-red-700 hover:bg-red-100 p-1.5 rounded-lg text-sm font-bold transition-colors"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-4 sm:p-5 rounded-xl shadow-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base text-emerald-950 font-extrabold">{successMsg}</p>
              <p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'mr' 
                  ? 'अहवालातील सर्व माहिती Supabase क्लाउड डेटाबेसमध्ये अचूक नोंदवली गेली आहे.' 
                  : 'All entries have been successfully committed to Supabase cloud database.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Jurisdiction & Context Card */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'mr' ? 'उपकेंद्र' : 'Sub-centre'}</span>
              </div>
              <span className="font-semibold text-slate-800 text-sm">
                {(employee as any)?.sub_centres?.name || 'My Sub-centre'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-xs">
              <div className="flex items-center justify-between gap-1.5 text-slate-400 font-bold uppercase tracking-wider mb-1">
                <div className="flex items-center gap-1.5">
                  {form.report_type === 'SUBCENTRE_LEVEL' ? (
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>
                    {form.report_type === 'SUBCENTRE_LEVEL' 
                      ? (language === 'mr' ? 'अहवाल स्तर' : 'Report Level')
                      : (language === 'mr' ? 'गाव निवडा (Village)' : 'Select Village')}
                  </span>
                </div>
                {isNonListVillageForm && villages.length > 0 && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    {availableVillages.length}/{villages.length} {language === 'mr' ? 'उपलब्ध' : 'Available'}
                  </span>
                )}
              </div>
              {form.report_type === 'SUBCENTRE_LEVEL' ? (
                <span className="font-semibold text-amber-800 text-xs block py-1">
                  {language === 'mr' ? '🏢 उपकेंद्र स्तर (सर्व गावांचे एकत्रित)' : '🏢 Sub-centre Level (Consolidated)'}
                </span>
              ) : availableVillages.length > 0 ? (
                <select
                  value={selectedVillageId}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded text-xs py-1 px-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  {availableVillages.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.code ? `(${v.code})` : ''}
                    </option>
                  ))}
                </select>
              ) : isAllVillagesAlreadySubmitted ? (
                <span className="font-bold text-emerald-700 text-xs block py-0.5">
                  {language === 'mr' ? '✅ सर्व गावे सादर झाली आहेत' : '✅ All villages submitted'}
                </span>
              ) : (
                <span className="font-medium text-amber-700 text-xs block py-0.5">
                  {language === 'mr' ? '⚠️ गावे जोडलेली नाहीत' : '⚠️ No villages mapped'}
                </span>
              )}
            </div>

            <div className="bg-white p-3 rounded-lg border border-blue-100/80 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{language === 'mr' ? 'कालावधी' : 'Reporting Period'}</span>
              </div>
              <span className="font-semibold text-slate-800 text-xs">
                {periodStart} to {periodEnd}
              </span>
            </div>
          </div>
        </div>

        {/* All Villages Submitted Banner for Non-list Forms */}
        {isAllVillagesAlreadySubmitted && (
          <div className="m-6 p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {language === 'mr' 
                    ? `या कालावधीसाठी (${periodStart} ते ${periodEnd}) या उपकेंद्रातील सर्व गावांचे अहवाल आधीच सादर झाले आहेत.` 
                    : `All villages for reporting period (${periodStart} to ${periodEnd}) have already been submitted.`}
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  {language === 'mr'
                    ? 'गावनिहाय प्रपत्र नियमानुसार, आधी सादर केलेली गावे पुन्हा यादीत दाखवली जात नाहीत. दुरुस्ती करण्यासाठी किंवा पाहण्यासाठी आपण "माझे अहवाल" मध्ये जाऊन अहवाल संपादित करू शकता.'
                    : 'As per system rules, submitted villages are excluded from the selection list. To view or make corrections, please visit "My Reports".'}
                </p>
                {submittedVillageDetails.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {submittedVillageDetails.map(sv => (
                      <span key={sv.id} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-md shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {sv.name} {sv.submittedAt ? `(${new Date(sv.submittedAt).toLocaleDateString()})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/reports/my')}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                {language === 'mr' ? 'माझे सादर केलेले अहवाल पहा' : 'View Submitted Reports'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors"
              >
                {language === 'mr' ? 'इतर अहवाल भरा' : 'Back to Forms List'}
              </button>
            </div>
          </div>
        )}

        {/* Subcentre Level Form Already Submitted Banner */}
        {isSubCentreLevelAlreadySubmitted && (
          <div className="m-6 p-5 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {language === 'mr' 
                    ? `या उपकेंद्रासाठी या कालावधीचा (${periodStart} ते ${periodEnd}) उपकेंद्र स्तर अहवाल आधीच सादर केला आहे.` 
                    : `Sub-centre level report for period (${periodStart} to ${periodEnd}) is already submitted.`}
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  {language === 'mr'
                    ? 'उपकेंद्र स्तरावरील प्रपत्र एका कालावधीसाठी एकदाच भरले जाते. दुरुस्तीसाठी "माझे अहवाल" मधून संपादित करा.'
                    : 'Facility reports are submitted once per reporting cycle. To edit, please use "My Reports".'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/reports/my')}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                {language === 'mr' ? 'सादर अहवाल पहा' : 'View Submitted Report'}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Fields from Live Database */}
        <div className="p-6 space-y-6">
          {form.fields.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm italic">
              {language === 'mr' ? 'या अहवालासाठी कोणतेही प्रश्न / निर्देशक जोडलेले नाहीत.' : 'No fields configured for this form in database.'}
            </div>
          ) : (
            buildFieldTree(form.fields).map((field) => renderReportFieldNode(field))
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Database className="w-4 h-4 text-blue-600" />
            <span>
              {language === 'mr' ? 'सर्व नोंदी सुरक्षितपणे Supabase क्लाउडवर जतन केल्या जातात.' : 'All entries are securely auto-saved & submitted to Supabase.'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => saveReport('Draft')}
              disabled={submitting || isAllVillagesAlreadySubmitted || isSubCentreLevelAlreadySubmitted}
              className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="mr-2 h-4 w-4 text-slate-500" />
              {language === 'mr' ? 'मसुदा जतन करा (Save Draft)' : 'Save Draft'}
            </button>
            
            <button
              type="button"
              onClick={() => saveReport('Submitted')}
              disabled={submitting || isAllVillagesAlreadySubmitted || isSubCentreLevelAlreadySubmitted}
              className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isEditMode ? (
                <Save className="mr-2 h-4 w-4" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {submitting 
                ? (language === 'mr' ? 'Supabase मध्ये जतन होत आहे...' : 'Saving to Supabase...')
                : (isEditMode 
                    ? (language === 'mr' ? 'दुरुस्त अहवाल सादर करा (Update Report)' : 'Update Report') 
                    : (language === 'mr' ? 'अहवाल सादर करा (Submit Report)' : 'Submit Report')
                  )
              }
            </button>
          </div>
        </div>
      </div>

      {showDownloadModal && (activeSubmissionId || submissionId) && (
        <ReportDownloadModal
          isOpen={showDownloadModal}
          report={{
            id: activeSubmissionId || submissionId,
            form_id: formId,
            period_start: periodStart,
            period_end: periodEnd,
            forms: form,
            villages: villages.find(v => v.id === selectedVillageId),
            employees: employee
          }}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
}
