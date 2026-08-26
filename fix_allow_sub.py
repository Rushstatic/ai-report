with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = """                          {/* Conditional Logic UI */}"""

good = """                          <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-1">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.allow_sub_fields || false}
                                onChange={(e) => updateField(field.id, { allow_sub_fields: e.target.checked })}
                                className="h-4 w-4 text-blue-600 rounded border-slate-300"
                              />
                              <span>{language === 'mr' ? 'उपनियमावली (Allow Sub-fields)' : 'Allow Sub-fields (Nested Hierarchy)'}</span>
                            </label>
                          </div>

                          {/* Conditional Logic UI */}"""

content = content.replace(bad, good)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
