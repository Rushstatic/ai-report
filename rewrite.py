import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# We need to replace `fields.map((field, index) => (`
# with `buildFieldTree(fields).map((field, index) => renderFieldNode(field, index))`
# and extract the body of the map into `const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0) => { return (...) }`

# Since it's large, let's find the boundaries.
start_marker = "fields.map((field, index) => ("
end_marker = "                ))\n              )}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker) + len("                ))")

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

body = content[start_idx + len(start_marker):end_idx]

# Replace some stuff inside body to handle depth
body = body.replace('key={field.id}', 'key={field.id}\n                    style={{ marginLeft: `${depth * 2}rem` }}')
body = body.replace('onClick={() => removeField(field.id)}', 'onClick={() => removeField(field.id)}')

# Add "Add Sub-field" button next to "Remove"
add_sub_btn = """
                          <button
                            type="button"
                            onClick={() => addField(field.id)}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {language === 'mr' ? '+ उप-निर्देशक' : '+ Sub-field'}
                          </button>
"""
body = body.replace('<Trash2 className="h-3.5 w-3.5 mr-1" />', add_sub_btn + '\n                            <Trash2 className="h-3.5 w-3.5 mr-1" />')

# Append recursive child rendering
child_render = """
                    {/* Render Children */}
                    {field.children && field.children.length > 0 && (
                      <div className="w-full mt-4 space-y-4 border-l-2 border-blue-200 pl-4">
                        {field.children.map((child, childIdx) => renderFieldNode(child, childIdx, depth + 1))}
                      </div>
                    )}
"""
body = body.rstrip() + child_render

func_def = "const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (\n" + body + "\n  );"

# Insert func_def before `return (`
return_idx = content.find("  return (")
new_content = content[:return_idx] + func_def + "\n\n" + content[return_idx:start_idx] + "buildFieldTree(fields).map((field, index) => renderFieldNode(field, index))" + content[end_idx:]

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(new_content)

print("Done!")
