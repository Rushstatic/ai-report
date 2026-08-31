import React, { useState, useEffect } from "react";
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
  UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/languageStore';
import { syncStandardFormsToDatabase } from '@/utils/syncForms';
import { getFormWithFields } from '@/utils/formStorage';

type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No' | 'Auto Calculated Field' | 'Read-only Field' | 'Master Data Field';

interface FormField {
  id: string;
  name: string;
  label_en: string;
  label_mr: string;
  field_type: FieldType | string;
  is_required: boolean;
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
}

export default function ReportSubmission() {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { language } = useLanguageStore();

  const isEditMode = !!submissionId;

  const [form, setForm] = useState<FormDefinition | null>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
          setError('The requested form was not found.');
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

        // 3. If Edit Mode, fetch live submission record and values
        if (submissionId) {
          const { data: subData, error: subDataErr } = await (supabase
            .from('report_submissions') as any)
            .select('*, report_submission_values(*)')
            .eq('id', submissionId)
            .single();

          if (subDataErr) throw subDataErr;

          if (subData) {
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
      }
    }

    loadData();
  }, [formId, submissionId, employee]);

  
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
          if (f.master_data_field === 'Population') expectedVal = v.population || 0;
          if (f.master_data_field === 'House Count') expectedVal = v.house_count || 0;
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
          if (f.master_data_field === 'Population') newData[f.id] = v.population || 0;
          if (f.master_data_field === 'House Count') newData[f.id] = v.house_count || 0;
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

  const saveReport = async (status: 'Draft' | 'Submitted') => {
    if (!form || !employee?.id) {
      setError('Employee profile or form not available.');
      return;
    }

    // Validate required fields if submitting
    if (status === 'Submitted') {
      for (const field of form.fields) {
        if (field.is_required && (formData[field.id] === undefined || formData[field.id] === '')) {
          setError(`Please fill in required field: ${language === 'mr' ? field.label_mr : field.label_en}`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      let subId = submissionId;

      if (isEditMode && subId) {
        // Update existing report submission in Supabase
        const { error: updateErr } = await (supabase
          .from('report_submissions') as any)
          .update({
            village_id: selectedVillageId || null,
            sub_centre_id: employee.sub_centre_id || null,
            period_start: periodStart,
            period_end: periodEnd,
            status: status,
            submitted_at: status === 'Submitted' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', subId);

        if (updateErr) throw updateErr;

        // Delete old values and re-insert fresh
        await (supabase.from('report_submission_values') as any).delete().eq('submission_id', subId);
      } else {
        // Insert new report submission into Supabase
        const { data: newSub, error: insertErr } = await (supabase
          .from('report_submissions') as any)
          .insert({
            form_id: form.id,
            employee_id: employee.id,
            village_id: selectedVillageId || null,
            sub_centre_id: employee.sub_centre_id || null,
            period_start: periodStart,
            period_end: periodEnd,
            status: status,
            submitted_at: status === 'Submitted' ? new Date().toISOString() : null
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        subId = newSub.id;
      }

      // Insert field values into report_submission_values
      if (subId && form.fields.length > 0) {
        const valuesToInsert = form.fields.map(f => {
          const rawVal = formData[f.id];
          return {
            submission_id: subId,
            field_id: f.id,
            value_text: typeof rawVal === 'string' ? rawVal : (rawVal !== undefined && rawVal !== null ? String(rawVal) : null),
            value_numeric: f.field_type === 'Number' && rawVal !== undefined && rawVal !== '' ? Number(rawVal) : null,
            value_boolean: f.field_type === 'Yes/No' ? rawVal === 'yes' : null,
            value_date: f.field_type === 'Date' && rawVal ? rawVal : null
          };
        });

        const { error: valsErr } = await (supabase.from('report_submission_values') as any).insert(valuesToInsert);
        if (valsErr) throw valsErr;
      }

      setSuccessMsg(
        status === 'Submitted' 
          ? (language === 'mr' ? 'अहवाल यशस्वीरीत्या सादर केला गेला आहे!' : 'Report submitted successfully!')
          : (language === 'mr' ? 'अहवाल मसुदा (Draft) जतन झाला आहे.' : 'Report draft saved.')
      );

      setTimeout(() => {
        navigate('/reports/my');
      }, 1200);

    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
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

  const renderReportFieldNode = (field: FormField, depth: number = 0): React.ReactNode => {
    return (
      <React.Fragment key={field.id}>
        <div className={`space-y-1.5 ${depth > 0 ? 'mt-4' : ''}`} style={{ marginLeft: `${depth * 1.5}rem` }}>
          <label htmlFor={field.id} className="block text-sm font-semibold text-slate-700">
            {language === 'mr' ? field.label_mr : field.label_en}
            <span className="text-slate-400 font-normal ml-2 text-xs">
              ({language === 'mr' ? field.label_en : field.label_mr})
            </span>
            {field.is_required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>

          {(field.field_type === 'Master Data Field' || field.field_type === 'Auto Calculated Field' || field.field_type === 'Read-only Field') && (
            <div className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-100 ${field.field_type === 'Master Data Field' ? 'border-purple-200 text-purple-900 bg-purple-50 font-semibold' : 'border-slate-200 text-slate-600'}`}>
              {formData[field.id] !== undefined && formData[field.id] !== '' ? formData[field.id] : (field.field_type === 'Master Data Field' ? (language === 'mr' ? 'आपोआप भरले जाईल' : 'Auto-populated') : '-')}
            </div>
          )}

          {field.field_type === 'Number' && (
            <input
              type="number"
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          )}

          {field.field_type === 'Text' && (
            <input
              type="text"
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={language === 'mr' ? 'माहिती प्रविष्ट करा...' : 'Enter details...'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          )}

          {field.field_type === 'Date' && (
            <input
              type="date"
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          )}

          {field.field_type === 'Yes/No' && (
            <div className="flex items-center gap-6 mt-1">
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

          {field.field_type === 'Dropdown' && (
            <select
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">{language === 'mr' ? '-- निवडा --' : '-- Select --'}</option>
              {field.options?.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {language === 'mr' ? opt.label_mr || opt.label_en : opt.label_en}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Render children */}
        {field.children && field.children.length > 0 && (
          <div className="border-l-2 border-slate-200 pl-4 mt-4 space-y-4">
            {field.children.map(child => renderReportFieldNode(child, depth + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-300 rounded-full text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{form.name}</h1>
            {form.description && <p className="text-sm text-slate-500 mt-1">{form.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              ? (language === 'mr' ? '🏢 उपकेंद्र स्तर अहवाल' : '🏢 Sub-centre Level Report')
              : (language === 'mr' ? '🏘️ गावनिहाय अहवाल' : '🏘️ Village-wise Report')}
          </span>
          {/* Submission Mode Badge */}
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
            form.employee_wise_submission 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {form.employee_wise_submission 
              ? (language === 'mr' ? '👤 Employee-wise (स्वतंत्र)' : '👤 Employee-wise (Individual)')
              : (language === 'mr' ? '👥 उपकेंद्र सादरीकरण' : '👥 Facility Submission')}
          </span>
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
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-md">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
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
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider mb-1">
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
              {form.report_type === 'SUBCENTRE_LEVEL' ? (
                <span className="font-semibold text-amber-800 text-xs block py-1">
                  {language === 'mr' ? '🏢 उपकेंद्र स्तर (सर्व गावांचे एकत्रित)' : '🏢 Sub-centre Level (Consolidated)'}
                </span>
              ) : villages.length > 0 ? (
                <select
                  value={selectedVillageId}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded text-xs py-1 px-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  {villages.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.code ? `(${v.code})` : ''}
                    </option>
                  ))}
                </select>
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={() => saveReport('Draft')}
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            <Save className="mr-2 h-4 w-4 text-slate-500" />
            {language === 'mr' ? 'मसुदा जतन करा (Save Draft)' : 'Save Draft'}
          </button>
          
          <button
            type="button"
            onClick={() => saveReport('Submitted')}
            disabled={submitting}
            className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-xs transition-colors"
          >
            {isEditMode ? <Save className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
            {submitting 
              ? (language === 'mr' ? 'सादर होत आहे...' : 'Submitting...')
              : (isEditMode 
                  ? (language === 'mr' ? 'दुरुस्त अहवाल सादर करा (Update Report)' : 'Update Report') 
                  : (language === 'mr' ? 'अहवाल सादर करा (Submit Report)' : 'Submit Report')
                )
            }
          </button>
        </div>
      </div>
    </div>
  );
}
