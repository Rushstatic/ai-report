import re

with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

preview_fn = r"""
  const renderPreviewFieldNode = (field: FormFieldItem, depth: number = 0): React.ReactNode => {
    const hasChildren = field.children && field.children.length > 0;

    if (hasChildren) {
      return (
        <div key={field.id} className={`my-4 border border-slate-200 rounded-lg overflow-hidden shadow-sm ${depth > 0 ? 'ml-2 sm:ml-6 mt-4 border-l-4 border-l-blue-400' : 'bg-white'}`}>
          <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">
              {language === 'mr' ? field.labelMr || field.labelEn : field.labelEn || field.labelMr}
              <span className="text-slate-500 font-normal ml-2 text-xs">
                ({language === 'mr' ? field.labelEn : field.labelMr})
              </span>
            </h3>
          </div>
          <div className="p-4 sm:p-5 space-y-5 bg-white">
            {field.children!.map(child => renderPreviewFieldNode(child, depth + 1))}
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} className={`space-y-1.5 ${depth > 0 ? 'mt-4' : ''}`}>
        <label className="block text-sm font-semibold text-slate-700">
          {language === 'mr' ? field.labelMr || field.labelEn : field.labelEn || field.labelMr}
          <span className="text-slate-400 font-normal ml-2 text-xs">
            ({language === 'mr' ? field.labelEn : field.labelMr})
          </span>
          {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
        
        {field.type === 'Text' && (
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
            placeholder="Enter text..."
            disabled
          />
        )}
          
        {field.type === 'Number' && (
          <input
            type="number"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
            placeholder="0"
            disabled
          />
        )}
          
        {field.type === 'Date' && (
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500"
            disabled
          />
        )}
          
        {field.type === 'Yes/No' && (
          <div className="flex items-center gap-6 mt-1 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input type="radio" name={field.id} disabled />
              <span>Yes (होय)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={field.id} disabled />
              <span>No (नाही)</span>
            </label>
          </div>
        )}
          
        {field.type === 'Dropdown' && (
          <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50" disabled>
            <option>-- Select --</option>
            {field.options?.map((opt, i) => (
              <option key={i}>{language === 'mr' ? opt.labelMr || opt.labelEn : opt.labelEn}</option>
            ))}
          </select>
        )}
      </div>
    );
  };
"""

content = content.replace("const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (", preview_fn + "\n  const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (")


# Replace fields.map inside the preview (around line 1474-1533)
import re
content = re.sub(
    r"fields\.map\(\(field\) => \(\s*<div key=\{field\.id\} className=\"space-y-1\.5\">[\s\S]*?<\/div>\s*\)\)",
    "buildFieldTree(fields).map(field => renderPreviewFieldNode(field))",
    content
)

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
