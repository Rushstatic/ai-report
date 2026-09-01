import re

with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_select = r"""                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                            className="w-full sm:text-sm border-slate-300 rounded-lg py-1.5 pl-3 pr-6 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                          >"""

new_select = r"""                          <select
                            value={field.allow_sub_fields ? 'Group Header' : field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                            disabled={field.allow_sub_fields}
                            className="w-full sm:text-sm border-slate-300 rounded-lg py-1.5 pl-3 pr-6 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            {field.allow_sub_fields && <option value="Group Header">Group Header</option>}"""

content = content.replace(old_select, new_select)

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
