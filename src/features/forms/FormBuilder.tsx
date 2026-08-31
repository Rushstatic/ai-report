import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Save, 
  Pencil, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText,
  Layers,
  Sparkles,
  Database,
  UserCheck,
  Users,
  Building2,
  GripVertical,
  Monitor
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/languageStore';
import { 
  fetchAllActiveForms, 
  getFormWithFields, 
  saveLocalForm, 
  StoredForm, 
  FormFieldItem, 
  FormOptionItem,
  buildFieldTree
} from '@/utils/formStorage';


type ReportPeriod = 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'Yearly';
type ReportType = 'VILLAGE_NUMERICAL' | 'VILLAGE_PROGRESS' | 'LIST' | 'SUBCENTRE_LEVEL';

export default function FormBuilder() {
  const { employee } = useAuth();
  const { language } = useLanguageStore();

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCode, setFormCode] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('Monthly');
  const [reportType, setReportType] = useState<ReportType>('VILLAGE_NUMERICAL');
  const [targetRole, setTargetRole] = useState<string>('ALL');
  const [employeeWiseSubmission, setEmployeeWiseSubmission] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const toggleFieldAdvanced = (id: string) => setExpandedFields(prev => ({ ...prev, [id]: !prev[id] }));
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saveMode, setSaveMode] = useState<'update' | 'new_version'>('update');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Form selection state
  const [existingForms, setExistingForms] = useState<StoredForm[]>([]);
  const [loadedFormId, setLoadedFormId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [parentFormId, setParentFormId] = useState<string | null>(null);
  const [loadingForms, setLoadingForms] = useState(false);

  const loadAllForms = async () => {
    setLoadingForms(true);
    try {
      const forms = await fetchAllActiveForms(undefined, true);
      setExistingForms(forms);
    } catch (err) {
      console.error('Error fetching forms:', err);
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    loadAllForms();
  }, []);

  const handleSelectForm = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoNotice(null);

    if (!selectedId) {
      // Reset form
      setLoadedFormId(null);
      setParentFormId(null);
      setCurrentVersion(1);
      setFormName('');
      setFormDescription('');
      setFormCode('');
      setPeriod('Monthly');
      setReportType('VILLAGE_NUMERICAL');
      setTargetRole('ALL');
      setEmployeeWiseSubmission(false);
      setFields([]);
      setSaveMode('update');
      return;
    }

    const fullForm = await getFormWithFields(selectedId);
    if (!fullForm) return;

    setLoadedFormId(fullForm.id);
    setParentFormId(fullForm.parent_form_id || fullForm.id);
    setCurrentVersion(fullForm.version || 1);
    setFormName(fullForm.name || '');
    setFormDescription(fullForm.description || '');
    setFormCode(fullForm.code || '');
    setPeriod((fullForm.reporting_period as ReportPeriod) || 'Monthly');
    setReportType((fullForm.report_type as ReportType) || 'VILLAGE_NUMERICAL');
    setTargetRole(fullForm.target_role || 'ALL');
    setEmployeeWiseSubmission(fullForm.employee_wise_submission ?? false);
    setFields(fullForm.fields || []);
  };

  const addField = (parentId: string | null = null) => {
    setFields([
      ...fields, 
      { 
        id: crypto.randomUUID(), 
        labelEn: '', 
        labelMr: '', 
        type: 'Number', 
        required: true,
        options: [],
        parent_field_id: parentId,
        allow_sub_fields: false,
      }
    ]);
  };

  const updateField = (id: string, updates: Partial<FormFieldItem>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    // Collect all descendants to remove
    const idsToRemove = new Set([id]);
    let currentIds = [id];
    
    while (currentIds.length > 0) {
      const nextIds = fields.filter(f => currentIds.includes(f.parent_field_id as string)).map(f => f.id);
      nextIds.forEach(nid => idsToRemove.add(nid));
      currentIds = nextIds;
    }
    
    setFields(fields.filter(f => !idsToRemove.has(f.id)));
  };


  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, allowSub: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    el.classList.remove('border-t-blue-500', 'border-b-blue-500', 'border-t-2', 'border-b-2', 'bg-blue-50');

    if (allowSub && y > height * 0.25 && y < height * 0.75) {
      el.classList.add('bg-blue-50');
    } else if (y < height * 0.5) {
      el.classList.add('border-t-blue-500', 'border-t-2');
    } else {
      el.classList.add('border-b-blue-500', 'border-b-2');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('border-t-blue-500', 'border-b-blue-500', 'border-t-2', 'border-b-2', 'bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent, targetId: string, allowSub: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('border-t-blue-500', 'border-b-blue-500', 'border-t-2', 'border-b-2', 'bg-blue-50');

    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const newFields = [...fields];
    const sourceField = newFields.find(f => f.id === sourceId);
    const targetField = newFields.find(f => f.id === targetId);
    if (!sourceField || !targetField) return;

    // Prevent cyclic nesting
    let current = targetField;
    while (current.parent_field_id) {
      if (current.parent_field_id === sourceId) {
        // Cannot drop parent into its own child
        return;
      }
      const nextParent = newFields.find(f => f.id === current.parent_field_id);
      if (!nextParent) break;
      current = nextParent;
    }

    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let newParentId = targetField.parent_field_id;
    let isChildDrop = false;
    let insertBefore = false;

    if (allowSub && y > height * 0.25 && y < height * 0.75) {
      newParentId = targetField.id;
      isChildDrop = true;
    } else if (y < height * 0.5) {
      insertBefore = true;
    }

    sourceField.parent_field_id = newParentId || null;

    const siblings = newFields
      .filter(f => f.parent_field_id === newParentId && f.id !== sourceId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    if (isChildDrop) {
      siblings.push(sourceField);
    } else {
      const targetSiblingIndex = siblings.findIndex(f => f.id === targetId);
      if (targetSiblingIndex !== -1) {
        if (insertBefore) {
          siblings.splice(targetSiblingIndex, 0, sourceField);
        } else {
          siblings.splice(targetSiblingIndex + 1, 0, sourceField);
        }
      } else {
        siblings.push(sourceField);
      }
    }

    siblings.forEach((s, idx) => {
      const f = newFields.find(x => x.id === s.id);
      if (f) f.display_order = idx;
    });

    setFields(newFields);
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const fieldIndex = fields.findIndex(f => f.id === id);
    if (fieldIndex === -1) return;
    const field = fields[fieldIndex];
    
    const siblings = fields.filter(f => f.parent_field_id === field.parent_field_id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const siblingIndex = siblings.findIndex(f => f.id === id);
    
    if (direction === 'up' && siblingIndex > 0) {
      const prevSibling = siblings[siblingIndex - 1];
      const newFields = [...fields];
      const idx1 = newFields.findIndex(f => f.id === id);
      const idx2 = newFields.findIndex(f => f.id === prevSibling.id);
      
      const tempOrder = newFields[idx1].display_order || idx1;
      newFields[idx1].display_order = newFields[idx2].display_order || idx2;
      newFields[idx2].display_order = tempOrder;
      
      setFields(newFields);
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
      const nextSibling = siblings[siblingIndex + 1];
      const newFields = [...fields];
      const idx1 = newFields.findIndex(f => f.id === id);
      const idx2 = newFields.findIndex(f => f.id === nextSibling.id);
      
      const tempOrder = newFields[idx1].display_order || idx1;
      newFields[idx1].display_order = newFields[idx2].display_order || idx2;
      newFields[idx2].display_order = tempOrder;
      
      setFields(newFields);
    }
  };

  const addOption = (fieldId: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          options: [...(f.options || []), { id: crypto.randomUUID(), labelEn: '', labelMr: '', value: '' }]
        };
      }
      return f;
    }));
  };

  const updateOption = (fieldId: string, optionId: string, updates: Partial<FormOptionItem>) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          options: f.options?.map(opt => (opt.id === optionId ? { ...opt, ...updates } : opt))
        };
      }
      return f;
    }));
  };

  const removeOption = (fieldId: string, optionId: string) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          options: f.options?.filter(opt => opt.id !== optionId)
        };
      }
      return f;
    }));
  };

  const loadPreset = (presetType: 'maternal' | 'malaria' | 'water' | 'ncd') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoNotice(null);

    if (presetType === 'maternal') {
      setFormName('Maternal & Child Health Tracking (माता व बाल आरोग्य नोंद)');
      setFormDescription('Monthly Antenatal care, institutional deliveries, and infant immunizations.');
      setPeriod('Monthly');
      setReportType('VILLAGE_NUMERICAL');
      setTargetRole('ANM');
      setEmployeeWiseSubmission(false);
      setFields([
        { id: crypto.randomUUID(), labelEn: '1st Trimester ANC Registrations', labelMr: 'पहिल्या तिमाहीत गरोदर माता नोंदणी', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Total High-Risk Pregnancies Identified', labelMr: 'जोखीमयुक्त गरोदर मातांची संख्या', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Institutional Deliveries', labelMr: 'संस्थात्मक प्रसूतींची संख्या', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'PNC Home Visits within 48 Hours', labelMr: '४८ तासांच्या आत प्रसूतीनंतर गृहभेटी', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Fully Immunized Children (0-1 yr)', labelMr: 'पूर्ण लसीकरण झालेली बालके (०-१ वर्ष)', type: 'Number', required: true },
      ]);
    } else if (presetType === 'malaria') {
      setFormName('Vector Borne Disease Surveillance (हिवताप व किटकजन्य रोग साप्ताहिक अहवाल)');
      setFormDescription('Weekly blood smears, fever tracking, and anti-larval measures.');
      setPeriod('Weekly');
      setReportType('VILLAGE_PROGRESS');
      setTargetRole('MPW');
      setEmployeeWiseSubmission(true);
      setFields([
        { id: crypto.randomUUID(), labelEn: 'Fever Cases Examined', labelMr: 'तपासलेले तापाचे रुग्ण', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Blood Slides Collected (BS)', labelMr: 'घेतलेले रक्त नमुने (BS)', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Malaria Positive Cases (PV/PF)', labelMr: 'मलेरिया बाधित रुग्ण संख्या', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Containers Treated with Abate/Temephos', labelMr: 'अॅबेट वापरलेले पाणी साठे', type: 'Number', required: false },
      ]);
    } else if (presetType === 'water') {
      setFormName('Drinking Water Quality & Chlorination (पिण्याचे पाणी गुणवत्ता व क्लोरीनेशन नोंद)');
      setFormDescription('Weekly water source inspection and TCL chlorination results.');
      setPeriod('Weekly');
      setReportType('VILLAGE_PROGRESS');
      setTargetRole('MPW');
      setEmployeeWiseSubmission(true);
      setFields([
        { id: crypto.randomUUID(), labelEn: 'Water Sources Inspected', labelMr: 'तपासलेले पाणी स्रोत', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'OT Tests Performed', labelMr: 'केलेल्या ओटी चाचण्या', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Samples with Adequate Chlorine (0.2 ppm+)', labelMr: 'योग्य क्लोरीन आढळलेले नमुने', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Water Storage Tanks Chlorinated', labelMr: 'क्लोरीनेशन केलेल्या पाण्याच्या टाक्या', type: 'Number', required: false },
      ]);
    } else if (presetType === 'ncd') {
      setFormName('Non-Communicable Disease (NCD) Screening (असंसर्गजन्य रोग तपासणी)');
      setFormDescription('Hypertension, Diabetes, and Oral Cancer screening logs.');
      setPeriod('Monthly');
      setReportType('VILLAGE_NUMERICAL');
      setTargetRole('CHO');
      setEmployeeWiseSubmission(false);
      setFields([
        { id: crypto.randomUUID(), labelEn: 'Individuals Screened for Hypertension (30+ yrs)', labelMr: '३० वर्षांवरील रक्तदाब तपासणी', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Individuals Screened for Diabetes', labelMr: 'मधुमेह (डायबेटीस) तपासणी', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Confirmed Cases on Regular Treatment', labelMr: 'नियमित उपचारावर असलेले रुग्ण', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Wellness & Yoga Sessions Conducted', labelMr: 'आयोजित योग व आरोग्य सत्रे', type: 'Number', required: false },
      ]);
    }
  };

  const handleSave = async (isPublishing: boolean = true) => {
    if (!formName.trim()) {
      setErrorMsg(language === 'mr' ? 'कृपया अहवालाचे नाव प्रविष्ट करा.' : 'Please enter the form name.');
      return;
    }

    if (fields.length === 0) {
      setErrorMsg(language === 'mr' ? 'कृपया किमान एक निर्देशक किंवा प्रश्न जोडा.' : 'Please add at least one field/indicator.');
      return;
    }

    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].labelEn.trim() && !fields[i].labelMr.trim()) {
        setErrorMsg(language === 'mr' ? `फील्ड #${i + 1} साठी नाव प्रविष्ट करा.` : `Please enter label for field #${i + 1}.`);
        return;
      }
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoNotice(null);

    // Generate safe unique code and target ID
    let finalCode = formCode.trim();
    if (!finalCode) {
      const cleanSlug = formName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 24);
      finalCode = cleanSlug ? `${cleanSlug}_${Date.now().toString().slice(-4)}` : `FORM_${Date.now()}`;
    }

    let targetId = loadedFormId;
    let nextVersion = currentVersion;
    let finalParentId = parentFormId;

    if (!targetId || saveMode === 'new_version') {
      targetId = crypto.randomUUID();
      if (loadedFormId && saveMode === 'new_version') {
        finalParentId = parentFormId || loadedFormId;
        nextVersion = currentVersion + 1;
      }
    }

    // Prepare complete form object
    const storedFormObject: StoredForm = {
      id: targetId,
      name: formName.trim(),
      code: finalCode,
      description: formDescription.trim(),
      reporting_period: period,
      report_type: reportType,
      target_role: targetRole,
      employee_wise_submission: employeeWiseSubmission,
      version: nextVersion,
      parent_form_id: finalParentId,
      active: isPublishing,
      fields: fields.map((f, idx) => ({
        ...f,
        id: f.id || crypto.randomUUID(),
        name: f.name || `field_${idx + 1}`
      }))
    };

    // 1. Save to local storage first (Ensures immediate usability in Data Entry)
    saveLocalForm(storedFormObject);

    // 2. Attempt saving to Supabase if configured
    let supabaseSaved = false;
    let supabaseErrorNote = '';

    if (isSupabaseConfigured()) {
      try {
        if (loadedFormId && saveMode === 'update') {
          // Update Form row
          const updatePayload: any = {
            name: formName.trim(),
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            employee_wise_submission: employeeWiseSubmission,
            active: isPublishing,
            updated_at: new Date().toISOString()
          };
          if (targetRole) updatePayload.target_role = targetRole;

          let { error: updateErr } = await (supabase
            .from('forms') as any)
            .update(updatePayload)
            .eq('id', loadedFormId);

          if (updateErr && (updateErr.code === '42703' || (updateErr.message && updateErr.message.includes('schema cache')))) {
            console.warn('Database schema missing columns, falling back to basic update', updateErr);
            const minimalUpdate = {
              name: formName.trim(),
              description: formDescription.trim(),
              reporting_period: period,
              report_type: reportType,
              active: isPublishing,
              updated_at: new Date().toISOString()
            };
            const retryRes = await (supabase.from('forms') as any).update(minimalUpdate).eq('id', loadedFormId);
            updateErr = retryRes.error;
          }

          if (updateErr) throw updateErr;

        } else {
          // Insert Form row
          const insertPayload: any = {
            id: targetId,
            name: formName.trim(),
            code: finalCode,
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            employee_wise_submission: employeeWiseSubmission,
            active: isPublishing
          };
          if (targetRole) insertPayload.target_role = targetRole;
          if (nextVersion) insertPayload.version = nextVersion;
          if (finalParentId) insertPayload.parent_form_id = finalParentId;

          let { error: insertErr } = await (supabase
            .from('forms') as any)
            .insert(insertPayload);

          if (insertErr && (insertErr.code === '42703' || (insertErr.message && insertErr.message.includes('schema cache')))) {
            // Column missing, fallback to minimal payload
            console.warn('Database schema missing columns, falling back to basic insert', insertErr);
            const minimalInsert = {
              id: targetId,
              name: formName.trim(),
              code: finalCode,
              description: formDescription.trim(),
              reporting_period: period,
              report_type: reportType,
              active: isPublishing
            };
            const retryRes = await (supabase.from('forms') as any).insert(minimalInsert);
            insertErr = retryRes.error;
          }

          if (insertErr) throw insertErr;
        }

        // Section handling
        const { data: existingSecs } = await (supabase
          .from('form_sections') as any)
          .select('id')
          .eq('form_id', targetId);

        let sectionId = existingSecs?.[0]?.id;

        if (!sectionId) {
          const { data: newSec, error: secErr } = await (supabase
            .from('form_sections') as any)
            .insert({
              form_id: targetId,
              title: 'General Section',
              display_order: 0
            })
            .select('id')
            .single();

          if (!secErr && newSec) {
            sectionId = newSec.id;
          }
        }

        if (sectionId) {
          // Clean previous fields if any and insert fresh
          const { data: oldFlds } = await (supabase
            .from('form_fields') as any)
            .select('id')
            .eq('section_id', sectionId);

          if (oldFlds && oldFlds.length > 0) {
            const oldIds = oldFlds.map((o: any) => o.id);
            await (supabase.from('form_field_options') as any).delete().in('field_id', oldIds);
            await (supabase.from('form_fields') as any).delete().in('id', oldIds);
          }

          const fieldsToInsert = fields.map((f, index) => {
            const safeName = (f.labelEn || f.labelMr || `field_${index + 1}`)
              .toLowerCase()
              .replace(/[^a-z0-9_]+/g, '_')
              .replace(/^_+|_+$/g, '')
              .slice(0, 40) || `field_${index + 1}`;

            return {
              id: f.id,
              section_id: sectionId,
              parent_field_id: f.parent_field_id || null,
              label_en: f.labelEn.trim() || f.labelMr.trim(),
              label_mr: f.labelMr.trim() || f.labelEn.trim(),
              name: `${safeName}_${index + 1}`,
              field_type: f.type,
              is_required: f.required,
              allow_sub_fields: f.allow_sub_fields || false,
              display_order: index,
              placeholder: f.placeholder || null,
              min_value: f.min_value?.toString() || null,
              max_value: f.max_value?.toString() || null,
              default_value: f.default_value || null,
              help_text: f.help_text || null,
              calculation_formula: f.calculation ? JSON.stringify(f.calculation) : null,
              conditional_logic: f.conditional_logic ? f.conditional_logic : null,
              master_data_source: f.master_data_source || null,
              master_data_field: f.master_data_field || null,
              master_data_mode: f.master_data_mode || null,
            };
          });

          let { data: insertedFields, error: fieldInsertErr } = await (supabase
            .from('form_fields') as any)
            .insert(fieldsToInsert)
            .select();
            
          if (fieldInsertErr && (fieldInsertErr.code === '42703' || (fieldInsertErr.message && fieldInsertErr.message.includes('schema cache')))) {
             console.warn('Database schema missing columns in form_fields, falling back to minimal', fieldInsertErr);
             const minimalFields = fieldsToInsert.map(f => {
               const { parent_field_id, allow_sub_fields, master_data_source, master_data_field, master_data_mode, ...rest } = f;
               return rest;
             });
             const retryRes = await (supabase.from('form_fields') as any).insert(minimalFields).select();
             insertedFields = retryRes.data;
             fieldInsertErr = retryRes.error;
          }
          if (fieldInsertErr) throw fieldInsertErr;


          // Dropdown options
          const optionsToInsert: any[] = [];
          fields.forEach((f, i) => {
            if (f.type === 'Dropdown' && f.options && f.options.length > 0 && insertedFields?.[i]) {
              const dbField = insertedFields[i];
              f.options.forEach((opt, optIndex) => {
                if (opt.labelEn.trim() || opt.labelMr.trim()) {
                  optionsToInsert.push({
                    field_id: dbField.id,
                    label_en: opt.labelEn.trim() || opt.labelMr.trim(),
                    label_mr: opt.labelMr.trim() || opt.labelEn.trim(),
                    value: opt.value.trim() || (opt.labelEn || opt.labelMr).toLowerCase().replace(/\s+/g, '_'),
                    display_order: optIndex,
                  });
                }
              });
            }
          });

          if (optionsToInsert.length > 0) {
            await (supabase.from('form_field_options') as any).insert(optionsToInsert);
          }
        }

        supabaseSaved = true;
      } catch (err: any) {
        console.warn('Supabase save warning (fallback to local form storage):', err);
        if (err?.code === '42501') {
          supabaseErrorNote = 'RLS Permission Denied. Please run the migration file "00021_fix_form_builder_rls.sql" in your Supabase SQL Editor.';
        } else {
          supabaseErrorNote = err?.message || 'Database schema requires migration';
        }
      }
    }

    setLoadedFormId(targetId);
    setFormCode(finalCode);

    if (supabaseSaved) {
      setSuccessMsg(
        language === 'mr' 
          ? `अहवाल प्रपत्र '${formName}' थेट डेटाबेसमध्ये प्रकाशित झाले आहे आणि कर्मचाऱ्यांसाठी सक्रिय आहे!` 
          : `Form '${formName}' successfully published to Supabase and is live for field reporting!`
      );
    } else {
      setSuccessMsg(
        language === 'mr' 
          ? `अहवाल प्रपत्र '${formName}' जतन झाले असून "Data Entry" मध्ये सक्रिय आहे!` 
          : `Form '${formName}' saved successfully and is active for Data Entry!`
      );
      if (supabaseErrorNote) {
        setInfoNotice(supabaseErrorNote);
      }
    }

    await loadAllForms();
    setIsSaving(false);
  };

