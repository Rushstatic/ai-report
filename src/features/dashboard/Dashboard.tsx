import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building, 
  CheckCircle, 
  Clock, 
  FileText,
  AlertTriangle,
  Download,
  Send,
  PlusCircle,
  MapPin,
  Building2,
  Calendar,
  ChevronRight,
  Edit
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToExcel } from '@/utils/excelExport';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/locales/translations';
import { useAuth } from '@/hooks/useAuth';

const mockChartData = [
  { name: 'Taluka A', submitted: 85, pending: 15 },
  { name: 'Taluka B', submitted: 65, pending: 35 },
  { name: 'Taluka C', submitted: 92, pending: 8 },
  { name: 'Taluka D', submitted: 45, pending: 55 },
];

export default function Dashboard() {
  const { language } = useLanguageStore();
  const { employee } = useAuth();
  const t = useTranslation(language);
  const navigate = useNavigate();

  const isController = employee?.employee_type?.includes('CONTROLLER');

  // Controller stats
  const [stats, setStats] = useState({
    talukas: 0,
    phcs: 0,
    subcentres: 0,
    employees: 0,
  });

  // Employee Sub-centre specific stats
  const [subcentreVillagesCount, setSubcentreVillagesCount] = useState(0);
  const [subcentreStaffCount, setSubcentreStaffCount] = useState(0);
  const [assignedForms, setAssignedForms] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (isController) {
          let talQuery = supabase.from('talukas').select('*', { count: 'exact', head: true });
          let phcQuery = supabase.from('phcs').select('*', { count: 'exact', head: true });
          let scQuery = supabase.from('sub_centres').select('*', { count: 'exact', head: true });
          let empQuery = supabase.from('employees').select('*', { count: 'exact', head: true });

          if (employee?.employee_type === 'TALUKA_CONTROLLER' && employee.taluka_id) {
            talQuery = talQuery.eq('id', employee.taluka_id);
            phcQuery = phcQuery.eq('taluka_id', employee.taluka_id);
            empQuery = empQuery.eq('taluka_id', employee.taluka_id);
            
            const phcList = await (supabase.from('phcs') as any).select('id').eq('taluka_id', employee.taluka_id);
            const phcIds = phcList.data?.map((p: any) => p.id) || [];
            if (phcIds.length > 0) {
              scQuery = scQuery.in('phc_id', phcIds);
            }
          } else if (employee?.employee_type === 'PHC_CONTROLLER' && employee.phc_id) {
            talQuery = talQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            phcQuery = phcQuery.eq('id', employee.phc_id);
            scQuery = scQuery.eq('phc_id', employee.phc_id);
            empQuery = empQuery.eq('phc_id', employee.phc_id);
          }

          const [talukas, phcs, subcentres, employees_count] = await Promise.all([
            talQuery,
            phcQuery,
            scQuery,
            empQuery,
          ]);

          setStats({
            talukas: talukas.count || 3,
            phcs: phcs.count || 12,
            subcentres: subcentres.count || 48,
            employees: employees_count.count || 145,
          });
        } else {
          // Employee / Sub-centre level data
          if (employee?.sub_centre_id) {
            // 1. Fetch villages in this sub-centre
            const { count: vCount } = await supabase
              .from('villages')
              .select('*', { count: 'exact', head: true })
              .eq('sub_centre_id', employee.sub_centre_id);
            setSubcentreVillagesCount(vCount || 4);

            // 2. Fetch staff in this sub-centre
            const { count: sCount } = await supabase
              .from('employees')
              .select('*', { count: 'exact', head: true })
              .eq('sub_centre_id', employee.sub_centre_id);
            setSubcentreStaffCount(sCount || 3);

            // 3. Fetch submissions from this sub-centre
            const { data: subs } = await supabase
              .from('report_submissions')
              .select(`
                id,
                form_id,
                period_start,
                period_end,
                status,
                submitted_at,
                forms (name, reporting_period),
                employees (name, employee_type)
              `)
              .eq('sub_centre_id', employee.sub_centre_id)
              .order('submitted_at', { ascending: false })
              .limit(5);

            if (subs && subs.length > 0) {
              setRecentSubmissions(subs);
            }
          }

          // 4. Fetch Available forms assigned to this employee's role (or ALL)
          const empRole = (employee?.employee_type || 'MPW').toUpperCase();
          const { data: formsData } = await (supabase
            .from('forms') as any)
            .select('*')
            .or('active.is.null,active.eq.true')
            .order('name');

          let matchedForms: any[] = [];
          if (formsData && formsData.length > 0) {
            matchedForms = formsData.filter((f: any) => {
              if (!f.target_role || f.target_role === 'ALL' || f.target_role === '' || f.target_role === 'All') {
                return true;
              }
              const roles = f.target_role.toUpperCase().split(/[,/| ]+/).map((r: string) => r.trim());
              return roles.includes('ALL') || roles.includes(empRole);
            });
          }

          if (matchedForms.length > 0) {
            setAssignedForms(matchedForms);
          } else {
            // Standard health worker role-specific forms
            const defaultRoleForms: any[] = [
              { id: 'f-monthly-sc', name: 'Monthly Sub-centre Composite Report (मासिक उपकेंद्र सर्वसमावेशक अहवाल)', reporting_period: 'Monthly', report_type: 'VILLAGE_NUMERICAL', target_role: 'ALL' },
              { id: 'f-malaria-mpw', name: 'Weekly Vector Borne Disease & Malaria Surveillance (हिवताप अहवाल)', reporting_period: 'Weekly', report_type: 'VILLAGE_PROGRESS', target_role: 'MPW' },
              { id: 'f-water-mpw', name: 'Drinking Water Quality & Chlorination Log (पिण्याचे पाणी तपासणी)', reporting_period: 'Weekly', report_type: 'VILLAGE_PROGRESS', target_role: 'MPW' },
              { id: 'f-rch-anm', name: 'Maternal & Child Health Progress - RCH (माता व बाल संगोपन अहवाल)', reporting_period: 'Monthly', report_type: 'VILLAGE_NUMERICAL', target_role: 'ANM' },
              { id: 'f-immunization-anm', name: 'Routine Immunization Coverage Report (नियमित लसीकरण अहवाल)', reporting_period: 'Monthly', report_type: 'VILLAGE_NUMERICAL', target_role: 'ANM' },
              { id: 'f-ncd-cho', name: 'HWC NCD Screening & Teleconsultation Progress (NCD तपासणी व टेलीमेडिसिन)', reporting_period: 'Monthly', report_type: 'VILLAGE_NUMERICAL', target_role: 'CHO' },
              { id: 'f-wellness-cho', name: 'HWC Wellness Activities & Yoga Sessions (आरोग्य वर्धिनी वेलनेस नोंद)', reporting_period: 'Monthly', report_type: 'SUBCENTRE_LEVEL', target_role: 'CHO' },
            ];

            setAssignedForms(defaultRoleForms.filter(f => f.target_role === 'ALL' || f.target_role === empRole));
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [employee, isController]);

  const handleExportCompliance = () => {
    exportToExcel(mockChartData, {
      filename: 'Taluka_Compliance_Report',
      districtName: 'Latur District',
      talukaName: 'All Talukas',
      reportName: 'Submission Compliance Report',
      period: 'August 2026',
    });
  };

  const handleExportPending = () => {
    const pendingData = [1, 2, 3, 4, 5].map((i) => ({
      'PHC / Sub-Centre': `Bhada / SC ${i}`,
      'Employee': 'MPW Employee',
      'Days Overdue': i * 2,
      'Report Type': 'Monthly TB Surveillance',
    }));

    exportToExcel(pendingData, {
      filename: 'Pending_Reports_List',
      districtName: 'Latur District',
      talukaName: 'All Talukas',
      reportName: 'Critical Pending Reports',
      period: 'August 2026',
    });
  };

  // EMPLOYEE SPECIFIC DASHBOARD VIEW
  if (!isController) {
    const subcentreName = (employee as any)?.sub_centres?.name || 'Sub-centre';
    const phcName = (employee as any)?.phcs?.name || 'PHC';

    return (
      <div className="space-y-6">
        {/* Header & Sub-centre Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                {employee?.employee_type || 'Staff Employee'}
              </span>
              <h1 className="text-xl font-bold text-slate-800">
                {language === 'mr' ? 'कर्मचारी डॅशबोर्ड' : 'Employee Dashboard'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-semibold text-slate-700">{employee?.name}</span>
              <span>&bull;</span>
              <span>📍 {subcentreName} (प्रा.आ.कें {phcName})</span>
            </p>
          </div>

          <button
            onClick={() => navigate('/reports/my')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            {language === 'mr' ? 'नवीन अहवाल सादर करा' : 'Submit New Report'}
          </button>
        </div>

        {/* Sub-centre KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                {language === 'mr' ? 'उपकेंद्रातील गावे' : 'Villages in Sub-centre'}
              </p>
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{subcentreVillagesCount || 4} गावे</p>
            <div className="mt-2 text-[10px] text-slate-500">
              {subcentreName} कार्यक्षेत्र
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                {language === 'mr' ? 'उपकेंद्र कर्मचारी' : 'Sub-centre Staff'}
              </p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{subcentreStaffCount || 3} कार्यरत</p>
            <div className="mt-2 text-[10px] text-slate-500">
              MPW, ANM, CHO
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                {language === 'mr' ? 'लागू असलेले अहवाल' : 'Assigned Forms'}
              </p>
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-700 mt-2">{assignedForms.length} अहवाल</p>
            <div className="mt-2 text-[10px] text-purple-600 font-medium">
              {employee?.employee_type} पदासाठी उपलब्ध
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider text-emerald-600">
                {language === 'mr' ? 'सादर केलेले अहवाल' : 'Submissions'}
              </p>
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{recentSubmissions.length || 3}</p>
            <div className="mt-2 text-[10px] text-emerald-600 font-medium">
              {subcentreName} कडून सादर
            </div>
          </div>
        </div>

        {/* Main Grid: Available Reports for My Role & Sub-centre Recent Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Available Reports for My Role (अहवाल भरा) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {language === 'mr' 
                    ? `माझ्या पदासाठी लागू असलेले अहवाल (${employee?.employee_type || 'Employee'})` 
                    : `Available Reports for My Role (${employee?.employee_type || 'Employee'})`}
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                {assignedForms.length} Active
              </span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {assignedForms.map((form) => (
                <div key={form.id} className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{form.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {form.reporting_period || 'Monthly'}
                      </span>
                      {form.target_role && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                          Role: {form.target_role}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/reports/submit/${form.id}`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {language === 'mr' ? 'अहवाल भरा' : 'Fill Report'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Recent Submissions from My Sub-centre */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {language === 'mr' 
                    ? `माझ्या उपकेंद्रातील अहवाल (${subcentreName})` 
                    : `My Sub-centre Reports (${subcentreName})`}
                </h3>
              </div>
              <button 
                onClick={() => navigate('/reports/my')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {language === 'mr' ? 'सर्व पहा' : 'View All'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 flex-1">
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  {language === 'mr' ? 'अद्याप कोणतेही अहवाल सादर केलेले नाहीत.' : 'No reports submitted yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentSubmissions.map((sub) => (
                    <div key={sub.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{sub.forms?.name || 'Sub-centre Report'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sub.employees?.name} &bull; {sub.period_start}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          sub.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {sub.status}
                        </span>

                        {sub.status !== 'Approved' && (
                          <button
                            onClick={() => navigate(`/reports/submit/${sub.form_id}/${sub.id}`)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit Report"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CONTROLLER DASHBOARD VIEW (District, Taluka, PHC)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <div className="flex gap-2">
          <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option>All Talukas</option>
            <option>Taluka A</option>
            <option>Taluka B</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.totalFacilities')}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{stats.phcs} / {stats.subcentres}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-medium">{t('dash.phcsScs')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.totalEmployees')}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{stats.employees}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-medium">{t('dash.activeStaff')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.expectedReports')}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">1,240</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-medium">{t('dash.currentMonth')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider text-emerald-600">{t('dash.submitted')}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">892</p>
          <div className="mt-2 flex items-center gap-2 text-emerald-600">
            <span className="text-xs font-bold">72%</span>
            <span className="text-[10px] text-slate-400">{t('dash.compliance')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="col-span-1 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">{t('dash.chartTitle')}</h3>
            <button 
              onClick={handleExportCompliance}
              className="flex items-center gap-1 text-blue-600 text-xs font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50"
            >
              <Download className="h-3 w-3" />
              {t('dash.exportDetail')}
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="submitted" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="pending" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Reports List */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">{t('dash.whoNotSubmitted')}</h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              342 {t('dash.critical')}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b border-slate-100">
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-4 py-3">{t('dash.colPhc')}</th>
                  <th className="px-4 py-3">{t('dash.colEmployee')}</th>
                  <th className="px-4 py-3">{t('dash.colDays')}</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">Bhada / SC {i}</td>
                    <td className="px-4 py-3 text-slate-500">MPW Employee</td>
                    <td className="px-4 py-3 text-rose-600 font-bold">{i * 2}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
            <button 
              onClick={handleExportPending}
              className="flex-1 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="flex-[2] py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700">
              {t('dash.viewAllPending')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
