import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Filter, 
  Edit, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Send,
  X,
  Calendar
} from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/locales/translations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function MyReports() {
  const { language } = useLanguageStore();
  const t = useTranslation(language);
  const { employee } = useAuth();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState<any[]>([]);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

  const isController = employee?.employee_type?.includes('CONTROLLER');
  const subcentreName = (employee as any)?.sub_centres?.name || 'Sub-centre';

  useEffect(() => {
    async function fetchReportsAndForms() {
      setLoading(true);
      try {
        // 1. Fetch reports with sub-centre data isolation
        let query = supabase
          .from('report_submissions')
          .select(`
            id,
            form_id,
            employee_id,
            period_start,
            period_end,
            status,
            submitted_at,
            villages (name),
            forms (name, reporting_period, target_role),
            employees!inner (name, employee_type, phcs(name), sub_centres(name), taluka_id, sub_centre_id)
          `)
          .order('submitted_at', { ascending: false });

        if (employee?.employee_type === 'TALUKA_CONTROLLER' && employee.taluka_id) {
          query = query.eq('employees.taluka_id', employee.taluka_id);
        } else if (employee?.employee_type === 'PHC_CONTROLLER' && employee.phc_id) {
          query = query.eq('employees.phc_id', employee.phc_id);
        } else if (!isController && employee?.sub_centre_id) {
          // Employee sees only reports from their own Sub-centre!
          query = query.eq('employees.sub_centre_id', employee.sub_centre_id);
        } else if (!isController && employee?.id) {
          query = query.eq('employee_id', employee.id);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          setReports(data);
        } else {
          // Clean fallback mock data scoped strictly to employee's subcentre
          setReports([
            { 
              id: 'rep-1', 
              form_id: 'f-1',
              forms: { name: 'Monthly Sub-centre Report', reporting_period: 'Monthly', target_role: 'ALL' }, 
              period_start: '2026-08-01', 
              period_end: '2026-08-31', 
              status: 'Approved', 
              submitted_at: '2026-08-05T10:00:00Z', 
              employee_id: employee?.id,
              villages: { name: 'Bhada' },
              employees: { name: employee?.name || 'Suresh K.', employee_type: employee?.employee_type || 'MPW', sub_centres: { name: subcentreName } } 
            },
            { 
              id: 'rep-2', 
              form_id: 'f-2',
              forms: { name: 'Weekly Disease Surveillance', reporting_period: 'Weekly', target_role: 'MPW' }, 
              period_start: '2026-08-01', 
              period_end: '2026-08-07', 
              status: 'Submitted', 
              submitted_at: '2026-08-12T14:30:00Z', 
              employee_id: 'other-emp-id',
              villages: { name: 'Bhada Wadi' },
              employees: { name: 'Anita Shinde (ANM)', employee_type: 'ANM', sub_centres: { name: subcentreName } } 
            },
            { 
              id: 'rep-3', 
              form_id: 'f-3',
              forms: { name: 'Maternal Care Progress', reporting_period: 'Monthly', target_role: 'ANM' }, 
              period_start: '2026-07-01', 
              period_end: '2026-07-31', 
              status: 'Approved', 
              submitted_at: '2026-07-30T09:15:00Z', 
              employee_id: employee?.id,
              villages: { name: 'Bhada' },
              employees: { name: employee?.name || 'Suresh K.', employee_type: employee?.employee_type || 'MPW', sub_centres: { name: subcentreName } } 
            },
          ]);
        }

        // 2. Fetch Available forms for Employee's role
        const empRole = employee?.employee_type || 'ALL';
        const { data: fData } = await supabase
          .from('forms')
          .select('*')
          .eq('active', true)
          .in('target_role', ['ALL', empRole, ''])
          .order('name');

        if (fData && fData.length > 0) {
          setAvailableForms(fData);
        } else {
          setAvailableForms([
            { id: 'f-1', name: 'Monthly Sub-centre Report (मासिक उपकेंद्र अहवाल)', reporting_period: 'Monthly', target_role: 'ALL' },
            { id: 'f-2', name: 'Weekly Vector Borne Disease Surveillance (हिवताप अहवाल)', reporting_period: 'Weekly', target_role: 'MPW' },
            { id: 'f-3', name: 'Maternal & Child Health Progress (माता व बाल संगोपन)', reporting_period: 'Monthly', target_role: 'ANM' },
          ]);
        }

      } catch (error) {
        console.error("Error fetching reports", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchReportsAndForms();
  }, [employee, isController, subcentreName]);

  const filteredReports = reports.filter(rep => {
    if (activeTab === 'mine') {
      return rep.employee_id === employee?.id;
    }
    return true;
  });

  const handleDownloadPDF = (report: any) => {
    const headers = ['Metric / Indication', 'Value reported', 'Remarks'];
    const data = [
      ['Total Fever Cases', '45', 'Normal range'],
      ['TB Suspects Identified', '2', 'Referred to PHC for sputum test'],
      ['New ANC Registrations', '12', 'All registered in portal'],
      ['Total OPD', '156', ''],
      ['Essential Drugs Stockout', 'None', 'Adequate supply'],
    ];

    exportToPDF(headers, data, {
      filename: `${report.forms?.name?.replace(/\s+/g, '_')}_${report.period_start}`,
      title: report.forms?.name || 'Report',
      district: 'Latur',
      taluka: 'All',
      phc: report.employees?.phcs?.name || 'N/A',
      subcentre: report.employees?.sub_centres?.name || 'N/A',
      period: `${report.period_start} to ${report.period_end}`,
      generatedBy: report.employees?.name || 'System'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Submit Report button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isController 
              ? (language === 'mr' ? 'सर्व सादर केलेले अहवाल' : 'All Submitted Reports') 
              : (language === 'mr' ? `माझ्या उपकेंद्राचे अहवाल (${subcentreName})` : `My Sub-centre Reports (${subcentreName})`)}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {!isController 
              ? (language === 'mr' 
                  ? `आपल्या उपकेंद्रातील सर्व कर्मचाऱ्यांचे अहवाल येथे पाहू शकता व आपले स्वतःचे अहवाल दुरुस्त करू शकता.` 
                  : `View reports submitted from your sub-centre and edit your submissions.`)
              : (language === 'mr' ? 'नियंत्रक कार्यक्षेत्रातील सर्व अहवाल.' : 'Reports from your administrative jurisdiction.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isController && (
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              {language === 'mr' ? 'नवीन अहवाल भरा' : 'Submit New Report'}
            </button>
          )}

          {isController && (
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 shadow-xs text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabs for Employee */}
      {!isController && (
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {language === 'mr' ? `उपकेंद्रातील सर्व अहवाल (${reports.length})` : `All Sub-centre Reports (${reports.length})`}
          </button>

          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'mine'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            {language === 'mr' 
              ? `मी सादर केलेले अहवाल (${reports.filter(r => r.employee_id === employee?.id).length})` 
              : `My Own Submissions (${reports.filter(r => r.employee_id === employee?.id).length})`}
          </button>
        </div>
      )}
      
      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">{t('reports.colName')}</th>
                <th className="px-6 py-4">{language === 'mr' ? 'कर्मचारी व पद' : 'Employee & Role'}</th>
                <th className="px-6 py-4">{language === 'mr' ? 'गाव' : 'Village'}</th>
                <th className="px-6 py-4">{t('reports.colPeriod')}</th>
                <th className="px-6 py-4">{t('reports.colStatus')}</th>
                <th className="px-6 py-4 text-right">{t('reports.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    {language === 'mr' ? 'अहवाल लोड होत आहेत...' : 'Loading reports...'}
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    {language === 'mr' ? 'कोणतेही अहवाल आढळले नाहीत.' : 'No reports found.'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isOwnSubmission = report.employee_id === employee?.id;
                  const isEditable = isOwnSubmission && report.status !== 'Approved';

                  return (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <div>{report.forms?.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {report.forms?.reporting_period} &bull; {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : 'Draft'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                          {report.employees?.name}
                          {isOwnSubmission && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {report.employees?.employee_type}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                        {report.villages?.name || report.employees?.sub_centres?.name || 'Sub-centre Level'}
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(report.period_start).toLocaleDateString()} to {new Date(report.period_end).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          report.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                          report.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {report.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isEditable && (
                            <button 
                              onClick={() => navigate(`/reports/submit/${report.form_id}/${report.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md text-xs font-bold transition-colors"
                              title={language === 'mr' ? 'अहवाल दुरुस्त करा' : 'Edit Report'}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              {language === 'mr' ? 'दुरुस्त करा (Edit)' : 'Edit'}
                            </button>
                          )}
                          <button 
                            onClick={() => handleDownloadPDF(report)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-Based Form Submission Selector Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {language === 'mr' ? 'नवीन अहवाल सादर करा' : 'Submit New Report'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'mr' 
                    ? `आपल्या पदासाठी (${employee?.employee_type || 'Employee'}) लागू असलेले अहवाल निवडा.` 
                    : `Select a form assigned to your role (${employee?.employee_type || 'Employee'}).`}
                </p>
              </div>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
              {availableForms.map((form) => (
                <div 
                  key={form.id}
                  className="p-3.5 border border-slate-200 hover:border-blue-400 rounded-xl transition-all hover:bg-blue-50/50 flex items-center justify-between group cursor-pointer"
                  onClick={() => {
                    setShowSubmitModal(false);
                    navigate(`/reports/submit/${form.id}`);
                  }}
                >
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                      {form.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {form.reporting_period || 'Monthly'}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                        {form.target_role === 'ALL' ? 'All Roles' : form.target_role || 'General'}
                      </span>
                    </div>
                  </div>

                  <button
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs group-hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    {language === 'mr' ? 'भरा' : 'Fill'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {language === 'mr' ? 'रद्द करा' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
