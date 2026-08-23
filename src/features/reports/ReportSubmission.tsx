import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Mock types for the UI
type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No';

interface FormField {
  id: string;
  label_en: string;
  label_mr: string;
  name: string;
  field_type: FieldType;
  is_required: boolean;
}

interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
}

export default function ReportSubmission() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app with Supabase, we would fetch the form definition here.
    // We simulate it for the preview if Supabase is disconnected.
    async function loadForm() {
      try {
        setLoading(true);
        // Attempt Supabase fetch
        const { data, error } = await supabase
          .from('forms')
          .select('id, name, description')
          .eq('id', formId)
          .single();

        if (error) throw error;
        
        // Fetch fields...
        // ... (simplified for this example)
        
      } catch (err) {
        console.warn('Supabase fetch failed, using mock data for UI preview', err);
        // Fallback for visual preview in AI Studio
        setForm({
          id: formId || 'mock-id',
          name: 'Monthly Sub-centre Report',
          description: 'Please enter the accurate numerical data for the previous month.',
          fields: [
            { id: '1', name: 'fever_cases', label_en: 'Total Fever Cases', label_mr: 'एकूण तापाचे रुग्ण', field_type: 'Number', is_required: true },
            { id: '2', name: 'tb_suspects', label_en: 'TB Suspects Identified', label_mr: 'क्षयरोग संशयित', field_type: 'Number', is_required: true },
            { id: '3', name: 'anc_reg', label_en: 'New ANC Registrations', label_mr: 'नवीन माता नोंदणी', field_type: 'Number', is_required: false },
            { id: '4', name: 'remarks', label_en: 'Remarks / Notes', label_mr: 'शेरा', field_type: 'Text', is_required: false },
          ]
        });
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [formId]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Logic to submit to Supabase
      // await supabase.from('report_submissions').insert(...)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Report submitted successfully!');
      navigate('/reports/my');
    } catch (err) {
      setError('Failed to submit report. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading form...</div>;
  }

  if (!form) {
    return <div className="text-red-600">Form not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-gray-300 rounded-full text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
          {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-5 sm:p-6 space-y-6">
          
          <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-gray-500">Village</span>
                <span className="font-medium text-gray-900">Bhada (413520)</span>
              </div>
              <div>
                <span className="block text-gray-500">Reporting Period</span>
                <span className="font-medium text-gray-900">August 2026</span>
              </div>
            </div>
          </div>

          {form.fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                {field.label_en} <span className="text-gray-400 font-normal ml-1">({field.label_mr})</span>
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="mt-1">
                {field.field_type === 'Number' ? (
                  <input
                    type="number"
                    id={field.id}
                    required={field.is_required}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                ) : (
                  <input
                    type="text"
                    id={field.id}
                    required={field.is_required}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 flex justify-end space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="mr-2 h-4 w-4 text-gray-500" />
            Save Draft
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
