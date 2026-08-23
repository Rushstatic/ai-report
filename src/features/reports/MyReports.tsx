import { FileText, Download } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/locales/translations';

export default function MyReports() {
  const { language } = useLanguageStore();
  const t = useTranslation(language);

  const mockReports = [
    { id: 1, name: 'Monthly Sub-centre Report', period: 'August 2026', status: 'Approved', date: '2026-08-05' },
    { id: 2, name: 'Weekly Disease Surveillance', period: 'Week 31 (2026)', status: 'Submitted', date: '2026-08-12' },
    { id: 3, name: 'TB Patient List', period: 'July 2026', status: 'Approved', date: '2026-07-30' },
  ];

  const handleDownloadPDF = (report: any) => {
    // Mock data for the PDF
    const headers = ['Metric / Indication', 'Value reported', 'Remarks'];
    const data = [
      ['Total Fever Cases', '45', 'Normal range'],
      ['TB Suspects Identified', '2', 'Referred to PHC for sputum test'],
      ['New ANC Registrations', '12', 'All registered in portal'],
      ['Total OPD', '156', ''],
      ['Essential Drugs Stockout', 'None', 'Adequate supply'],
    ];

    exportToPDF(headers, data, {
      filename: `${report.name.replace(/\s+/g, '_')}_${report.period}`,
      title: report.name,
      district: 'Latur',
      taluka: 'Ausa',
      phc: 'Bhada',
      subcentre: 'Bhada SC',
      period: report.period,
      generatedBy: 'MPW Suresh K.'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('reports.title')}</h1>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">{t('reports.colName')}</th>
                <th className="px-6 py-4">{t('reports.colPeriod')}</th>
                <th className="px-6 py-4">{t('reports.colDate')}</th>
                <th className="px-6 py-4">{t('reports.colStatus')}</th>
                <th className="px-6 py-4 text-right">{t('reports.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {mockReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-500" />
                    {report.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{report.period}</td>
                  <td className="px-6 py-4 text-slate-500">{report.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      report.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
