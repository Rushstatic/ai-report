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

  useEffect(() => {
    // In a real scenario, this would involve a complex query determining who HAS NOT submitted
    // For this prototype, we'll fetch actual 'Overdue' or 'Pending' statuses, or mock if empty.
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
  }, []);

  const handleExport = () => {
    const exportData = pendingList.map(item => ({
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending & Overdue Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Track and follow up on delayed submissions.</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
        >
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or facility..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {pendingList.filter(p => p.status === 'Overdue').length} Overdue
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {pendingList.filter(p => p.status === 'Pending').length} Pending
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingList.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.forms?.name}</div>
                    <div className="text-xs text-gray-500">{item.forms?.reporting_period}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.employees?.name}</div>
                    <div className="text-xs text-gray-500">{item.employees?.employee_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.employees?.phcs?.name || item.employees?.sub_centres?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.due_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status === 'Overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">Send Reminder</button>
                  </td>
                </tr>
              ))}
              {pendingList.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                    No pending reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
