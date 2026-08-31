import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = "const forms = await fetchAllActiveForms();"
good = "const forms = await fetchAllActiveForms(undefined, true);"
content = content.replace(bad, good)

# Also let's update the title in the select form dialog to show if it's draft
bad_title = """                      <h4 className="font-bold text-slate-800">{f.name}</h4>"""
good_title = """                      <h4 className="font-bold text-slate-800">
                        {f.name}
                        {f.active === false && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            Draft
                          </span>
                        )}
                      </h4>"""
content = content.replace(bad_title, good_title)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