const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (
  <React.Fragment key={field.id}>
    <div 
      style={{ marginLeft: compactMode ? `${depth * 1}rem` : `${depth * 2}rem` }}
      className={`relative bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start hover:border-blue-300 transition-all shadow-xs ${compactMode ? 'p-2 gap-2' : 'p-4 gap-4'}`}
      draggable={true}
      onDragStart={(e) => handleDragStart(e, field.id)}
      onDragOver={(e) => handleDragOver(e, field.allow_sub_fields || false)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, field.id, field.allow_sub_fields || false)}
    >
                    {/* Index & Reorder */}
                    <div className="flex sm:flex-col items-center gap-1">
                      <div className="text-slate-300 cursor-move hover:text-blue-500 mb-1" title="Drag to reorder/reparent">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex sm:flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveField(field.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, 'down')}
                          disabled={index === fields.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 w-full grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-12">
                      <div className={reportType === 'VILLAGE_PROGRESS' ? "sm:col-span-6" : "sm:col-span-5"}>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                          {language === 'mr' ? 'नाव (इंग्रजी / English)' : 'Field Label (English)'}
                        </label>
                        <input
                          type="text"
                          value={field.labelEn}
                          onChange={(e) => updateField(field.id, { labelEn: e.target.value })}
                          className="w-full sm:text-sm border-slate-300 rounded-lg py-1.5 px-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="e.g., Fever Cases Examined"
                        />
                      </div>

                      <div className={reportType === 'VILLAGE_PROGRESS' ? "sm:col-span-6" : "sm:col-span-5"}>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                          {language === 'mr' ? 'नाव (मराठी / Marathi)' : 'Field Label (Marathi)'}
                        </label>
                        <input
                          type="text"
                          value={field.labelMr}
                          onChange={(e) => updateField(field.id, { labelMr: e.target.value })}
                          className="w-full sm:text-sm border-slate-300 rounded-lg py-1.5 px-3 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="उदा. तपासलेले तापाचे रुग्ण"
                        />
                      </div>

                      {reportType !== 'VILLAGE_PROGRESS' && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                            {language === 'mr' ? 'प्रकार (Type)' : 'Type'}
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                            className="w-full sm:text-sm border-slate-300 rounded-lg py-1.5 pl-3 pr-6 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                          >
                            <optgroup label="Text & Inputs">
                              <option value="Text">Text (मजकूर)</option>
                              <option value="Long Text">Long Text (सविस्तर मजकूर)</option>
                              <option value="Number">Number (संख्या)</option>
                              <option value="Decimal">Decimal (दशांश)</option>
                              <option value="Mobile Number">Mobile Number (मोबाईल)</option>
                            </optgroup>
                            <optgroup label="Date & Time">
                              <option value="Date">Date (दिनांक)</option>
                              <option value="Time">Time (वेळ)</option>
                              <option value="Date & Time">Date & Time (दिनांक आणि वेळ)</option>
                            </optgroup>
                            <optgroup label="Choices">
                              <option value="Dropdown">Dropdown (यादी)</option>
                              <option value="Radio Button">Radio Button (रेडिओ)</option>
                              <option value="Checkbox">Checkbox (चेकबॉक्स)</option>
                              <option value="Yes/No">Yes/No (होय/नाही)</option>
                            </optgroup>
                            <optgroup label="Media & Selectors">
                              <option value="File Upload">File Upload (फाईल)</option>
                              <option value="Image Upload">Image Upload (चित्र)</option>
                              <option value="Village Selector">Village Selector (गाव निवड)</option>
                              <option value="Employee Selector">Employee Selector (कर्मचारी निवड)</option>
                            </optgroup>
                            <optgroup label="Advanced">
                              <option value="Auto Calculated Field">Auto Calculated (स्वयंचलित गणना)</option>
                              <option value="Read-only Field">Read-only (केवळ वाचनासाठी)</option>
                            </optgroup>
                          </select>
                        </div>
                      )}

                      {/* Dropdown Options Editor */}
                      {reportType !== 'VILLAGE_PROGRESS' && ['Dropdown', 'Radio Button', 'Checkbox'].includes(field.type) && (
                        <div className="sm:col-span-12 mt-1 p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              {field.type} Options (पर्याय)
                            </span>
                            <button
                              type="button"
                              onClick={() => addOption(field.id)}
                              className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Option
                            </button>
                          </div>
                          <div className="space-y-2">
                            {field.options?.map((option, optIdx) => (
                              <div key={option.id || optIdx} className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 w-4 font-bold">{optIdx + 1}.</span>
                                <input
                                  type="text"
                                  placeholder="Option EN (e.g. Normal)"
                                  value={option.labelEn}
                                  onChange={(e) => updateOption(field.id, option.id || `${optIdx}`, { labelEn: e.target.value })}
                                  className="flex-1 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                />
                                <input
                                  type="text"
                                  placeholder="Option MR (उदा. सामान्य)"
                                  value={option.labelMr}
                                  onChange={(e) => updateOption(field.id, option.id || `${optIdx}`, { labelMr: e.target.value })}
                                  className="flex-1 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(field.id, option.id || `${optIdx}`)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {(!field.options || field.options.length === 0) && (
                              <p className="text-xs text-slate-400 italic">No options added yet.</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="sm:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between mt-2 pt-2 border-t border-slate-100 gap-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                          />
                          <span>{language === 'mr' ? 'अनिवार्य निर्देशक (Required Field *)' : 'Required field *'}</span>
                        </label>
                        
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleFieldAdvanced(field.id)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            {expandedFields[field.id] ? '- Hide Advanced' : '+ Show Advanced'}
                          </button>

                          {field.allow_sub_fields && (
                            <button
                              type="button"
                              onClick={() => addField(field.id)}
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              {language === 'mr' ? '+ उप-निर्देशक' : '+ Sub-field'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeField(field.id)}
                            className="inline-flex items-center text-xs text-red-600 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {language === 'mr' ? 'काढून टाका' : 'Remove'}
                          </button>
                        </div>
                      </div>

                      {/* Advanced Settings */}
                      {expandedFields[field.id] && (
                        <div className="sm:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 bg-slate-100/50 rounded-lg border border-slate-200">
                          {/* Common Options */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Placeholder (उदा.)</label>
                            <input 
                              type="text" 
                              value={field.placeholder || ''} 
                              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                              className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border" 
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Help Text / Info</label>
                            <input 
                              type="text" 
                              value={field.help_text || ''} 
                              onChange={(e) => updateField(field.id, { help_text: e.target.value })}
                              className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border" 
                            />
                          </div>

                          {(field.type === 'Number' || field.type === 'Decimal') && (
                            <>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Minimum Value</label>
                                <input 
                                  type="number" 
                                  value={field.min_value || ''} 
                                  onChange={(e) => updateField(field.id, { min_value: e.target.value })}
                                  className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border" 
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Maximum Value</label>
                                <input 
                                  type="number" 
                                  value={field.max_value || ''} 
                                  onChange={(e) => updateField(field.id, { max_value: e.target.value })}
                                  className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border" 
                                />
                              </div>
                            </>
                          )}

                          <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-1">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.allow_sub_fields || false}
                                onChange={(e) => updateField(field.id, { allow_sub_fields: e.target.checked })}
                                className="h-4 w-4 text-blue-600 rounded border-slate-300"
                              />
                              <span>{language === 'mr' ? 'उपनियमावली (Allow Sub-fields)' : 'Allow Sub-fields (Nested Hierarchy)'}</span>
                            </label>
                          </div>

                          {/* Conditional Logic UI */}
                          <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-1">
                            <h4 className="text-xs font-bold text-indigo-700 uppercase mb-2">Conditional Logic (Show IF)</h4>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                              <select
                                className="w-full sm:w-1/3 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                value={field.conditional_logic?.[0]?.dependsOnId || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) {
                                    updateField(field.id, { conditional_logic: undefined });
                                  } else {
                                    updateField(field.id, {
                                      conditional_logic: [{
                                        dependsOnId: val,
                                        operator: field.conditional_logic?.[0]?.operator || '==',
                                        value: field.conditional_logic?.[0]?.value || ''
                                      }]
                                    });
                                  }
                                }}
                              >
                                <option value="">Always Show (Never Hide)</option>
                                {fields.filter(f => f.id !== field.id).map(f => (
                                  <option key={f.id} value={f.id}>{f.labelEn} ({f.type})</option>
                                ))}
                              </select>

                              {field.conditional_logic?.[0] && (
                                <>
                                  <select
                                    className="w-full sm:w-1/4 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                    value={field.conditional_logic[0].operator}
                                    onChange={(e) => updateField(field.id, {
                                      conditional_logic: [{ ...field.conditional_logic![0], operator: e.target.value as any }]
                                    })}
                                  >
                                    <option value="==">Equals (==)</option>
                                    <option value="!=">Not Equal (!=)</option>
                                    <option value=">">Greater Than (&gt;)</option>
                                    <option value="<">Less Than (&lt;)</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Value (e.g. Yes)"
                                    value={field.conditional_logic[0].value}
                                    onChange={(e) => updateField(field.id, {
                                      conditional_logic: [{ ...field.conditional_logic![0], value: e.target.value }]
                                    })}
                                    className="w-full sm:w-1/3 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                  />
                                </>
                              )}
                            </div>
                          </div>

                          
                          {/* Master Data Configuration UI */}
                          {field.type === 'Master Data Field' && (
                            <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-1 bg-purple-50/50 -mx-4 px-4 pb-4 rounded-b-lg">
                              <h4 className="text-xs font-bold text-purple-700 uppercase mb-3">Master Data Integration</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Master Source</label>
                                  <select 
                                    className={`w-full border-slate-300 rounded-md border bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`}
                                    value={field.master_data_source || ''}
                                    onChange={(e) => updateField(field.id, { master_data_source: e.target.value })}
                                  >
                                    <option value="" disabled>Select Source...</option>
                                    <option value="VILLAGE_MASTER">Village Master</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Master Field</label>
                                  <select 
                                    className={`w-full border-slate-300 rounded-md border bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`}
                                    value={field.master_data_field || ''}
                                    onChange={(e) => updateField(field.id, { master_data_field: e.target.value })}
                                  >
                                    <option value="" disabled>Select Field...</option>
                                    <option value="Population">Village Population</option>
                                    <option value="House Count">House Count / Households</option>
                                    <option value="Village Name">Village Name (Marathi/English)</option>
                                    <option value="Village Code">Village Code</option>
                                    <option value="Sub-centre Name">Sub-centre Name</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode</label>
                                  <select 
                                    className={`w-full border-slate-300 rounded-md border bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`}
                                    value={field.master_data_mode || 'DISPLAY_ONLY'}
                                    onChange={(e) => updateField(field.id, { master_data_mode: e.target.value as any })}
                                  >
                                    <option value="DISPLAY_ONLY">Display Only (Read-only)</option>
                                    <option value="CALCULATION_SOURCE">Use in Calculation</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Calculation Engine UI */}
                          {field.type === 'Auto Calculated Field' && (
                            <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-1 bg-amber-50/50 -mx-4 px-4 pb-2 rounded-b-lg">
                              <h4 className="text-xs font-bold text-amber-700 uppercase mb-2">Calculation Engine Formula</h4>
                              <p className="text-[10px] text-slate-500 mb-2">
                                Use field names enclosed in curly braces, e.g., <code>{'{field1}'} + {'{field2}'}</code>.
                                Operations: +, -, *, /, %
                              </p>
                              <div className="space-y-3">
                                {/* Visual Builder Tools */}
                                <div className="flex flex-wrap items-center gap-2 bg-white p-2 border border-amber-200 rounded-md shadow-sm">
                                  <select 
                                    className="text-xs border-slate-300 rounded p-1 max-w-[200px] truncate"
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const current = field.calculation?.formula || '';
                                        updateField(field.id, {
                                          calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: current + `{${e.target.value}}` }
                                        });
                                        e.target.value = "";
                                      }
                                    }}
                                  >
                                    <option value="" disabled>{language === 'mr' ? '+ निर्देशक निवडा...' : '+ Select Field...'}</option>
                                    {fields.filter(f => f.id !== field.id && (f.type === 'Number' || f.type === 'Auto Calculated Field' || (f.type === 'Master Data Field' && f.master_data_mode === 'CALCULATION_SOURCE'))).map(f => {
                                      let path = f.labelEn || f.labelMr;
                                      let curr = f;
                                      while (curr.parent_field_id) {
                                        const p = fields.find(x => x.id === curr.parent_field_id);
                                        if (p) {
                                          path = `${p.labelEn || p.labelMr} > ${path}`;
                                          curr = p;
                                        } else break;
                                      }
                                      return <option key={f.id} value={f.labelEn || f.labelMr || f.id}>{f.type === 'Master Data Field' ? `📊 ${path}` : path}</option>
                                    })}
                                  </select>
                                  
                                  <div className="flex flex-wrap gap-1 border-l pl-2 border-slate-200">
                                    {['+', '-', '*', '/', '(', ')'].map(op => (
                                       <button key={op} type="button" onClick={() => {
                                         const current = field.calculation?.formula || '';
                                         updateField(field.id, { calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: current + ` ${op} ` }});
                                       }} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-mono font-bold shadow-sm">{op}</button>
                                    ))}
                                  </div>
                                  
                                  <div className="flex gap-1 border-l pl-2 border-slate-200">
                                    {['SUM', 'AVG'].map(fn => (
                                       <button key={fn} type="button" onClick={() => {
                                         const current = field.calculation?.formula || '';
                                         updateField(field.id, { calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: current + `${fn}( )` }});
                                       }} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-xs font-mono font-bold shadow-sm">{fn}</button>
                                    ))}
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  placeholder="e.g. ({Male_Count} + {Female_Count}) / {Total_Days}"
                                  value={field.calculation?.formula || ''}
                                  onChange={(e) => updateField(field.id, {
                                    calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: e.target.value }
                                  })}
                                  className={`w-full border-slate-300 rounded-md px-2 border font-mono bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`} 
                                />

                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.calculation?.hasCondition || false}
                                    onChange={(e) => updateField(field.id, {
                                      calculation: { formula: field.calculation?.formula || '', hasCondition: e.target.checked }
                                    })}
                                    className="h-3.5 w-3.5 text-amber-600 rounded border-slate-300"
                                  />
                                  <span>Use IF/ELSE Conditional Logic (e.g. IF Target &gt; 0)</span>
                                </label>

                                {field.calculation?.hasCondition && (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2 border border-amber-200 rounded-md">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">IF Condition</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. {Target} > 0"
                                        value={field.calculation?.ifCondition || ''}
                                        onChange={(e) => updateField(field.id, { calculation: { ...field.calculation!, ifCondition: e.target.value } })}
                                        className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">THEN Formula</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. {Achievement} / {Target} * 100"
                                        value={field.calculation?.thenFormula || ''}
                                        onChange={(e) => updateField(field.id, { calculation: { ...field.calculation!, thenFormula: e.target.value } })}
                                        className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">ELSE Formula</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. 0"
                                        value={field.calculation?.elseFormula || ''}
                                        onChange={(e) => updateField(field.id, { calculation: { ...field.calculation!, elseFormula: e.target.value } })}
                                        className="w-full sm:text-xs border-slate-300 rounded-md py-1 px-2 border font-mono"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                    {/* Render Children */}
                    {field.children && field.children.length > 0 && (
                      <div className="w-full mt-4 space-y-4 border-l-2 border-blue-200 pl-4">
                        {field.children.map((child, childIdx) => renderFieldNode(child, childIdx, depth + 1))}
                      </div>
                    )}
                  </React.Fragment>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {language === 'mr' ? 'डायनॅमिक अहवाल प्रपत्र रचना' : 'Dynamic Form Builder'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {language === 'mr' 
              ? 'जिल्हा नियंत्रक - नवीन अहवाल निर्देशकांची रचना करा आणि क्षेत्रीय कर्मचाऱ्यांसाठी थेट प्रकाशित करा' 
              : 'District Controller - Design custom health reporting forms & publish live to field workers'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setCompactMode(!compactMode)}
            className={`inline-flex items-center px-3 py-2 border shadow-xs text-sm font-medium rounded-lg transition-colors ${compactMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            title="Compact Mode for Nested View"
          >
            <Monitor className="mr-2 h-4 w-4" />
            {language === 'mr' ? 'कॉम्पॅक्ट मोड' : 'Compact Mode'}
          </button>
          
          <button 
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-xs text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {isPreviewMode ? (
              <>
                <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                {language === 'mr' ? 'संपादन करा (Edit)' : 'Back to Edit'}
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4 text-slate-500" />
                {language === 'mr' ? 'पूर्वावलोकन (Preview)' : 'Preview Form'}
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || !formName.trim() || fields.length === 0}
            className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-xs text-sm font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {language === 'mr' ? 'मसुदा म्हणून जतन करा' : 'Save as Draft'}
          </button>
          
          <button 
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || !formName.trim() || fields.length === 0}
            className="inline-flex items-center px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {language === 'mr' ? 'जतन होत आहे...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {loadedFormId 
                  ? (saveMode === 'update' 
                      ? (language === 'mr' ? 'बदल जतन करा' : 'Update & Publish') 
                      : (language === 'mr' ? 'नवीन आवृत्ती प्रकाशित करा' : 'Publish New Version'))
                  : (language === 'mr' ? 'प्रपत्र प्रकाशित करा (Publish)' : 'Publish Form')
                }
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div id="form-builder-error-alert" className="bg-red-50/95 border-2 border-red-200 rounded-xl p-4 sm:p-5 flex items-start justify-between shadow-sm transition-all animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                  {language === 'mr' ? 'त्रुटी (Error)' : 'Action Required'}
                </span>
                <p className="text-sm font-bold text-red-900">
                  {language === 'mr' ? 'प्रपत्र जतन करताना समस्या उद्भवली' : 'Unable to publish form'}
                </p>
              </div>
              <p className="text-xs font-medium text-red-700 mt-1.5 leading-relaxed bg-red-100/50 p-2 rounded-md border border-red-200/60">
                {errorMsg}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setErrorMsg(null)} 
            className="text-red-400 hover:text-red-700 hover:bg-red-100 p-1.5 rounded-lg text-sm font-bold transition-colors"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg flex items-start justify-between shadow-xs">
          <div className="flex items-start">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                {successMsg}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {language === 'mr' ? 'कर्मचारी आता "Data Entry" मेनूमधून हा अहवाल सादर करू शकतात.' : 'Field workers can now submit entries for this form under Data Entry.'}
              </p>
              {infoNotice && (
                <p className="text-xs text-emerald-800 font-medium mt-1 bg-emerald-100/70 p-1.5 rounded">
                  {infoNotice}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => { setSuccessMsg(null); setInfoNotice(null); }} className="text-emerald-400 hover:text-emerald-600 text-sm font-bold">×</button>
        </div>
      )}

      {/* Quick Indicator Presets */}
      {!isPreviewMode && !loadedFormId && (
        <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{language === 'mr' ? 'मानक आरोग्य प्रपत्र टेम्पलेट्स (Quick Presets)' : 'Standard Health Indicator Presets'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadPreset('maternal')}
              className="px-3 py-1.5 bg-white hover:bg-blue-100/50 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 shadow-xs transition-colors"
            >
              + Maternal & Child Health (RCH)
            </button>
            <button
              type="button"
              onClick={() => loadPreset('malaria')}
              className="px-3 py-1.5 bg-white hover:bg-blue-100/50 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 shadow-xs transition-colors"
            >
              + Malaria & Vector Borne Disease
            </button>
            <button
              type="button"
              onClick={() => loadPreset('water')}
              className="px-3 py-1.5 bg-white hover:bg-blue-100/50 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 shadow-xs transition-colors"
            >
              + Water Quality & TCL Chlorination
            </button>
            <button
              type="button"
              onClick={() => loadPreset('ncd')}
              className="px-3 py-1.5 bg-white hover:bg-blue-100/50 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 shadow-xs transition-colors"
            >
              + NCD & Screening (CHO)
            </button>
          </div>
        </div>
      )}

      {isPreviewMode ? (
        /* Preview Component */
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs max-w-3xl mx-auto w-full">
          <div className="mb-6 border-b border-slate-200 pb-5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase">
                {period} &bull; {targetRole}
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
                  employeeWiseSubmission 
                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {employeeWiseSubmission 
                    ? (language === 'mr' ? '👤 Employee-wise Submission: Yes' : '👤 Individual Employee Submission')
                    : (language === 'mr' ? '🏢 Sub-centre Consolidated: Yes' : '🏢 Sub-centre Consolidated')}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {reportType.replace('_', ' ')}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{formName || 'Untitled Form'}</h2>
            {formDescription && <p className="text-sm text-slate-500 mt-1">{formDescription}</p>}
          </div>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {fields.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic">
                {language === 'mr' ? 'पूर्वावलोकन पाहण्यासाठी कोणतेही प्रश्न जोडलेले नाहीत.' : 'No fields added to preview.'}
              </div>
            ) : reportType === 'VILLAGE_PROGRESS' ? (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left font-bold text-slate-600 uppercase">Indicator (निर्देशक)</th>
                      <th scope="col" className="px-3 py-3 text-left font-bold text-slate-600 uppercase">Target</th>
                      <th scope="col" className="px-3 py-3 text-left font-bold text-slate-600 uppercase">Achieved</th>
                      <th scope="col" className="px-3 py-3 text-left font-bold text-slate-600 uppercase">Pending</th>
                      <th scope="col" className="px-3 py-3 text-left font-bold text-slate-600 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {fields.map((field) => (
                      <tr key={field.id}>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {field.labelEn || 'Untitled Field'}
                          {field.labelMr && <div className="text-xs text-slate-500 font-normal">{field.labelMr}</div>}
                          {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                        </td>
                        <td className="px-3 py-3"><input type="number" placeholder="100" className="w-20 border border-slate-300 rounded px-2 py-1 bg-slate-50" disabled /></td>
                        <td className="px-3 py-3"><input type="number" placeholder="85" className="w-20 border border-slate-300 rounded px-2 py-1 bg-slate-50" disabled /></td>
                        <td className="px-3 py-3 font-bold text-orange-600">15</td>
                        <td className="px-3 py-3 font-bold text-emerald-600">85%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    {language === 'mr' ? field.labelMr || field.labelEn : field.labelEn || field.labelMr}
                    <span className="text-slate-400 font-normal ml-2 text-xs">
                      ({language === 'mr' ? field.labelEn : field.labelMr})
                    </span>
                    {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                  </label>
                  
                  {field.type === 'Text' && (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                      placeholder="Enter text..."
                      disabled
                    />
                  )}
                  
                  {field.type === 'Number' && (
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                      placeholder="0"
                      disabled
                    />
                  )}
                  
                  {field.type === 'Date' && (
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500"
                      disabled
                    />
                  )}
                  
                  {field.type === 'Yes/No' && (
                    <div className="flex items-center gap-6 mt-1 text-sm text-slate-600">
                      <label className="flex items-center gap-2">
                        <input type="radio" name={field.id} disabled />
                        <span>Yes (होय)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name={field.id} disabled />
                        <span>No (नाही)</span>
                      </label>
                    </div>
                  )}
                  
                  {field.type === 'Dropdown' && (
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500"
                      disabled
                    >
                      <option value="">-- Select --</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt.value}>
                          {opt.labelEn} {opt.labelMr ? `(${opt.labelMr})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))
            )}
            
            {fields.length > 0 && (
              <div className="pt-4 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 opacity-60 cursor-not-allowed"
                  disabled
                >
                  {language === 'mr' ? 'सादर करा (पूर्वावलोकन मोड)' : 'Submit Report (Preview Mode)'}
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        /* Edit Form Configuration */
        <>
          {/* Form Meta Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {language === 'mr' ? 'अहवाल तपशील व व्याप्ती' : 'Form Details & Target Scope'}
              </h3>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">{language === 'mr' ? 'विद्यमान प्रपत्र:' : 'Load Existing:'}</span>
                <select
                  value={loadedFormId || ''}
                  onChange={handleSelectForm}
                  className="text-xs font-medium border-slate-300 rounded-lg shadow-xs focus:border-blue-500 focus:ring-blue-500 py-1.5 pl-2 pr-6 bg-slate-50 text-slate-800"
                >
                  <option value="">+ {language === 'mr' ? 'नवीन प्रपत्र तयार करा' : 'Create New Form'}</option>
                  {existingForms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} (v{f.version || 1})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadedFormId && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center justify-between">
                <div>
                  <span className="font-bold">{language === 'mr' ? 'संपादन स्थिती:' : 'Editing Form:'}</span> Version {currentVersion} ({formCode || loadedFormId})
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input 
                      type="radio" 
                      name="saveMode" 
                      value="update" 
                      checked={saveMode === 'update'} 
                      onChange={() => setSaveMode('update')}
                    />
                    <span>{language === 'mr' ? 'थेट सुधारित करा (In-place)' : 'Update In-place'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input 
                      type="radio" 
                      name="saveMode" 
                      value="new_version" 
                      checked={saveMode === 'new_version'} 
                      onChange={() => setSaveMode('new_version')}
                    />
                    <span>{language === 'mr' ? 'नवीन आवृत्ती बनवा (v' + (currentVersion + 1) + ')' : 'New Version (v' + (currentVersion + 1) + ')'}</span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="formName" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'mr' ? 'प्रपत्राचे नाव (Title / Label)' : 'Form Name / Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder={language === 'mr' ? 'उदा. मासिक उपकेंद्र सर्वसमावेशक अहवाल' : 'e.g., Monthly Health & Morbidity Report'}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'mr' ? 'कालावधी (Reporting Period)' : 'Reporting Period'}
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                >
                  <option value="Daily">{language === 'mr' ? 'दैनिक (Daily)' : 'Daily'}</option>
                  <option value="Weekly">{language === 'mr' ? 'साप्ताहिक (Weekly)' : 'Weekly'}</option>
                  <option value="Fortnightly">{language === 'mr' ? 'पाक्षिक (Fortnightly)' : 'Fortnightly'}</option>
                  <option value="Monthly">{language === 'mr' ? 'मासिक (Monthly)' : 'Monthly'}</option>
                  <option value="Quarterly">{language === 'mr' ? 'त्रैमासिक (Quarterly)' : 'Quarterly'}</option>
                  <option value="Yearly">{language === 'mr' ? 'वार्षिक (Yearly)' : 'Yearly'}</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'mr' ? 'माहिती प्रकार (Report Data Type)' : 'Report Data Type'}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                >
                  <option value="VILLAGE_NUMERICAL">{language === 'mr' ? 'गावनिहाय संख्यात्मक अहवाल' : 'Village-wise Numerical'}</option>
                  <option value="VILLAGE_PROGRESS">{language === 'mr' ? 'गावनिहाय प्रगती अहवाल (Target & Achievement)' : 'Village-wise Progress (Target & Achievement)'}</option>
                  <option value="LIST">{language === 'mr' ? 'यादी अहवाल (List Format)' : 'List Format'}</option>
                  <option value="SUBCENTRE_LEVEL">{language === 'mr' ? 'उपकेंद्र स्तर (एकत्रित)' : 'Sub-centre Level (Consolidated)'}</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'mr' ? 'लागू असलेले पद (Target Role)' : 'Target Role'}
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-purple-700"
                >
                  <option value="ALL">{language === 'mr' ? 'सर्व कर्मचारी (Universal - MPW/ANM/CHO)' : 'All Roles (Universal - MPW/ANM/CHO)'}</option>
                  <option value="MPW">MPW (Multi-Purpose Worker)</option>
                  <option value="ANM">ANM (Auxiliary Nurse Midwife)</option>
                  <option value="CHO">CHO (Community Health Officer)</option>
                  <option value="PHC_CONTROLLER">PHC Controller</option>
                  <option value="TALUKA_CONTROLLER">Taluka Controller</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'mr' ? 'अहवालाचे वर्णन / मार्गदर्शक सूचना' : 'Description / Guidelines'}
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={language === 'mr' ? 'कर्मचाऱ्यांसाठी माहिती व शेरा...' : 'Brief guidelines for field reporters...'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

              {/* EMPLOYEE-WISE REPORT SUBMISSION RULE */}
              <div className="sm:col-span-6 bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/90 border-2 border-blue-200/80 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                        {language === 'mr' ? 'सादरीकरण नियम (Submission Rule)' : 'Submission Rule'}
                      </span>
                      <span className="text-xs text-blue-900 font-bold">
                        {language === 'mr' ? 'उपकेंद्र व कर्मचारी नियम' : 'Sub-centre & Employee Policy'}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1.5">
                      {language === 'mr' 
                        ? 'Report भरताना Employee-wise submission आवश्यक आहे का?' 
                        : 'Is Employee-wise submission required for this report?'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {language === 'mr'
                        ? 'खालीलपैकी योग्य पर्याय निवडा - यामुळे अहवाल पूर्ण मानण्याची पद्धत व अनुपालन (Compliance) निश्चित होईल.'
                        : 'Choose whether each health worker must file separately or any staff member can submit on behalf of the sub-centre.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                      {/* Option 1: YES - Individual */}
                      <label 
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          employeeWiseSubmission
                            ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="employeeWiseSubmission"
                              checked={employeeWiseSubmission === true}
                              onChange={() => setEmployeeWiseSubmission(true)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <span className="font-bold text-slate-900 text-sm">
                              {language === 'mr' ? '1. Yes – प्रत्येक Employee ने स्वतंत्र report भरावा.' : '1. Yes – Individual report per employee'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 whitespace-nowrap">
                            Individual
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-600 pl-6 space-y-1.5 border-t border-slate-100 pt-2.5">
                          <p className="font-semibold text-slate-800">
                            {language === 'mr' ? 'उदा. एका Sub-centre मध्ये:' : 'Example in a Sub-centre:'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-medium">MPW-1 report</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-medium">MPW-2 report</span>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[11px] font-medium">ANM report</span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium">CHO report</span>
                          </div>
                          <p className="text-[11px] text-blue-700 font-medium pt-1">
                            {language === 'mr' 
                              ? '➔ सर्व अहवाल स्वतंत्रपणे अपेक्षित असतील व प्रत्येकाचे अनुपालन वेगवेगळे तपासले जाईल.'
                              : '➔ Separate reports expected from each employee; compliance is tracked individually.'}
                          </p>
                        </div>
                      </label>

                      {/* Option 2: NO - Sub-centre Level */}
                      <label 
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          !employeeWiseSubmission
                            ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="employeeWiseSubmission"
                              checked={employeeWiseSubmission === false}
                              onChange={() => setEmployeeWiseSubmission(false)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                            />
                            <span className="font-bold text-slate-900 text-sm">
                              {language === 'mr' 
                                ? '2. No – Sub-centre मधील कोणत्याही एका authorized Employee ने report भरला तरी चालेल.' 
                                : '2. No – Sub-centre consolidated submission'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap">
                            Sub-centre Level
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-600 pl-6 space-y-1.5 border-t border-slate-100 pt-2.5">
                          <p className="font-semibold text-slate-800">
                            {language === 'mr' ? 'उपकेंद्र एकत्रित नियम:' : 'Facility consolidated policy:'}
                          </p>
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-900 font-medium leading-relaxed">
                            {language === 'mr' 
                              ? '✓ Sub-centre मधील कोणत्याही authorized employee ने report submit केला की त्या period साठी report complete मानला जाईल.' 
                              : '✓ Once any authorized employee submits, the report is marked complete for the whole sub-centre for that period.'}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {language === 'mr' ? 'अहवाल निर्देशक व प्रश्न (Form Fields)' : 'Form Fields & Indicators'} ({fields.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'mr' ? 'प्रत्येक निर्देशकासाठी इंग्रजी व मराठी नाव आणि प्रकार निवडा' : 'Configure bilingual labels and input types'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addField()}
                className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-xs transition-colors"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {language === 'mr' ? 'नवीन निर्देशक जोडा' : 'Add Field'}
              </button>
            </div>

            {reportType === 'VILLAGE_PROGRESS' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3.5 rounded-r-lg text-xs text-blue-800">
                <strong>{language === 'mr' ? 'प्रगती अहवाल माहिती:' : 'Village Progress Report Note:'}</strong> {language === 'mr' ? 'खाली जोडलेला प्रत्येक निर्देशक "Indicator" म्हणून गणला जाईल. सिस्टम स्वयंचलितपणे Target, Achieved, Pending व % चे कॉलम तयार करेल.' : 'Each field represents an indicator. Target, Achievement, Pending, and % columns are generated automatically.'}
              </div>
            )}

            <div className={`space-y-4 ${compactMode ? 'compact-mode' : ''}`}>
              {fields.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                  <Settings className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-2 text-sm font-bold text-slate-800">
                    {language === 'mr' ? 'कोणतेही निर्देशक जोडलेले नाहीत' : 'No fields added yet'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {language === 'mr' ? 'वर दिलेल्या "मानक प्रपत्र टेम्पलेट्स" मधून निवडा किंवा नवीन निर्देशक जोडा.' : 'Select a preset template above or click "Add Field" to start.'}
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => addField()}
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      {language === 'mr' ? 'पहिला निर्देशक जोडा' : 'Add First Field'}
                    </button>
                  </div>
                </div>
              ) : (
                buildFieldTree(fields).map((field, index) => renderFieldNode(field, index))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
