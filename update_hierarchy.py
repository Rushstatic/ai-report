import re

with open('src/features/hierarchy/HierarchyManager.tsx', 'r') as f:
    content = f.read()

# Add states
state_updates = """  const [selectedParentId, setSelectedParentId] = useState('');
  const [population, setPopulation] = useState<number | ''>('');
  const [houseCount, setHouseCount] = useState<number | ''>('');"""
content = content.replace("  const [selectedParentId, setSelectedParentId] = useState('');", state_updates)

# Add clear logic
clear_logic = """            setNewName('');
            setPopulation('');
            setHouseCount('');
            let defaultId = '';"""
content = content.replace("""            setNewName('');\n            let defaultId = '';""", clear_logic)

# Update submit logic
submit_logic = """      } else if (activeTab === 'villages') {
        result = await (supabase.from('villages') as any).insert({ 
          name: newName, 
          sub_centre_id: selectedParentId,
          population: population ? Number(population) : 0,
          house_count: houseCount ? Number(houseCount) : 0
        }).select().single();
        
        if (result.data) {
          // Also insert to village_master_data
          await (supabase.from('village_master_data') as any).insert({
            village_id: result.data.id,
            population: population ? Number(population) : 0,
            house_count: houseCount ? Number(houseCount) : 0,
            is_current: true
          });
        }
      }"""
content = content.replace("""      } else if (activeTab === 'villages') {\n        result = await (supabase.from('villages') as any).insert({ name: newName, sub_centre_id: selectedParentId });\n      }""", submit_logic)

# Update inputs
inputs = """              <div>
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
              
              {activeTab === 'villages' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Population</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={population}
                      onChange={(e) => setPopulation(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">House Count / Households</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={houseCount}
                      onChange={(e) => setHouseCount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g. 300"
                    />
                  </div>
                </>
              )}"""

content = content.replace("""              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={`Enter ${activeTab === 'talukas' ? 'Taluka' : activeTab === 'phcs' ? 'PHC' : activeTab === 'subcentres' ? 'Sub-centre' : 'Village'} name`}
                />
              </div>""", inputs)

# Add population display to villages list
list_ui = """                                {activeTab === 'villages' && (
                                  <div className="flex gap-4">
                                    <span className="inline-flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                                      Pop: {item.population || 0}
                                    </span>
                                    <span className="inline-flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                                      Houses: {item.house_count || 0}
                                    </span>
                                  </div>
                                )}"""
content = content.replace("""                              <p className="text-sm text-gray-500">
                                {activeTab === 'phcs' && `Taluka: ${item.talukas?.name}`}
                                {activeTab === 'subcentres' && `PHC: ${item.phcs?.name}`}
                                {activeTab === 'villages' && `Sub-centre: ${item.sub_centres?.name}`}
                              </p>
                            </div>""", """                              <p className="text-sm text-gray-500">
                                {activeTab === 'phcs' && `Taluka: ${item.talukas?.name}`}
                                {activeTab === 'subcentres' && `PHC: ${item.phcs?.name}`}
                                {activeTab === 'villages' && `Sub-centre: ${item.sub_centres?.name}`}
                              </p>
                            </div>\n""" + list_ui)

with open('src/features/hierarchy/HierarchyManager.tsx', 'w') as f:
    f.write(content)

