import { useState } from 'react';
import { Plus, Trash2, Settings, Eye, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Helper types matching the DB enums
type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No';
type ReportPeriod = 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly';
type ReportType = 'VILLAGE_NUMERICAL' | 'LIST' | 'SUBCENTRE_LEVEL';

interface FormField {
  id: string;
  labelEn: string;
  labelMr: string;
  type: FieldType;
  required: boolean;
}

export default function FormBuilder() {
  const [formName, setFormName] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('Monthly');
  const [reportType, setReportType] = useState<ReportType>('VILLAGE_NUMERICAL');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const addField = () => {
    setFields([...fields, { 
      id: crypto.randomUUID(), 
      labelEn: '', 
      labelMr: '', 
      type: 'Text', 
      required: false 
    }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Create the form in Supabase
      const { data: form, error: formError } = await supabase
        .from('forms')
        .insert({
          name: formName,
          code: formName.toLowerCase().replace(/\s+/g, '_'),
          reporting_period: period,
          report_type: reportType,
        })
        .select()
        .single();

      if (formError) throw formError;

      // Create a default section
      const { data: section, error: sectionError } = await supabase
        .from('form_sections')
        .insert({ form_id: form.id, title: 'Main Section' })
        .select()
        .single();

      if (sectionError) throw sectionError;

      // Insert fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((f, index) => ({
          section_id: section.id,
          label_en: f.labelEn,
          label_mr: f.labelMr,
          name: f.labelEn.toLowerCase().replace(/\s+/g, '_'),
          field_type: f.type,
          is_required: f.required,
          display_order: index,
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      alert('Form saved successfully!');
      // Reset form or navigate
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Failed to save form. (Note: Requires Supabase setup to be complete)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dynamic Form Builder</h1>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Eye className="mr-2 h-4 w-4 text-gray-500" />
            Preview
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !formName}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Publish Form'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Form Details</h3>
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="formName" className="block text-sm font-medium text-gray-700">Form Name (English)</label>
              <div className="mt-1">
                <input
                  type="text"
                  name="formName"
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="e.g., Monthly Health Report"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Reporting Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Report Data Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="VILLAGE_NUMERICAL">Village-wise Numerical</option>
                <option value="LIST">List Report (e.g., Patient List)</option>
                <option value="SUBCENTRE_LEVEL">Sub-centre Level</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Form Fields</h3>
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Field
            </button>
          </div>

          <div className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <Settings className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No fields</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a new field to this form.</p>
                <div className="mt-6">
                  <button
                    onClick={addField}
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Field
                  </button>
                </div>
              </div>
            ) : (
              fields.map((field, index) => (
                <div key={field.id} className="relative bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-4 hover:border-blue-300 transition-colors">
                  <div className="flex-shrink-0 pt-1">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Field Label (English)</label>
                      <input
                        type="text"
                        value={field.labelEn}
                        onChange={(e) => updateField(field.id, { labelEn: e.target.value })}
                        className="block w-full sm:text-sm border-gray-300 rounded-md py-1.5 px-3 border focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Fever Cases"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Field Label (Marathi)</label>
                      <input
                        type="text"
                        value={field.labelMr}
                        onChange={(e) => updateField(field.id, { labelMr: e.target.value })}
                        className="block w-full sm:text-sm border-gray-300 rounded-md py-1.5 px-3 border focus:ring-blue-500 focus:border-blue-500"
                        placeholder="उदा. तापाचे रुग्ण"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                        className="block w-full sm:text-sm border-gray-300 rounded-md py-1.5 pl-3 pr-8 border focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Text">Text</option>
                        <option value="Number">Number</option>
                        <option value="Yes/No">Yes/No</option>
                        <option value="Date">Date</option>
                      </select>
                    </div>
                    <div className="sm:col-span-12 flex items-center mt-2">
                      <input
                        id={`required-${field.id}`}
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`required-${field.id}`} className="ml-2 block text-sm text-gray-900">
                        Required field
                      </label>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => removeField(field.id)}
                      className="text-gray-400 hover:text-red-500 focus:outline-none p-1 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
