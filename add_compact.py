import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Add compactMode state
state_code = "  const [employeeWiseSubmission, setEmployeeWiseSubmission] = useState<boolean>(false);\n  const [compactMode, setCompactMode] = useState<boolean>(false);"
content = content.replace("  const [employeeWiseSubmission, setEmployeeWiseSubmission] = useState<boolean>(false);", state_code)

# Add Monitor to imports if not there
if 'Monitor' not in content:
    content = content.replace("GripVertical\n} from 'lucide-react';", "GripVertical,\n  Monitor\n} from 'lucide-react';")
elif 'Monitor' in content and 'Monitor,' not in content:
    content = content.replace("GripVertical,", "GripVertical,\n  Monitor,")

# Add the toggle button
toggle_btn = """          <button 
            type="button"
            onClick={() => setCompactMode(!compactMode)}
            className={`inline-flex items-center px-3 py-2 border shadow-xs text-sm font-medium rounded-lg transition-colors ${compactMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            title="Compact Mode for Nested View"
          >
            <Monitor className="mr-2 h-4 w-4" />
            {language === 'mr' ? 'कॉम्पॅक्ट मोड' : 'Compact Mode'}
          </button>
          
          <button 
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}"""
content = content.replace("""          <button \n            type="button"\n            onClick={() => setIsPreviewMode(!isPreviewMode)}""", toggle_btn)


# Update renderFieldNode to use compactMode
# We have a div that we need to change:
#     <div 
#      style={{ marginLeft: `${depth * 2}rem` }}
#      className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"

div_search = """    <div 
      style={{ marginLeft: `${depth * 2}rem` }}
      className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs\""""

div_replace = """    <div 
      style={{ marginLeft: compactMode ? `${depth * 1}rem` : `${depth * 2}rem` }}
      className={`relative bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start hover:border-blue-300 transition-all shadow-xs ${compactMode ? 'p-2 gap-2' : 'p-4 gap-4'}`}"""

content = content.replace(div_search, div_replace)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
