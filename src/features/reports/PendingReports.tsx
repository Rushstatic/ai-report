import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguageStore } from '@/store/languageStore';
import { useAuth } from '@/hooks/useAuth';
import { Search, Download, AlertCircle, Clock } from 'lucide-react';
import { exportToExcel } from '@/utils/excelExport';

export default function PendingReports() {
  const { language } = useLanguageStore();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let query = supabase
          .from('report_submissions')
          .select(`
            *,
            forms (name, reporting_period),
            employees!inner (name, employee_type, mobile_number, phcs(name), sub_centres(name), taluka_id)
          `)
          .in('status', ['Pending', 'Overdue'])
          .order('due_date', { ascending: true });

        if (employee?.employee_type === 'TALUKA_CONTROLLER' && employee.taluka_id) {
          query = query.eq('employees.taluka_id', employee.taluka_id);
        } else if (employee?.employee_type === 'PHC_CONTROLLER' && employee.phc_id) {
          query = query.eq('employees.phc_id', employee.phc_id);
        } else if (!employee?.employee_type?.includes('CONTROLLER') && employee?.sub_centre_id) {
          query = query.eq('employees.sub_centre_id', employee.sub_centre_id);
        } else if (!employee?.employee_type?.includes('CONTROLLER') && employee?.id) {
          query = query.eq('employee_id', employee.id);
        }

        const { data, error } = await query;
          
        if (data && data.length > 0) {
          setPendingList(data);
        } else {
          setPendingList([]);
        }
      } catch (error) {
        console.error("Error fetching pending reports", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [employee]);

  const filteredList = pendingList.filter(item => {
    const query = searchQuery.toLowerCase();
    const formName = item.forms?.name?.toLowerCase() || '';
    const empName = item.employees?.name?.toLowerCase() || '';
    const facilityName = (item.employees?.phcs?.name || item.employees?.sub_centres?.name || '').toLowerCase();
    return formName.includes(query) || empName.includes(query) || facilityName.includes(query);
  });

  const handleExport = () => {
    const exportData = filteredList.map(item => ({
      'Report Name': item.forms?.name,
      'Period': item.forms?.reporting_period,
      'Employee': item.employees?.name,
      'Role': item.employees?.employee_type,
      'Facility': item.employees?.phcs?.name || item.employees?.sub_centres?.name || 'N/A',
      'Due Date': item.due_date,
      'Status': item.status
    }));

    exportToExcel(exportData, {
      filename: 'Pending_Reports',
      districtName: 'Latur District',
      talukaName: 'All Talukas',
      reportName: 'Pending & Overdue Reports',
      period: 'Current Month'
    });
  };

  const handleSendReminder = (id: string, name: string) => {
    setReminderSent(id);
    setTimeout(() => {
      setReminderSent(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {language === 'mr' ? 'प्रलंबित व मुदत संपलेले अहवाल' : 'Pending & Overdue Reports'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'mr' ? 'अहवाल सादरीकरणातील विलंब तपासा आणि पाठपुरावा करा.' : 'Track and follow up on delayed health submissions.'}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4 text-slate-500" />
          {language === 'mr' ? 'Excel मध्ये एक्सपोर्ट करा' : 'Export to Excel'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'mr' ? 'कर्मचारी किंवा संस्था शोधा...' : 'Search employee or facility...'}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-2xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200/60">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {pendingList.filter(p => p.status === 'Overdue').length} {language === 'mr' ? 'मुदत संपलेले' : 'Overdue'}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {pendingList.filter(p => p.status === 'Pending').length} {language === 'mr' ? 'प्रलंबित' : 'Pending'}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-white">
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">{language === 'mr' ? 'अहवाल नाव' : 'Report Name'}</th>
                <th className="px-6 py-3.5">{language === 'mr' ? 'कर्मचारी' : 'Assigned To'}</th>
                <th className="px-6 py-3.5">{language === 'mr' ? 'संस्था / उपकेंद्र' : 'Facility'}</th>
                <th className="px-6 py-3.5">{language === 'mr' ? 'अंतिम मुदत' : 'Due Date'}</th>
                <th className="px-6 py-3.5">{language === 'mr' ? 'स्थिती' : 'Status'}</th>
                <th className="px-6 py-3.5 text-right">{language === 'mr' ? 'कृती' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    {language === 'mr' ? 'प्रलंबित नोंदी लोड होत आहेत...' : 'Loading pending records...'}
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    {language === 'mr' ? 'कोणतेही प्रलंबित अहवाल आढळले नाहीत.' : 'No pending reports found.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{item.forms?.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.forms?.reporting_period}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{item.employees?.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.employees?.employee_type}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.employees?.phcs?.name || item.employees?.sub_centres?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Immediate'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        item.status === 'Overdue' 
                          ? 'bg-red-50 text-red-700 border border-red-200/60' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}>
                        {item.status === 'Overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {reminderSent === item.id ? (
                        <span className="text-emerald-600 font-bold text-xs">
                          {language === 'mr' ? '✓ स्मरणपत्र पाठवले' : '✓ Reminder Sent'}
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleSendReminder(item.id, item.employees?.name)}
                          className="px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold rounded-lg border border-blue-100 transition-colors cursor-pointer"
                        >
                          {language === 'mr' ? 'स्मरणपत्र पाठवा' : 'Send Reminder'}
                        </button>
                      )}
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
