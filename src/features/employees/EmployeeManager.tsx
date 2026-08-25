import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Users, Shield, MapPin, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function EmployeeManager() {
  const { employee } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  const isDistrictController = employee?.employee_type === 'DISTRICT_CONTROLLER';
  const isTalukaController = employee?.employee_type === 'TALUKA_CONTROLLER';
  const isPHCController = employee?.employee_type === 'PHC_CONTROLLER';

  const defaultRole = isDistrictController ? 'TALUKA_CONTROLLER' : isTalukaController ? 'PHC_CONTROLLER' : 'MPW';

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    mobile_number: '',
    employee_type: defaultRole,
    designation: '',
    taluka_id: employee?.taluka_id || '',
    phc_id: employee?.phc_id || '',
    sub_centre_id: ''
  });
  
  const [talukas, setTalukas] = useState<any[]>([]);
  const [phcs, setPhcs] = useState<any[]>([]);
  const [subcentres, setSubcentres] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [employee, isDistrictController, isTalukaController, isPHCController]);

  async function fetchData() {
    setLoading(true);
    try {
      let empQuery = supabase.from('employees').select('*, talukas(name), phcs(name), sub_centres(name)').order('created_at', { ascending: false });
      let talQuery = supabase.from('talukas').select('*');
      let phcQuery = supabase.from('phcs').select('*');
      let scQuery = supabase.from('sub_centres').select('*');

      if (isTalukaController && employee?.taluka_id) {
        empQuery = empQuery.eq('taluka_id', employee.taluka_id);
        talQuery = talQuery.eq('id', employee.taluka_id);
        phcQuery = phcQuery.eq('taluka_id', employee.taluka_id);
        
        const phcList = await (supabase.from('phcs') as any).select('id').eq('taluka_id', employee.taluka_id);
        const phcIds = phcList.data?.map((p: any) => p.id) || [];
        if (phcIds.length > 0) {
          scQuery = scQuery.in('phc_id', phcIds);
        } else {
          scQuery = scQuery.eq('phc_id', '00000000-0000-0000-0000-000000000000');
        }
      } else if (isPHCController && employee?.phc_id) {
        empQuery = empQuery.eq('phc_id', employee.phc_id);
        talQuery = talQuery.eq('id', employee.taluka_id || '00000000-0000-0000-0000-000000000000');
        phcQuery = phcQuery.eq('id', employee.phc_id);
        scQuery = scQuery.eq('phc_id', employee.phc_id);
      } else if (!isDistrictController && !isTalukaController && !isPHCController) {
        // Sub-centre staff
        empQuery = empQuery.eq('sub_centre_id', employee?.sub_centre_id || '00000000-0000-0000-0000-000000000000');
        talQuery = talQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        phcQuery = phcQuery.eq('id', employee?.phc_id || '00000000-0000-0000-0000-000000000000');
        scQuery = scQuery.eq('id', employee?.sub_centre_id || '00000000-0000-0000-0000-000000000000');
      }

      const [empRes, talRes, phcRes, scRes] = await Promise.all([
        empQuery,
        talQuery,
        phcQuery,
        scQuery
      ]);
      
      if (empRes.data) setEmployees(empRes.data);
      if (talRes.data) setTalukas(talRes.data);
      if (phcRes.data) setPhcs(phcRes.data);
      if (scRes.data) setSubcentres(scRes.data);
    } catch (error) {
      console.error("Error fetching employees", error);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: newEmployee.name,
        mobile_number: newEmployee.mobile_number,
        employee_type: newEmployee.employee_type,
        designation: newEmployee.designation,
      };
      
      if (newEmployee.taluka_id) payload.taluka_id = newEmployee.taluka_id;
      if (newEmployee.phc_id) payload.phc_id = newEmployee.phc_id;
      if (newEmployee.sub_centre_id) payload.sub_centre_id = newEmployee.sub_centre_id;
      
      const { error } = await supabase.from('employees').insert(payload);
      if (error) throw error;
      
      setIsAdding(false);
      setNewEmployee({ name: '', mobile_number: '', employee_type: defaultRole, designation: '', taluka_id: employee?.taluka_id || '', phc_id: employee?.phc_id || '', sub_centre_id: '' });
      fetchData();
    } catch (error: any) {
      console.error("Error adding employee", error);
      alert("Failed to add employee: " + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all Taluka Controllers, PHC Controllers, and Staff.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-0 flex-1 overflow-auto bg-slate-50 min-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading employees...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        {emp.name}
                        {emp.designation && <span className="block text-xs text-gray-500 font-normal">{emp.designation}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.employee_type.includes('CONTROLLER') ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {emp.employee_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.mobile_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.sub_centres?.name || emp.phcs?.name || emp.talukas?.name || 'District Level'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.status ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-red-600 font-medium">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Employee</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (10 digits)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={newEmployee.mobile_number}
                  onChange={(e) => setNewEmployee({...newEmployee, mobile_number: e.target.value})}
                  className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newEmployee.employee_type}
                  onChange={(e) => setNewEmployee({...newEmployee, employee_type: e.target.value})}
                  className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {isDistrictController && (
                    <option value="TALUKA_CONTROLLER">Taluka Controller</option>
                  )}
                  {(isDistrictController || isTalukaController) && (
                    <option value="PHC_CONTROLLER">PHC Controller</option>
                  )}
                  <option value="MPW">MPW</option>
                  <option value="ANM">ANM</option>
                  <option value="CHO">CHO</option>
                </select>
              </div>

              {(newEmployee.employee_type === 'TALUKA_CONTROLLER' || newEmployee.employee_type === 'PHC_CONTROLLER' || newEmployee.employee_type === 'MPW' || newEmployee.employee_type === 'ANM' || newEmployee.employee_type === 'CHO') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Taluka</label>
                  <select
                    value={newEmployee.taluka_id}
                    onChange={(e) => setNewEmployee({...newEmployee, taluka_id: e.target.value})}
                    disabled={isTalukaController || isPHCController}
                    className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">-- Select Taluka --</option>
                    {talukas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {(newEmployee.employee_type === 'PHC_CONTROLLER' || newEmployee.employee_type === 'MPW' || newEmployee.employee_type === 'ANM' || newEmployee.employee_type === 'CHO') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to PHC</label>
                  <select
                    value={newEmployee.phc_id}
                    onChange={(e) => setNewEmployee({...newEmployee, phc_id: e.target.value})}
                    disabled={isPHCController}
                    className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">-- Select PHC --</option>
                    {phcs.filter(p => p.taluka_id === newEmployee.taluka_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              
              {(newEmployee.employee_type === 'MPW' || newEmployee.employee_type === 'ANM' || newEmployee.employee_type === 'CHO') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Sub-centre (Optional)</label>
                  <select
                    value={newEmployee.sub_centre_id || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, sub_centre_id: e.target.value})}
                    className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">-- Select Sub-centre --</option>
                    {subcentres.filter(s => s.phc_id === newEmployee.phc_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation (Optional)</label>
                <input
                  type="text"
                  value={newEmployee.designation}
                  onChange={(e) => setNewEmployee({...newEmployee, designation: e.target.value})}
                  className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
