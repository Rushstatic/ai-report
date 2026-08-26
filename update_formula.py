import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = """                              <div className="space-y-3">
                                <input
                                  type="text"
                                  placeholder="e.g. ({Male_Count} + {Female_Count}) / {Total_Days}"
                                  value={field.calculation?.formula || ''}
                                  onChange={(e) => updateField(field.id, {
                                    calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: e.target.value }
                                  })}
                                  className="w-full sm:text-xs border-slate-300 rounded-md py-1.5 px-2 border font-mono bg-white"
                                />"""

good = """                              <div className="space-y-3">
                                {/* Visual Builder Tools */}
                                <div className="flex flex-wrap items-center gap-2 bg-white p-2 border border-amber-200 rounded-md shadow-sm">
                                  <select 
                                    className="text-xs border-slate-300 rounded p-1 max-w-[200px] truncate"
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const current = field.calculation?.formula || '';
                                        updateField(field.id, {
                                          calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: current + `{${e.target.value}}` }
                                        });
                                        e.target.value = "";
                                      }
                                    }}
                                  >
                                    <option value="" disabled>{language === 'mr' ? '+ निर्देशक निवडा...' : '+ Select Field...'}</option>
                                    {fields.filter(f => f.id !== field.id && (f.type === 'Number' || f.type === 'Auto Calculated Field')).map(f => {
                                      let path = f.labelEn || f.labelMr;
                                      let curr = f;
                                      while (curr.parent_field_id) {
                                        const p = fields.find(x => x.id === curr.parent_field_id);
                                        if (p) {
                                          path = `${p.labelEn || p.labelMr} > ${path}`;
                                          curr = p;
                                        } else break;
                                      }
                                      return <option key={f.id} value={f.labelEn || f.labelMr || f.id}>{path}</option>
                                    })}
                                  </select>
                                  
                                  <div className="flex flex-wrap gap-1 border-l pl-2 border-slate-200">
                                    {['+', '-', '*', '/', '(', ')'].map(op => (
                                       <button key={op} type="button" onClick={() => {
                                         const current = field.calculation?.formula || '';
                                         updateField(field.id, { calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: current + ` ${op} ` }});
                                       }} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-mono font-bold shadow-sm">{op}</button>
                                    ))}
                                  </div>
                                  
                                  <div className="flex gap-1 border-l pl-2 border-slate-200">
                                    {['SUM', 'AVG'].map(fn => (
                                       <button key={fn} type="button" onClick={() => {
                                         const current = field.calculation?.formula || '';
                                         updateField(field.id, { calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: current + `${fn}( )` }});
                                       }} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-xs font-mono font-bold shadow-sm">{fn}</button>
                                    ))}
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  placeholder="e.g. ({Male_Count} + {Female_Count}) / {Total_Days}"
                                  value={field.calculation?.formula || ''}
                                  onChange={(e) => updateField(field.id, {
                                    calculation: { ...field.calculation, hasCondition: field.calculation?.hasCondition || false, formula: e.target.value }
                                  })}
                                  className="w-full sm:text-xs border-slate-300 rounded-md py-1.5 px-2 border font-mono bg-white"
                                />"""

content = content.replace(bad, good)

# also conditionally fix class for compactMode inside the good block if we need to
content = content.replace('className="w-full sm:text-xs border-slate-300 rounded-md py-1.5 px-2 border font-mono bg-white"', 'className={`w-full border-slate-300 rounded-md px-2 border font-mono bg-white ${compactMode ? \'py-1 text-xs\' : \'py-1.5 sm:text-sm\'}`} ')

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

