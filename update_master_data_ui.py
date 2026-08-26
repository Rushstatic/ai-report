import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

master_data_ui = """
                          {/* Master Data Configuration UI */}
                          {field.type === 'Master Data Field' && (
                            <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-1 bg-purple-50/50 -mx-4 px-4 pb-4 rounded-b-lg">
                              <h4 className="text-xs font-bold text-purple-700 uppercase mb-3">Master Data Integration</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Master Source</label>
                                  <select 
                                    className={`w-full border-slate-300 rounded-md border bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`}
                                    value={field.master_data_source || ''}
                                    onChange={(e) => updateField(field.id, { master_data_source: e.target.value })}
                                  >
                                    <option value="" disabled>Select Source...</option>
                                    <option value="VILLAGE_MASTER">Village Master</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Master Field</label>
                                  <select 
                                    className={`w-full border-slate-300 rounded-md border bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`}
                                    value={field.master_data_field || ''}
                                    onChange={(e) => updateField(field.id, { master_data_field: e.target.value })}
                                  >
                                    <option value="" disabled>Select Field...</option>
                                    <option value="Population">Village Population</option>
                                    <option value="House Count">House Count / Households</option>
                                    <option value="Village Name">Village Name (Marathi/English)</option>
                                    <option value="Village Code">Village Code</option>
                                    <option value="Sub-centre Name">Sub-centre Name</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode</label>
                                  <select 
                                    className={`w-full border-slate-300 rounded-md border bg-white ${compactMode ? 'py-1 text-xs' : 'py-1.5 sm:text-sm'}`}
                                    value={field.master_data_mode || 'DISPLAY_ONLY'}
                                    onChange={(e) => updateField(field.id, { master_data_mode: e.target.value as any })}
                                  >
                                    <option value="DISPLAY_ONLY">Display Only (Read-only)</option>
                                    <option value="CALCULATION_SOURCE">Use in Calculation</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
"""

content = content.replace("{/* Calculation Engine UI */}", master_data_ui + "\n                          {/* Calculation Engine UI */}")

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

