import { useState, useEffect } from 'react';
import { FileText, Download, Filter } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/locales/translations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function MyReports() {
  const { language } = useLanguageStore();
  const t = useTranslation(language);
  const { employee } = useAuth();
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isController = employee?.employee_type?.includes('CONTROLLER');

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        let query = supabase
          .from('report_submissions')
          .select(`
            id,
            period_start,
            period_end,
            status,
            submitted_at,
            forms (name, reporting_period),
            employees!inner (name, employee_type, phcs(name), sub_centres(name), taluka_id)
          `)
          .order('submitted_at', { ascending: false });

        if (employee?.employee_type === 'TALUKA_CONTROLLER' && employee.taluka_id) {
          query = query.eq('employees.taluka_id', employee.taluka_id);
        } else if (!isController && employee?.id) {
          query = query.eq('employee_id', employee.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        if (data && data.length > 0) {
          setReports(data);
        } else {
          // Fallback to mock data if empty (for prototype showcase)
          setReports([
            { id: 1, forms: { name: 'Monthly Sub-centre Report', reporting_period: 'Monthly' }, period_start: '2026-08-01', period_end: '2026-08-31', status: 'Approved', submitted_at: '2026-08-05T10:00:00Z', employees: { name: 'Suresh K.', phcs: { name: 'Bhada PHC' } } },
            { id: 2, forms: { name: 'Weekly Disease Surveillance', reporting_period: 'Weekly' }, period_start: '2026-08-01', period_end: '2026-08-07', status: 'Submitted', submitted_at: '2026-08-12T14:30:00Z', employees: { name: 'Sunita Sharma', sub_centres: { name: 'Ausa SC' } } },
            { id: 3, forms: { name: 'TB Patient List', reporting_period: 'Monthly' }, period_start: '2026-07-01', period_end: '2026-07-31', status: 'Approved', submitted_at: '2026-07-30T09:15:00Z', employees: { name: 'Priya Joshi', phcs: { name: 'Nilanga PHC' } } },
          ]);
        }
      } catch (error) {
        console.error("Error fetching reports", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (employee) {
      fetchReports();
    }
  }, [employee]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          {isController ? 'All Submitted Reports' : t('reports.title')}
        </h1>
        {isController && (
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">{t('reports.colName')}</th>
                {isController && <th className="px-6 py-4">Submitted By</th>}
                <th className="px-6 py-4">{t('reports.colPeriod')}</th>
                <th className="px-6 py-4">{t('reports.colDate')}</th>
                <th className="px-6 py-4">{t('reports.colStatus')}</th>
                <th className="px-6 py-4 text-right">{t('reports.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={isController ? 6 : 5} className="px-6 py-8 text-center text-slate-500 italic">
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={isController ? 6 : 5} className="px-6 py-8 text-center text-slate-500 italic">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-500" />
                        {report.forms?.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 ml-7">{report.forms?.reporting_period}</div>
                    </td>
                    {isController && (
                      <td className="px-6 py-4 text-slate-500">
                        <div className="font-medium text-slate-700">{report.employees?.name}</div>
                        <div className="text-[10px]">{report.employees?.phcs?.name || report.employees?.sub_centres?.name || 'District Level'}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-500">{new Date(report.period_start).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-500">{report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        report.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                        report.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDownloadPDF(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
