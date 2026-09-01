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
  Edit,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToExcel } from '@/utils/excelExport';
import { filterOutDeletedSubmissions } from '@/utils/formStorage';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/locales/translations';
import { useAuth } from '@/hooks/useAuth';

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
    expectedReports: 0,
    submittedReports: 0,
    complianceRate: 0,
    pendingReports: 0,
  });

  const [talukaOptions, setTalukaOptions] = useState<any[]>([]);
  const [selectedTalukaId, setSelectedTalukaId] = useState<string>('ALL');
  const [chartData, setChartData] = useState<any[]>([]);
  const [subcentreChartData, setSubcentreChartData] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [approvalPendingList, setApprovalPendingList] = useState<any[]>([]);

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
          // 1. Fetch live Talukas for dropdown
          const { data: talukaList } = await supabase.from('talukas').select('id, name').order('name');
          if (talukaList) setTalukaOptions(talukaList);

          // 2. Base queries for counts
          let talQuery = supabase.from('talukas').select('*', { count: 'exact', head: true });
          let phcQuery = supabase.from('phcs').select('*', { count: 'exact', head: true });
          let scQuery = supabase.from('sub_centres').select('*', { count: 'exact', head: true });
          let empQuery = supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', true);

          // Scoping by controller hierarchy
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
          } else if (selectedTalukaId !== 'ALL') {
            phcQuery = phcQuery.eq('taluka_id', selectedTalukaId);
            empQuery = empQuery.eq('taluka_id', selectedTalukaId);
            const phcList = await (supabase.from('phcs') as any).select('id').eq('taluka_id', selectedTalukaId);
            const phcIds = phcList.data?.map((p: any) => p.id) || [];
            if (phcIds.length > 0) {
              scQuery = scQuery.in('phc_id', phcIds);
            }
          }

          const [talukasRes, phcsRes, subcentresRes, employeesRes] = await Promise.all([
            talQuery,
            phcQuery,
            scQuery,
            empQuery,
          ]);

          // 3. Fetch live Submissions
          let subQuery = supabase.from('report_submissions').select(`
            id,
            form_id,
            employee_id,
            status,
            period_start,
            submitted_at,
            due_date,
            created_at,
            forms (name, reporting_period),
            employees!inner (
              name,
              employee_type,
              taluka_id,
              phc_id,
              sub_centre_id,
              talukas (name),
              phcs (name),
              sub_centres (name)
            )
          `);

          if (employee?.employee_type === 'TALUKA_CONTROLLER' && employee.taluka_id) {
            subQuery = subQuery.eq('employees.taluka_id', employee.taluka_id);
          } else if (employee?.employee_type === 'PHC_CONTROLLER' && employee.phc_id) {
            subQuery = subQuery.eq('employees.phc_id', employee.phc_id);
          } else if (selectedTalukaId !== 'ALL') {
            subQuery = subQuery.eq('employees.taluka_id', selectedTalukaId);
          }

          const { data: allSubmissions } = await subQuery;
          const subs: any[] = filterOutDeletedSubmissions(allSubmissions || []);

          // 4. Calculate live metrics
          const submittedCount = subs.filter(s => s.status === 'Submitted' || s.status === 'Approved').length;
          const pendingSubs = subs.filter(s => s.status === 'Pending' || s.status === 'Overdue' || s.status === 'Draft');
          
          // Total active workers & active forms
          const totalStaff = employeesRes.count || 0;
          const { count: formsCount } = await supabase.from('forms').select('*', { count: 'exact', head: true }).or('active.is.null,active.eq.true');
          const activeFormsNum = formsCount || 1;
          
          // Expected is minimum of total submitted+pending or activeStaff * activeForms
          const expected = Math.max(subs.length, totalStaff > 0 ? totalStaff * Math.min(activeFormsNum, 3) : 0);
          const compliance = expected > 0 ? Math.min(100, Math.round((submittedCount / expected) * 100)) : (submittedCount > 0 ? 100 : 0);

          setStats({
            talukas: talukasRes.count || 0,
            phcs: phcsRes.count || 0,
            subcentres: subcentresRes.count || 0,
            employees: employeesRes.count || 0,
            expectedReports: expected,
            submittedReports: submittedCount,
            complianceRate: compliance,
            pendingReports: pendingSubs.length,
          });

          // 5. Calculate live chart data grouped by Taluka or PHC
          if (talukaList && talukaList.length > 0) {
            const chartDataCalculated = talukaList.map((tal: any) => {
              const talSubs = subs.filter((s: any) => s.employees?.taluka_id === tal.id);
              const submitted = talSubs.filter((s: any) => s.status === 'Submitted' || s.status === 'Approved').length;
              const pending = talSubs.filter((s: any) => s.status === 'Pending' || s.status === 'Overdue' || s.status === 'Draft').length;
              return {
                name: tal.name,
                submitted: submitted,
                pending: pending,
              };
            });
            setChartData(chartDataCalculated);
          } else {
            setChartData([]);
          }

          // 5.5 Calculate live chart data grouped by Sub-centre
          const subcentresMap = new Map<string, { id: string, name: string, submitted: number, pending: number }>();
          
          subs.forEach((s: any) => {
            const scId = s.employees?.sub_centre_id;
            const scName = s.employees?.sub_centres?.name;
            if (scId && scName) {
              if (!subcentresMap.has(scId)) {
                subcentresMap.set(scId, { id: scId, name: scName, submitted: 0, pending: 0 });
              }
              const entry = subcentresMap.get(scId)!;
              if (s.status === 'Submitted' || s.status === 'Approved') {
                entry.submitted += 1;
              } else if (s.status === 'Pending' || s.status === 'Overdue' || s.status === 'Draft') {
                entry.pending += 1;
              }
            }
          });
          
          const scChartDataCalculated = Array.from(subcentresMap.values())
            .sort((a, b) => (b.pending + b.submitted) - (a.pending + a.submitted)) // sort by total volume
            .slice(0, 30); // limit to top 30 for visualization
            
          setSubcentreChartData(scChartDataCalculated);

          // 6. Set pending/overdue records
          setPendingList(pendingSubs.slice(0, 10));
          
          // 7. Set approval pending records
          const toApproveSubs = subs.filter(s => s.status === 'Submitted');
          setApprovalPendingList(toApproveSubs.slice(0, 20));

        } else {
          // Employee / Sub-centre level data
          if (employee?.sub_centre_id) {
            // 1. Fetch villages in this sub-centre
            const { count: vCount } = await supabase
              .from('villages')
              .select('*', { count: 'exact', head: true })
              .eq('sub_centre_id', employee.sub_centre_id);
            setSubcentreVillagesCount(vCount || 0);

            // 2. Fetch staff in this sub-centre
            const { count: sCount } = await supabase
              .from('employees')
              .select('*', { count: 'exact', head: true })
              .eq('sub_centre_id', employee.sub_centre_id);
            setSubcentreStaffCount(sCount || 0);

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
              .limit(20); // fetch more to account for local filtering

            if (subs) {
              setRecentSubmissions(filterOutDeletedSubmissions(subs).slice(0, 5));
            }
          }

          // 4. Fetch Available forms assigned to this employee's role (or ALL) directly from DB
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

          setAssignedForms(matchedForms);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [employee, isController, selectedTalukaId]);

  const handleExportCompliance = () => {
    const exportRows = chartData.map(item => ({
      'Taluka': item.name,
      'Submitted Reports': item.submitted,
      'Pending Reports': item.pending,
      'Total Reports': item.submitted + item.pending,
      'Compliance %': item.submitted + item.pending > 0 
        ? Math.round((item.submitted / (item.submitted + item.pending)) * 100) + '%'
        : '0%'
    }));

    exportToExcel(exportRows.length > 0 ? exportRows : [{ 'Notice': 'No submission data found' }], {
      filename: 'Taluka_Compliance_Report',
      districtName: 'District Health Office',
      talukaName: selectedTalukaId === 'ALL' ? 'All Talukas' : talukaOptions.find(t => t.id === selectedTalukaId)?.name || 'Taluka',
      reportName: 'Live Submission Compliance Report',
      period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    });
  };

  const handleExportPending = () => {
    const exportRows = pendingList.map((item, idx) => ({
      'Sr. No.': idx + 1,
      'Facility / Sub-Centre': item.employees?.sub_centres?.name || item.employees?.phcs?.name || 'N/A',
      'Employee Name': item.employees?.name || 'N/A',
      'Role': item.employees?.employee_type || 'N/A',
      'Report Type': item.forms?.name || 'N/A',
      'Reporting Period': item.forms?.reporting_period || 'N/A',
      'Status': item.status || 'Pending',
      'Due / Submitted Date': item.due_date || item.submitted_at || 'Pending',
    }));

    exportToExcel(exportRows.length > 0 ? exportRows : [{ 'Notice': 'No pending reports recorded' }], {
      filename: 'Pending_Reports_List',
      districtName: 'District Health Office',
      talukaName: selectedTalukaId === 'ALL' ? 'All Talukas' : talukaOptions.find(t => t.id === selectedTalukaId)?.name || 'Taluka',
      reportName: 'Live Critical Pending & Overdue Reports',
      period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
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
            onClick={() => navigate('/reports/entry')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            {language === 'mr' ? 'नवीन अहवाल भरा' : 'Fill New Report'}
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
            <p className="text-2xl font-bold text-slate-800 mt-2">{subcentreVillagesCount} गावे</p>
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
            <p className="text-2xl font-bold text-slate-800 mt-2">{subcentreStaffCount} कार्यरत</p>
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
            <p className="text-2xl font-bold text-emerald-700 mt-2">{recentSubmissions.length}</p>
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

            <div className="p-4 flex-1">
              {assignedForms.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  {language === 'mr' ? 'कोणतेही अहवाल उपलब्ध नाहीत.' : 'No active forms found in database.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
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
              )}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
          <p className="text-xs text-gray-500 mt-1">Live synchronized health statistics and compliance monitoring.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => navigate('/reports/matrix')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            {language === 'mr' ? 'संस्थानिहाय अहवाल मॅट्रिक्स' : 'Facility Matrix Report'}
          </button>

          {talukaOptions.length > 0 && employee?.employee_type === 'DISTRICT_CONTROLLER' && (
            <select 
              value={selectedTalukaId}
              onChange={(e) => setSelectedTalukaId(e.target.value)}
              className="block w-48 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white shadow-xs"
            >
              <option value="ALL">All Talukas ({talukaOptions.length})</option>
              {talukaOptions.map((tal) => (
                <option key={tal.id} value={tal.id}>
                  {tal.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dash.totalFacilities')}</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{stats.phcs} <span className="text-base font-medium text-slate-400">/</span> {stats.subcentres}</p>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[11px] px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-medium">{t('dash.phcsScs')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dash.totalEmployees')}</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{stats.employees}</p>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[11px] px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-medium">{t('dash.activeStaff')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dash.expectedReports')}</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{stats.expectedReports.toLocaleString()}</p>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium">{t('dash.currentMonth')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">{t('dash.submitted')}</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">{stats.submittedReports.toLocaleString()}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">{stats.complianceRate}%</span>
            <span className="text-[11px] text-slate-500">{t('dash.compliance')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="col-span-1 lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{t('dash.chartTitle')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Submitted vs pending distribution across talukas</p>
            </div>
            <button 
              onClick={handleExportCompliance}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-semibold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50/80 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              {t('dash.exportDetail')}
            </button>
          </div>
          <div className="h-72">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No Taluka submission records found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'}}
                  />
                  <Bar dataKey="submitted" name="Submitted" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pending Reports List */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-200/80 p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('dash.whoNotSubmitted')}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Critical pending submissions</p>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200/60">
              {stats.pendingReports} {t('dash.critical')}
            </span>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            {pendingList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No overdue or pending submissions recorded.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-5">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-4 py-3">{t('dash.colPhc')}</th>
                    <th className="px-4 py-3">{t('dash.colEmployee')}</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50">
                  {pendingList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.employees?.sub_centres?.name || item.employees?.phcs?.name || 'Sub-centre'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.employees?.name || 'Staff'} <span className="text-[10px] text-slate-400">({item.employees?.employee_type || 'MPW'})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/50">
                          {item.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-3.5 bg-slate-50/80 border-t border-slate-200/80 flex gap-2">
            <button 
              onClick={handleExportPending}
              className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button 
              onClick={() => navigate('/reports/pending')}
              className="flex-[2] py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              {t('dash.viewAllPending')}
            </button>
          </div>
        </div>
      </div>

      {/* Reports Pending Approval for PHC Controller */}
      {employee?.employee_type === 'PHC_CONTROLLER' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800">
                {language === 'mr' ? 'मंजुरीसाठी प्रलंबित अहवाल' : 'Reports Pending for Approval'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">End-user submissions waiting for your approval</p>
            </div>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200/60">
              {approvalPendingList.length} Pending
            </span>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            {approvalPendingList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                {language === 'mr' ? 'मंजुरीसाठी कोणतेही अहवाल प्रलंबित नाहीत.' : 'No reports pending for approval.'}
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-5">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-4 py-3">{t('dash.colPhc')}</th>
                    <th className="px-4 py-3">{t('dash.colEmployee')}</th>
                    <th className="px-4 py-3">Report Type</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50">
                  {approvalPendingList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.employees?.sub_centres?.name || item.employees?.phcs?.name || 'Sub-centre'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.employees?.name || 'Staff'} <span className="text-[10px] text-slate-400">({item.employees?.employee_type || 'MPW'})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.forms?.name || 'Report'} <span className="text-[10px] text-slate-400">({item.period_start})</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/reports/submit/${item.form_id}/${item.id}`)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded transition-colors"
                        >
                          Review & Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Sub-centre Performance Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800">
            {language === 'mr' ? 'उपकेंद्र कामगिरी (प्रलंबित वि. सादर)' : 'Sub-centre Performance (Pending vs Submitted)'}
          </h3>
        </div>
        <div className="h-96 w-full">
          {subcentreChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              {language === 'mr' ? 'उपकेंद्रांचे कोणतेही अहवाल आढळले नाहीत.' : 'No Sub-centre submission records found.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subcentreChartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={80} tick={{fontSize: 11, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="submitted" name={language === 'mr' ? 'सादर केलेले (Submitted)' : 'Submitted'} stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="pending" name={language === 'mr' ? 'प्रलंबित (Pending)' : 'Pending'} stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
