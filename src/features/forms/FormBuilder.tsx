import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Save, 
  GripVertical, 
  Pencil, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  FileText,
  HelpCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/languageStore';

// Types matching the DB enums
type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No';
type ReportPeriod = 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'Yearly';
type ReportType = 'VILLAGE_NUMERICAL' | 'VILLAGE_PROGRESS' | 'LIST' | 'SUBCENTRE_LEVEL';

interface FormFieldOption {
  id: string;
  labelEn: string;
  labelMr: string;
  value: string;
}

interface FormField {
  id: string;
  labelEn: string;
  labelMr: string;
  type: FieldType;
  required: boolean;
  options?: FormFieldOption[];
}

export default function FormBuilder() {
  const { employee } = useAuth();
  const { language } = useLanguageStore();

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCode, setFormCode] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('Monthly');
  const [reportType, setReportType] = useState<ReportType>('VILLAGE_NUMERICAL');
  const [targetRole, setTargetRole] = useState<string>('ALL');
  const [fields, setFields] = useState<FormField[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saveMode, setSaveMode] = useState<'update' | 'new_version'>('update');
  
  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Versioning state
  const [existingForms, setExistingForms] = useState<any[]>([]);
  const [loadedFormId, setLoadedFormId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [parentFormId, setParentFormId] = useState<string | null>(null);
  const [loadingForms, setLoadingForms] = useState(false);

  const fetchForms = async () => {
    setLoadingForms(true);
    try {
      const { data, error } = await (supabase
        .from('forms') as any)
        .select('*')
        .order('name');
      
      if (!error && data) {
        setExistingForms(data);
      }
    } catch (err) {
      console.error('Error fetching forms:', err);
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleSelectForm = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedId) {
      // Reset to create new
      setLoadedFormId(null);
      setParentFormId(null);
      setCurrentVersion(1);
      setFormName('');
      setFormDescription('');
      setFormCode('');
      setPeriod('Monthly');
      setReportType('VILLAGE_NUMERICAL');
      setTargetRole('ALL');
      setFields([]);
      setSaveMode('update');
      return;
    }

    const form = existingForms.find(f => f.id === selectedId);
    if (!form) return;

    setLoadedFormId(form.id);
    setParentFormId(form.parent_form_id || form.id);
    setCurrentVersion(form.version || 1);
    setFormName(form.name || '');
    setFormDescription(form.description || '');
    setFormCode(form.code || '');
    setPeriod((form.reporting_period as ReportPeriod) || 'Monthly');
    setReportType((form.report_type as ReportType) || 'VILLAGE_NUMERICAL');
    setTargetRole(form.target_role || 'ALL');

    // Fetch form sections and fields
    try {
      const { data: sections } = await (supabase
        .from('form_sections') as any)
        .select('id')
        .eq('form_id', form.id);

      if (sections && sections.length > 0) {
        const sectionIds = sections.map((s: any) => s.id);
        const { data: dbFields } = await (supabase
          .from('form_fields') as any)
          .select('*, form_field_options(*)')
          .in('section_id', sectionIds)
          .order('display_order');

        if (dbFields && dbFields.length > 0) {
          setFields(dbFields.map((dbf: any) => ({
            id: crypto.randomUUID(),
            labelEn: dbf.label_en || '',
            labelMr: dbf.label_mr || '',
            type: (dbf.field_type as FieldType) || 'Text',
            required: !!dbf.is_required,
            options: dbf.form_field_options?.sort((a: any, b: any) => a.display_order - b.display_order).map((opt: any) => ({
              id: crypto.randomUUID(),
              labelEn: opt.label_en || '',
              labelMr: opt.label_mr || '',
              value: opt.value || ''
            })) || []
          })));
        } else {
          setFields([]);
        }
      } else {
        setFields([]);
      }
    } catch (err) {
      console.error('Error fetching fields for form:', err);
    }
  };

  const addField = () => {
    setFields([
      ...fields, 
      { 
        id: crypto.randomUUID(), 
        labelEn: '', 
        labelMr: '', 
        type: 'Number', 
        required: true,
        options: []
      }
    ]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    setFields(newFields);
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

  const updateOption = (fieldId: string, optionId: string, updates: Partial<FormFieldOption>) => {
    setFields(fields.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          options: f.options?.map(opt => opt.id === optionId ? { ...opt, ...updates } : opt)
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

    if (presetType === 'maternal') {
      setFormName('Maternal & Child Health Tracking (माता व बाल आरोग्य नोंद)');
      setFormDescription('Monthly Antenatal care, institutional deliveries, and infant immunizations.');
      setPeriod('Monthly');
      setReportType('VILLAGE_NUMERICAL');
      setTargetRole('ANM');
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
      setFields([
        { id: crypto.randomUUID(), labelEn: 'Individuals Screened for Hypertension (30+ yrs)', labelMr: '३० वर्षांवरील रक्तदाब तपासणी', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Individuals Screened for Diabetes', labelMr: 'मधुमेह (डायबेटीस) तपासणी', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Confirmed Cases on Regular Treatment', labelMr: 'नियमित उपचारावर असलेले रुग्ण', type: 'Number', required: true },
        { id: crypto.randomUUID(), labelEn: 'Wellness & Yoga Sessions Conducted', labelMr: 'आयोजित योग व आरोग्य सत्रे', type: 'Number', required: false },
      ]);
    }
  };

  const handleSave = async () => {
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

    try {
      // 1. Generate or determine safe unique code
      let generatedCode = formCode.trim();
      if (!generatedCode) {
        const cleanSlug = formName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 30);
        generatedCode = cleanSlug ? `${cleanSlug}_${Date.now().toString().slice(-4)}` : `FORM_${Date.now()}`;
      }

      let targetFormId = loadedFormId;

      if (loadedFormId && saveMode === 'update') {
        // Mode A: Update existing form directly
        const { error: updateFormErr } = await (supabase
          .from('forms') as any)
          .update({
            name: formName.trim(),
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            target_role: targetRole,
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', loadedFormId);

        if (updateFormErr) throw updateFormErr;

        // Clean existing sections & fields for this form
        const { data: existingSecs } = await (supabase
          .from('form_sections') as any)
          .select('id')
          .eq('form_id', loadedFormId);

        if (existingSecs && existingSecs.length > 0) {
          const secIds = existingSecs.map((s: any) => s.id);
          await (supabase.from('form_fields') as any).delete().in('section_id', secIds);
          await (supabase.from('form_sections') as any).delete().eq('form_id', loadedFormId);
        }

      } else {
        // Mode B: Create new form OR publish as new version
        let finalParentId = parentFormId;
        let nextVersion = currentVersion;

        if (loadedFormId && saveMode === 'new_version') {
          // Deactivate previous version so standard lists point to current
          await (supabase.from('forms') as any).update({ active: false }).eq('id', loadedFormId);
          finalParentId = parentFormId || loadedFormId;
          nextVersion = currentVersion + 1;
        }

        const newFormPayload = {
          name: formName.trim(),
          code: generatedCode,
          description: formDescription.trim(),
          reporting_period: period,
          report_type: reportType,
          target_role: targetRole,
          version: nextVersion,
          parent_form_id: finalParentId,
          active: true,
          created_by: employee?.id || null
        };

        const { data: createdForm, error: formError } = await (supabase
          .from('forms') as any)
          .insert(newFormPayload)
          .select()
          .single();

        if (formError) throw formError;
        targetFormId = createdForm.id;
      }

      if (!targetFormId) throw new Error('Could not obtain valid Form ID.');

      // 2. Create Section
      const { data: section, error: sectionError } = await (supabase
        .from('form_sections') as any)
        .insert({ 
          form_id: targetFormId, 
          title: 'General Section',
          display_order: 0
        })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // 3. Insert Fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((f, index) => {
          const safeName = (f.labelEn || f.labelMr || `field_${index + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40) || `field_${index + 1}`;

          return {
            section_id: section.id,
            label_en: f.labelEn.trim() || f.labelMr.trim(),
            label_mr: f.labelMr.trim() || f.labelEn.trim(),
            name: `${safeName}_${index + 1}`,
            field_type: f.type,
            is_required: f.required,
            display_order: index,
          };
        });

        const { data: insertedFields, error: fieldsError } = await (supabase
          .from('form_fields') as any)
          .insert(fieldsToInsert)
          .select();

        if (fieldsError) throw fieldsError;

        // 4. Insert Dropdown Options if any
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
          const { error: optionsError } = await (supabase
            .from('form_field_options') as any)
            .insert(optionsToInsert);
          
          if (optionsError) throw optionsError;
        }
      }

      setSuccessMsg(
        language === 'mr' 
          ? `अहवाल प्रपत्र '${formName}' यशस्वीरीत्या प्रकाशित झाले आहे!` 
          : `Form '${formName}' published and live for field reporting!`
      );

      // Refresh forms dropdown list
      await fetchForms();

    } catch (error: any) {
      console.error('Error publishing form:', error);
      setErrorMsg(error?.message || 'Database error while publishing form. Please check permissions.');
    } finally {
      setIsSaving(false);
    }
  };

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
            onClick={handleSave}
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
                      ? (language === 'mr' ? 'बदल जतन करा (Save Changes)' : 'Update Live Form') 
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
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start justify-between shadow-xs">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {language === 'mr' ? 'अहवाल जतन करताना त्रुटी आली:' : 'Failed to save form:'}
              </p>
              <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 text-sm font-bold">×</button>
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
            </div>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600 text-sm font-bold">×</button>
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
              <span className="text-xs text-slate-400 font-medium">
                {reportType.replace('_', ' ')}
              </span>
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
                onClick={addField}
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

            <div className="space-y-4">
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
                      onClick={addField}
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      {language === 'mr' ? 'पहिला निर्देशक जोडा' : 'Add First Field'}
                    </button>
                  </div>
                </div>
              ) : (
                fields.map((field, index) => (
                  <div 
                    key={field.id} 
                    className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"
                  >
                    {/* Index & Reorder */}
                    <div className="flex sm:flex-col items-center gap-1">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex sm:flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(index, 'down')}
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
                            onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                            className="w-full sm:text-sm border-slate-300 rounded-lg py-1.5 pl-3 pr-6 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                          >
                            <option value="Number">Number (संख्या)</option>
                            <option value="Text">Text (मजकूर)</option>
                            <option value="Yes/No">Yes/No (होय/नाही)</option>
                            <option value="Date">Date (दिनांक)</option>
                            <option value="Dropdown">Dropdown (यादी)</option>
                          </select>
                        </div>
                      )}

                      {/* Dropdown Options Editor */}
                      {reportType !== 'VILLAGE_PROGRESS' && field.type === 'Dropdown' && (
                        <div className="sm:col-span-12 mt-1 p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dropdown Options (पर्याय)</span>
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
                              <div key={option.id} className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 w-4 font-bold">{optIdx + 1}.</span>
                                <input
                                  type="text"
                                  placeholder="Option EN (e.g. Normal)"
                                  value={option.labelEn}
                                  onChange={(e) => updateOption(field.id, option.id, { labelEn: e.target.value })}
                                  className="flex-1 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                />
                                <input
                                  type="text"
                                  placeholder="Option MR (उदा. सामान्य)"
                                  value={option.labelMr}
                                  onChange={(e) => updateOption(field.id, option.id, { labelMr: e.target.value })}
                                  className="flex-1 sm:text-xs border-slate-300 rounded-md py-1 px-2 border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(field.id, option.id)}
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

                      <div className="sm:col-span-12 flex items-center justify-between mt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                          />
                          <span>{language === 'mr' ? 'अनिवार्य निर्देशक (Required Field *)' : 'Required field *'}</span>
                        </label>

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
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
