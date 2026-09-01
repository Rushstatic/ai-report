import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Search, 
  Filter, 
  Send, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  UserCheck,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/languageStore';
import { syncStandardFormsToDatabase } from '@/utils/syncForms';
import { fetchAllActiveForms, filterOutDeletedSubmissions, getDefaultPeriodDates } from '@/utils/formStorage';

interface FormItem {
  id: string;
  name: string;
  code?: string;
  description: string;
  reporting_period: string;
  report_type: string;
  target_role?: string;
  employee_wise_submission?: boolean;
}

export default function DataEntryList() {
  const { employee } = useAuth();
  const { language } = useLanguageStore();
  const navigate = useNavigate();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [syncing, setSyncing] = useState(false);

  const empRole = (employee?.employee_type || 'MPW').toUpperCase();
  const subcentreName = (employee as any)?.sub_centres?.name || 'Sub-centre';
  const phcName = (employee as any)?.phcs?.name || 'PHC';

  const loadFormsAndSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch active forms (Database + Standard + Custom forms)
      const loadedForms = await fetchAllActiveForms(empRole);
      setForms(loadedForms);

      // 2. Fetch villages mapped to this sub-centre
      if (employee?.sub_centre_id) {
        const { data: vData } = await (supabase
          .from('villages') as any)
          .select('id, name, code')
          .eq('sub_centre_id', employee.sub_centre_id)
          .order('name');
        if (vData) {
          setVillages(vData);
        }

        // 3. Fetch recent submissions for this sub-centre to indicate status
        const { data: subData } = await (supabase
          .from('report_submissions') as any)
          .select('id, form_id, village_id, period_start, period_end, status, submitted_at, employee_id')
          .eq('sub_centre_id', employee.sub_centre_id)
          .order('submitted_at', { ascending: false });

        if (subData) {
          setSubmissions(filterOutDeletedSubmissions(subData));
        }
      }
    } catch (err) {
      console.error("Error loading forms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormsAndSubmissions();
  }, [employee, empRole]);

  const handleSyncForms = async () => {
    setSyncing(true);
    try {
      await syncStandardFormsToDatabase();
      await loadFormsAndSubmissions();
    } catch (err) {
      console.error('Failed to sync forms:', err);
    } finally {
      setSyncing(false);
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPeriod = periodFilter === 'ALL' || form.reporting_period === periodFilter;
    return matchesSearch && matchesPeriod;
  });

  const getFormStatus = (form: FormItem) => {
    const isListType = form.report_type === 'LIST';
    const isSubCentreLevel = form.report_type === 'SUBCENTRE_LEVEL';
    const { periodStart } = getDefaultPeriodDates(form.reporting_period);

    if (form.employee_wise_submission) {
      // Employee-wise: Check submissions by this specific employee for the current period
      const mySubs = submissions.filter(s => (s.form_id === form.id || s.form_id === form.code) && s.employee_id === employee?.id && s.period_start === periodStart);
      const submittedVillageIds = new Set(mySubs.map(s => s.village_id).filter(Boolean));
      const totalVillages = villages.length;
      const submittedCount = submittedVillageIds.size;
      const isAllVillagesDone = totalVillages > 0 && submittedCount >= totalVillages;

      return {
        isEmployeeWise: true,
        isListType,
        isSubCentreLevel,
        submittedCount,
        totalVillages,
        isAllVillagesDone,
        submitted: mySubs.length > 0,
        record: mySubs[0]
      };
    } else {
      // Sub-centre level or regular village-wise: Check submissions by any staff member in sub-centre for the current period
      const subCentreSubs = submissions.filter(s => (s.form_id === form.id || s.form_id === form.code) && s.period_start === periodStart);
      const submittedVillageIds = new Set(subCentreSubs.map(s => s.village_id).filter(Boolean));
      const totalVillages = villages.length;
      const submittedCount = submittedVillageIds.size;
      const isAllVillagesDone = totalVillages > 0 && submittedCount >= totalVillages;

      return {
        isEmployeeWise: false,
        isListType,
        isSubCentreLevel,
        submittedCount,
        totalVillages,
        isAllVillagesDone,
        submitted: subCentreSubs.length > 0,
        record: subCentreSubs[0]
      };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Sub-centre & Staff Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md uppercase tracking-wider">
              {employee?.employee_type || 'Staff'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {employee?.designation || 'Health Worker'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            {language === 'mr' ? 'डेटा एन्ट्री / अहवाल सादरीकरण' : 'Data Entry & Report Submission'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {language === 'mr' ? 'उपकेंद्र:' : 'Sub-centre:'} {subcentreName}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {language === 'mr' ? 'प्रा.आ.केंद्र:' : 'PHC:'} {phcName}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              {employee?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">{language === 'mr' ? 'उपलब्ध अहवाल' : 'Available Forms'}</p>
            <p className="text-xl font-bold text-blue-600">{forms.length} {language === 'mr' ? 'फॉर्म' : 'Forms'}</p>
          </div>
          <button
            onClick={() => navigate('/reports/my')}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
          >
            {language === 'mr' ? 'माझे सादर केलेले अहवाल' : 'View Submissions'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'mr' ? 'अहवाल शोधा...' : 'Search reports...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            {language === 'mr' ? 'कालावधी:' : 'Period:'}
          </span>
          {['ALL', 'Daily', 'Weekly', 'Monthly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                periodFilter === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'ALL' ? (language === 'mr' ? 'सर्व' : 'All') : p}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
          <p>{language === 'mr' ? 'अहवाल लोड होत आहेत...' : 'Loading live forms for your role...'}</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 flex flex-col items-center">
          <FileText className="w-12 h-12 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">{language === 'mr' ? 'कोणतेही अहवाल सापडले नाहीत' : 'No forms found'}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            {language === 'mr' 
              ? 'डेटाबेसमध्ये सध्या आपल्या पदासाठी लागू असलेले अहवाल आढळले नाहीत.' 
              : 'No active reporting forms are currently registered in the database for your role.'}
          </p>
          <button
            onClick={handleSyncForms}
            disabled={syncing}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing 
              ? (language === 'mr' ? 'सिंक होत आहे...' : 'Syncing Live Forms...') 
              : (language === 'mr' ? 'प्रमाणित आरोग्य अहवाल सिंक करा' : 'Sync Standard Health Forms to Database')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => {
            const statusInfo = getFormStatus(form);
            const subRec = statusInfo.record;

            return (
              <div
                key={form.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center justify-end">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {form.reporting_period || 'Monthly'}
                      </span>
                      {form.target_role && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-semibold">
                          Role: {form.target_role}
                        </span>
                      )}
                      {/* Report Type Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        form.report_type === 'SUBCENTRE_LEVEL'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {form.report_type === 'SUBCENTRE_LEVEL'
                          ? (language === 'mr' ? '🏢 उपकेंद्र स्तर' : '🏢 Sub-centre Level')
                          : (language === 'mr' ? '🏘️ गावनिहाय अहवाल' : '🏘️ Village-wise')}
                      </span>
                      {/* Submission Rule Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        form.employee_wise_submission
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {form.employee_wise_submission 
                          ? (language === 'mr' ? '👤 Employee-wise (स्वतंत्र)' : '👤 Individual') 
                          : (language === 'mr' ? '👥 उपकेंद्र सादरीकरण' : '👥 Facility Submission')}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mt-3 leading-snug">
                    {form.name}
                  </h3>

                  {form.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {form.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {!statusInfo.isListType && !statusInfo.isSubCentreLevel ? (
                      statusInfo.isAllVillagesDone ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {language === 'mr' 
                            ? `सर्व ${statusInfo.totalVillages} गावे पूर्ण` 
                            : `All ${statusInfo.totalVillages} Villages Complete`}
                        </span>
                      ) : statusInfo.submittedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {language === 'mr' 
                            ? `${statusInfo.submittedCount}/${statusInfo.totalVillages} गावे पूर्ण (${statusInfo.totalVillages - statusInfo.submittedCount} बाकी)` 
                            : `${statusInfo.submittedCount}/${statusInfo.totalVillages} Villages Done (${statusInfo.totalVillages - statusInfo.submittedCount} Due)`}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          {language === 'mr' 
                            ? `गावनिहाय अहवाल बाकी (०/${statusInfo.totalVillages} गावे)` 
                            : `Village report due (0/${statusInfo.totalVillages} villages)`}
                        </span>
                      )
                    ) : statusInfo.submitted && subRec ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                        subRec.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : subRec.status === 'Submitted'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {subRec.status === 'Approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {subRec.status} {form.employee_wise_submission 
                          ? (language === 'mr' ? '(आपला सादर)' : '(Your Report)') 
                          : form.report_type === 'SUBCENTRE_LEVEL' 
                          ? (language === 'mr' ? '(उपकेंद्र सादर)' : '(Sub-centre Done)') 
                          : (language === 'mr' ? '(गाव अहवाल सादर)' : '(Village Report Done)')}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {form.employee_wise_submission
                          ? (language === 'mr' ? 'आपला वैयक्तिक अहवाल बाकी' : 'Your submission is due')
                          : form.report_type === 'SUBCENTRE_LEVEL'
                          ? (language === 'mr' ? 'उपकेंद्र अहवाल भरणे बाकी' : 'Sub-centre report due')
                          : (language === 'mr' ? 'अहवाल भरणे बाकी' : 'Report due')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/reports/submit/${form.id}`)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {!statusInfo.isListType && !statusInfo.isSubCentreLevel && statusInfo.submittedCount > 0 && !statusInfo.isAllVillagesDone
                      ? (language === 'mr' ? `पुढील गाव भरा (${statusInfo.totalVillages - statusInfo.submittedCount} बाकी)` : `Fill Next Village (${statusInfo.totalVillages - statusInfo.submittedCount} Due)`)
                      : !statusInfo.isListType && !statusInfo.isSubCentreLevel && statusInfo.isAllVillagesDone
                      ? (language === 'mr' ? 'अहवाल पहा / नवीन' : 'View / Fill Report')
                      : (language === 'mr' ? 'अहवाल भरा' : 'Fill Report')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
