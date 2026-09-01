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
  Calendar,
  Loader2,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { exportStructuredReportToPDF, exportToPDF } from '@/utils/pdfExport';
import { exportStructuredReportToExcel } from '@/utils/excelExport';
import { prepareReportData } from '@/utils/reportDataHelper';
import ReportDownloadModal from '@/components/ReportDownloadModal';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { deleteReportSubmission, filterOutDeletedSubmissions } from '@/utils/formStorage';
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedReportForDownload, setSelectedReportForDownload] = useState<any | null>(null);

  // Deletion Modal State
  const [reportToDelete, setReportToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isController = employee?.employee_type?.includes('CONTROLLER');
  const subcentreName = (employee as any)?.sub_centres?.name || 'Sub-centre';

  useEffect(() => {
    async function fetchReportsAndForms() {
      setLoading(true);
      try {
        // 1. Fetch reports with sub-centre data isolation from Supabase
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

        if (!error && data) {
          setReports(filterOutDeletedSubmissions(data));
        } else {
          setReports([]);
        }

        // 2. Fetch Available forms for Employee's role from live forms table
        const empRole = (employee?.employee_type || 'MPW').toUpperCase();
        const { data: fData } = await (supabase
          .from('forms') as any)
          .select('*')
          .or('active.is.null,active.eq.true')
          .order('name');

        let matchedForms: any[] = [];
        if (fData && fData.length > 0) {
          matchedForms = fData.filter((f: any) => {
            if (!f.target_role || f.target_role === 'ALL' || f.target_role === '' || f.target_role === 'All') {
              return true;
            }
            const roles = f.target_role.toUpperCase().split(/[,/| ]+/).map((r: string) => r.trim());
            return roles.includes('ALL') || roles.includes(empRole);
          });
        }

        setAvailableForms(matchedForms);

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

  const handleDownloadPDF = async (report: any, orientation: 'portrait' | 'landscape' = 'portrait') => {
    setDownloadingId(report.id);
    try {
      const preparedData = await prepareReportData(report, language === 'mr' ? 'mr' : 'en');
      exportStructuredReportToPDF(preparedData, {
        orientation,
        language: language === 'mr' ? 'mr' : 'en',
        title: preparedData.formName,
        district: preparedData.district,
        taluka: preparedData.taluka,
        phc: preparedData.phc,
        subcentre: preparedData.subcentre,
        village: preparedData.village,
        period: `${preparedData.periodStart} to ${preparedData.periodEnd}`,
        status: preparedData.status
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteReportSubmission(reportToDelete.id);
      if (res.success) {
        setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
        setDeleteNotice({
          type: 'success',
          message: language === 'mr'
            ? `अहवाल "${reportToDelete.forms?.name || 'Report'}" Supabase मधून यशस्वीरीत्या हटवला गेला आहे.`
            : `Report "${reportToDelete.forms?.name || 'Report'}" deleted successfully from Supabase.`
        });
        setReportToDelete(null);
        setTimeout(() => {
          setDeleteNotice(null);
        }, 5000);
      } else {
        setDeleteNotice({
          type: 'error',
          message: res.error || (language === 'mr' ? 'अहवाल हटवण्यात त्रुटी आली.' : 'Failed to delete report from Supabase.')
        });
      }
    } catch (err: any) {
      setDeleteNotice({
        type: 'error',
        message: err.message || 'Error occurred while deleting report from Supabase.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Floating / Notification Banner for Deletion Feedback */}
      {deleteNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 ${
          deleteNotice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          <div className="flex items-center gap-3">
            {deleteNotice.type === 'success' ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold">{deleteNotice.message}</p>
              {deleteNotice.type === 'success' && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  {language === 'mr' ? 'Supabase डेटाबेसमधील सर्व संबंधित नोंदी हटवण्यात आल्या आहेत.' : 'All field records have been cleared from Supabase cloud database.'}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setDeleteNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => navigate('/reports/matrix')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            {language === 'mr' ? 'संस्थानिहाय अहवाल मॅट्रिक्स' : 'Facility Matrix Report'}
          </button>

          {!isController && (
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {language === 'mr' ? 'नवीन अहवाल भरा' : 'Submit New Report'}
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
                          <div className="flex items-center gap-1.5 justify-end">
                            {/* Main Options / Preview Modal Button */}
                            <button 
                              onClick={() => setSelectedReportForDownload(report)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                              title={language === 'mr' ? 'A4 डाऊनलोड पर्याय (Portrait / Landscape)' : 'A4 Download Options (Portrait / Landscape)'}
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              {language === 'mr' ? 'डाऊनलोड / A4' : 'Download A4'}
                            </button>

                            {/* Quick Landscape PDF Button */}
                            <button 
                              onClick={() => handleDownloadPDF(report, 'landscape')}
                              disabled={downloadingId === report.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              title={language === 'mr' ? 'आडवा PDF (A4 Landscape)' : 'A4 Landscape PDF'}
                            >
                              {downloadingId === report.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <span className="text-[11px] font-bold">📑 A4 Landscape</span>
                              )}
                            </button>

                            {/* Quick Portrait PDF Button */}
                            <button 
                              onClick={() => handleDownloadPDF(report, 'portrait')}
                              disabled={downloadingId === report.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              title={language === 'mr' ? 'उभा PDF (A4 Portrait)' : 'A4 Portrait PDF'}
                            >
                              {downloadingId === report.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <span className="text-[11px] font-bold">📄 A4 Portrait</span>
                              )}
                            </button>

                            {isEditable && (
                              <button 
                                onClick={() => navigate(`/reports/submit/${report.form_id}/${report.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-colors ml-1 cursor-pointer"
                                title={language === 'mr' ? 'अहवाल दुरुस्त करा' : 'Edit Report'}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                {language === 'mr' ? 'दुरुस्त करा' : 'Edit'}
                              </button>
                            )}

                            {(isOwnSubmission || isController) && (
                              <button 
                                onClick={() => setReportToDelete(report)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors ml-1 cursor-pointer"
                                title={language === 'mr' ? 'अहवाल हटवा (Delete Report)' : 'Delete Report'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {language === 'mr' ? 'हटवा' : 'Delete'}
                              </button>
                            )}
                          </div>
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

      {/* Confirmation Modal for Report Deletion */}
      <ConfirmDeleteDialog
        isOpen={!!reportToDelete}
        onClose={() => !isDeleting && setReportToDelete(null)}
        onConfirm={handleDeleteReport}
        isDeleting={isDeleting}
        title={language === 'mr' ? 'सादर केलेला अहवाल हटवा' : 'Delete Submitted Report'}
        description={
          language === 'mr'
            ? 'तुम्हाला हा अहवाल Supabase मधून कायमचा हटवायचा आहे का? या अहवालातील सर्व आकडेवारी आणि नोंदी सुरक्षितपणे नष्ट केल्या जातील.'
            : 'Are you sure you want to permanently delete this submitted report from Supabase? All associated values and records will be removed.'
        }
        itemDetails={reportToDelete ? {
          formName: reportToDelete.forms?.name,
          employeeName: reportToDelete.employees?.name,
          role: reportToDelete.employees?.employee_type,
          location: reportToDelete.villages?.name || reportToDelete.employees?.sub_centres?.name || reportToDelete.employees?.phcs?.name || 'Sub-centre',
          period: `${new Date(reportToDelete.period_start).toLocaleDateString()} to ${new Date(reportToDelete.period_end).toLocaleDateString()}`,
          status: reportToDelete.status
        } : undefined}
      />

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
              {availableForms.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  {language === 'mr' ? 'कोणतेही अहवाल उपलब्ध नाहीत.' : 'No active forms found in database.'}
                </div>
              ) : (
                availableForms.map((form) => (
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
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {form.reporting_period || 'Monthly'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                          {form.target_role === 'ALL' ? 'All Roles' : form.target_role || 'General'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          form.report_type === 'SUBCENTRE_LEVEL' 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {form.report_type === 'SUBCENTRE_LEVEL' 
                            ? (language === 'mr' ? '🏢 उपकेंद्र स्तर' : '🏢 Sub-centre') 
                            : (language === 'mr' ? '🏘️ गावनिहाय' : '🏘️ Village-wise')}
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
                ))
              )}
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

      {/* Advanced A4 Portrait & Landscape Report Download & Preview Modal */}
      {selectedReportForDownload && (
        <ReportDownloadModal
          isOpen={!!selectedReportForDownload}
          report={selectedReportForDownload}
          onClose={() => setSelectedReportForDownload(null)}
        />
      )}
    </div>
  );
}
