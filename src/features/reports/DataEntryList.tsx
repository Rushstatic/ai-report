import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Send, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  MapPin, 
  UserCheck, 
  Search,
  Filter,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguageStore } from '@/store/languageStore';

interface FormItem {
  id: string;
  name: string;
  code?: string;
  reporting_period?: string;
  report_type?: string;
  target_role?: string;
  version?: number;
  description?: string;
}

export default function DataEntryList() {
  const { employee } = useAuth();
  const { language } = useLanguageStore();
  const navigate = useNavigate();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('ALL');

  const empRole = (employee?.employee_type || 'MPW').toUpperCase();
  const subcentreName = (employee as any)?.sub_centres?.name || 'Sub-centre';
  const phcName = (employee as any)?.phcs?.name || 'PHC';

  useEffect(() => {
    async function loadFormsAndSubmissions() {
      setLoading(true);
      try {
        // 1. Fetch all active forms from database
        const { data: dbForms, error: formsErr } = await (supabase
          .from('forms') as any)
          .select('*')
          .or('active.is.null,active.eq.true')
          .order('name');

        let loadedForms: FormItem[] = [];

        if (!formsErr && dbForms && dbForms.length > 0) {
          // Filter forms relevant to this employee's role (or ALL)
          loadedForms = dbForms.filter((f: any) => {
            if (!f.target_role || f.target_role === 'ALL' || f.target_role === '' || f.target_role === 'All') {
              return true;
            }
            const roles = f.target_role.toUpperCase().split(/[,/| ]+/).map((r: string) => r.trim());
            return roles.includes('ALL') || roles.includes(empRole);
          });
        }

        // If no forms matched in DB, provide comprehensive standard public health forms
        if (loadedForms.length === 0) {
          const standardForms: FormItem[] = [
            { 
              id: 'f-monthly-sc', 
              name: 'Monthly Sub-centre Composite Report (मासिक उपकेंद्र सर्वसमावेशक अहवाल)', 
              reporting_period: 'Monthly', 
              report_type: 'VILLAGE_NUMERICAL', 
              target_role: 'ALL',
              description: 'Routine general monthly morbidity, maternal, and immunization coverage data.'
            },
            { 
              id: 'f-malaria-mpw', 
              name: 'Weekly Vector Borne Disease & Malaria Surveillance (हिवताप व किटकजन्य रोग साप्ताहिक अहवाल)', 
              reporting_period: 'Weekly', 
              report_type: 'VILLAGE_PROGRESS', 
              target_role: 'MPW',
              description: 'BSER, fever cases, slide collection, and vector control field logs.'
            },
            { 
              id: 'f-water-mpw', 
              name: 'Drinking Water Quality & TCL Testing Log (पिण्याचे पाणी व टीसीएल क्लोरीनेशन नोंद)', 
              reporting_period: 'Weekly', 
              report_type: 'VILLAGE_PROGRESS', 
              target_role: 'MPW',
              description: 'OT test, chlorination levels in village water tanks, and sanitary survey.'
            },
            { 
              id: 'f-rch-anm', 
              name: 'Maternal & Child Health Progress - RCH (माता व बाल संगोपन मासिक प्रगती अहवाल)', 
              reporting_period: 'Monthly', 
              report_type: 'VILLAGE_NUMERICAL', 
              target_role: 'ANM',
              description: 'ANC 1st trimester, high-risk pregnancies, institutional deliveries, and PNC.'
            },
            { 
              id: 'f-immunization-anm', 
              name: 'Routine Immunization & Session Site Report (नियमित लसीकरण व सत्र अहवाल)', 
              reporting_period: 'Monthly', 
              report_type: 'VILLAGE_NUMERICAL', 
              target_role: 'ANM',
              description: 'Infant vaccines (BCG, Penta, MR), dropout tracking, and RI session performance.'
            },
            { 
              id: 'f-ncd-cho', 
              name: 'HWC NCD Screening & Teleconsultation Log (NCD असंसर्गजन्य रोग तपासणी व टेलीमेडिसिन)', 
              reporting_period: 'Monthly', 
              report_type: 'VILLAGE_NUMERICAL', 
              target_role: 'CHO',
              description: 'Hypertension, Diabetes, Cancer screening (30+ pop) and e-Sanjeevani teleconsults.'
            },
            { 
              id: 'f-wellness-cho', 
              name: 'HWC Wellness Activities & Community Health Day (आरोग्य वर्धिनी वेलनेस व योग सत्र)', 
              reporting_period: 'Monthly', 
              report_type: 'SUBCENTRE_LEVEL', 
              target_role: 'CHO',
              description: 'Yoga sessions, VHSNC meetings, adolescent health days, and wellness log.'
            },
            { 
              id: 'f-tb-surv', 
              name: 'TB Active Case Finding & Suspect Referral (क्षयरोग संशयित शोध व संदर्भ सेवा)', 
              reporting_period: 'Monthly', 
              report_type: 'VILLAGE_NUMERICAL', 
              target_role: 'ALL',
              description: 'Presumptive TB identification, sputum sample collection, and Nikshay linkage.'
            }
          ];

          loadedForms = standardForms.filter(f => {
            if (f.target_role === 'ALL') return true;
            return f.target_role === empRole;
          });
        }

        setForms(loadedForms);

        // 2. Fetch recent submissions for this sub-centre to indicate status
        if (employee?.sub_centre_id) {
          const { data: subData } = await (supabase
            .from('report_submissions') as any)
            .select('id, form_id, period_start, period_end, status, submitted_at, employee_id')
            .eq('sub_centre_id', employee.sub_centre_id)
            .order('submitted_at', { ascending: false });

          if (subData) {
            setSubmissions(subData);
          }
        }
      } catch (err) {
        console.error("Error loading forms:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFormsAndSubmissions();
  }, [employee, empRole]);

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPeriod = periodFilter === 'ALL' || form.reporting_period === periodFilter;
    return matchesSearch && matchesPeriod;
  });

  const getFormStatus = (formId: string) => {
    const matched = submissions.find(s => s.form_id === formId);
    if (!matched) return null;
    return matched;
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
          <p>{language === 'mr' ? 'अहवाल लोड होत आहेत...' : 'Loading available forms for your role...'}</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">{language === 'mr' ? 'कोणतेही अहवाल सापडले नाहीत' : 'No forms found'}</p>
          <p className="text-xs text-slate-400 mt-1">{language === 'mr' ? 'कृपया शोध निकष तपासा.' : 'Try adjusting your search or filter criteria.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => {
            const lastSub = getFormStatus(form.id);

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

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    {lastSub ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        lastSub.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : lastSub.status === 'Submitted'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {lastSub.status === 'Approved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {lastSub.status} ({new Date(lastSub.submitted_at).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {language === 'mr' ? 'चालू महिना भरणे बाकी' : 'Due for current period'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/reports/submit/${form.id}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {language === 'mr' ? 'अहवाल भरा' : 'Fill Report'}
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
