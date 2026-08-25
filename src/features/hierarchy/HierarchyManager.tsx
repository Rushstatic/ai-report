import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Building2, MapPin, Search, ChevronRight, Check } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuth } from '@/hooks/useAuth';

export default function HierarchyManager() {
  const { language } = useLanguageStore();
  const { employee } = useAuth();
  
  const isDistrictController = employee?.employee_type === 'DISTRICT_CONTROLLER';
  const isTalukaController = employee?.employee_type === 'TALUKA_CONTROLLER';
  const isPHCController = employee?.employee_type === 'PHC_CONTROLLER';
  
  // Set default tab based on role
  const [activeTab, setActiveTab] = useState<'talukas' | 'phcs' | 'subcentres' | 'villages'>(
    isDistrictController ? 'talukas' : isTalukaController ? 'phcs' : 'subcentres'
  );
  
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [phcs, setPhcs] = useState<any[]>([]);
  const [subcentres, setSubcentres] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  useEffect(() => {
    fetchHierarchy();
  }, []);

  async function fetchHierarchy() {
    setLoading(true);
    try {
      let talQuery = supabase.from('talukas').select('*, districts(name)');
      let phcQuery = supabase.from('phcs').select('*, talukas(name)');
      let scQuery = supabase.from('sub_centres').select('*, phcs(name)');
      let vilQuery = supabase.from('villages').select('*, sub_centres(name)');

      if (isTalukaController && employee?.taluka_id) {
        talQuery = talQuery.eq('id', employee.taluka_id);
        phcQuery = phcQuery.eq('taluka_id', employee.taluka_id);
        
        const phcList = await supabase.from('phcs').select('id').eq('taluka_id', employee.taluka_id);
        const phcIds = phcList.data?.map(p => p.id) || [];
        if (phcIds.length > 0) {
          scQuery = scQuery.in('phc_id', phcIds);
          
          const scList = await supabase.from('sub_centres').select('id').in('phc_id', phcIds);
          const scIds = scList.data?.map(s => s.id) || [];
          if (scIds.length > 0) {
            vilQuery = vilQuery.in('sub_centre_id', scIds);
          } else {
            vilQuery = vilQuery.eq('sub_centre_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          scQuery = scQuery.eq('phc_id', '00000000-0000-0000-0000-000000000000'); 
          vilQuery = vilQuery.eq('sub_centre_id', '00000000-0000-0000-0000-000000000000');
        }
      } else if (isPHCController && employee?.phc_id) {
        talQuery = talQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        phcQuery = phcQuery.eq('id', employee.phc_id);
        scQuery = scQuery.eq('phc_id', employee.phc_id);
        
        const scList = await supabase.from('sub_centres').select('id').eq('phc_id', employee.phc_id);
        const scIds = scList.data?.map(s => s.id) || [];
        if (scIds.length > 0) {
          vilQuery = vilQuery.in('sub_centre_id', scIds);
        } else {
          vilQuery = vilQuery.eq('sub_centre_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const [distRes, talRes, phcRes, scRes, vilRes] = await Promise.all([
        supabase.from('districts').select('*'),
        talQuery,
        phcQuery,
        scQuery,
        vilQuery
      ]);
      
      if (distRes.data) setDistricts(distRes.data);
      if (talRes.data) setTalukas(talRes.data);
      if (phcRes.data) setPhcs(phcRes.data);
      if (scRes.data) setSubcentres(scRes.data);
      if (vilRes.data) setVillages(vilRes.data);
    } catch (error) {
      console.error("Error fetching hierarchy", error);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let result;
      if (activeTab === 'talukas') {
        const dId = selectedParentId || (districts[0]?.id);
        result = await supabase.from('talukas').insert({ name: newName, district_id: dId });
      } else if (activeTab === 'phcs') {
        const tId = isTalukaController ? (employee?.taluka_id || talukas[0]?.id) : selectedParentId;
        result = await supabase.from('phcs').insert({ name: newName, taluka_id: tId });
      } else if (activeTab === 'subcentres') {
        const pId = isPHCController ? (employee?.phc_id || phcs[0]?.id) : selectedParentId;
        result = await supabase.from('sub_centres').insert({ name: newName, phc_id: pId });
      } else if (activeTab === 'villages') {
        result = await supabase.from('villages').insert({ name: newName, sub_centre_id: selectedParentId });
      }

      if (result?.error) {
        throw result.error;
      }

      setIsAdding(false);
      setNewName('');
      fetchHierarchy();
    } catch (error: any) {
      console.error("Error adding entity", error);
      alert("Failed to add: " + (error.message || "Unknown error"));
    }
  };

  const tabs = [];
  if (isDistrictController) {
    tabs.push({ id: 'talukas', name: 'Talukas', count: talukas.length });
    tabs.push({ id: 'phcs', name: 'PHCs', count: phcs.length });
  } else if (isTalukaController) {
    tabs.push({ id: 'phcs', name: 'PHCs', count: phcs.length });
  }
  tabs.push({ id: 'subcentres', name: 'Sub-centres', count: subcentres.length });
  tabs.push({ id: 'villages', name: 'Villages', count: villages.length });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hierarchy Units</h1>
          <p className="text-sm text-gray-500 mt-1">Manage Talukas, PHCs, and Sub-centres across the district.</p>
        </div>
        <button
          onClick={() => {
            setNewName('');
            let defaultId = '';
            if (isTalukaController && activeTab === 'phcs' && employee?.taluka_id) {
              defaultId = employee.taluka_id;
            } else if (isPHCController && activeTab === 'subcentres' && employee?.phc_id) {
              defaultId = employee.phc_id;
            }
            setSelectedParentId(defaultId);
            setIsAdding(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New {activeTab === 'talukas' ? 'Taluka' : activeTab === 'phcs' ? 'PHC' : activeTab === 'subcentres' ? 'Sub-centre' : 'Village'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-0 flex-1 overflow-auto bg-slate-50 min-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading hierarchy data...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'talukas' ? 'District' : activeTab === 'phcs' ? 'Taluka' : activeTab === 'subcentres' ? 'PHC' : 'Sub-centre'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === 'talukas' ? talukas : activeTab === 'phcs' ? phcs : activeTab === 'subcentres' ? subcentres : villages).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activeTab === 'talukas' ? item.districts?.name : activeTab === 'phcs' ? item.talukas?.name : activeTab === 'subcentres' ? item.phcs?.name : item.sub_centres?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(activeTab === 'talukas' ? talukas : activeTab === 'phcs' ? phcs : activeTab === 'subcentres' ? subcentres : villages).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">
                      No {activeTab} found. Click "Add New" to create one.
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add New {activeTab === 'talukas' ? 'Taluka' : activeTab === 'phcs' ? 'PHC' : activeTab === 'subcentres' ? 'Sub-centre' : 'Village'}
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              {activeTab === 'phcs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Taluka</label>
                  <select
                    required
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    disabled={isTalukaController}
                    className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">-- Select Taluka --</option>
                    {talukas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'subcentres' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select PHC</label>
                  <select
                    required
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    disabled={isPHCController}
                    className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">-- Select PHC --</option>
                    {phcs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.talukas?.name})</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'villages' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Sub-centre</label>
                  <select
                    required
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">-- Select Sub-centre --</option>
                    {subcentres.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phcs?.name})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={`Enter ${activeTab === 'talukas' ? 'Taluka' : activeTab === 'phcs' ? 'PHC' : activeTab === 'subcentres' ? 'Sub-centre' : 'Village'} name`}
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
