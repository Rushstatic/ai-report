import re

with open('src/features/reports/ReportSubmission.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_fn_pattern = re.compile(r"const renderReportFieldNode = \(field: FormField, depth: number = 0\): React\.ReactNode => \{.*?\};\n", re.DOTALL)

new_fn = """const renderReportFieldNode = (field: FormField, depth: number = 0): React.ReactNode => {
    const hasChildren = field.children && field.children.length > 0;

    if (hasChildren) {
      return (
        <div key={field.id} className={`my-4 border border-slate-200 rounded-lg overflow-hidden shadow-sm ${depth > 0 ? 'ml-2 sm:ml-6 mt-4 border-l-4 border-l-blue-400' : 'bg-white'}`}>
          <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">
              {language === 'mr' ? field.label_mr : field.label_en}
              <span className="text-slate-500 font-normal ml-2 text-xs">
                ({language === 'mr' ? field.label_en : field.label_mr})
              </span>
            </h3>
          </div>
          <div className="p-4 sm:p-5 space-y-5 bg-white">
            {field.children!.map(child => renderReportFieldNode(child, depth + 1))}
          </div>
        </div>
      );
    }

    return (
      <React.Fragment key={field.id}>
        <div className={`space-y-1.5 ${depth > 0 ? 'mt-4' : ''}`}>
          <label htmlFor={field.id} className="block text-sm font-semibold text-slate-700">
            {language === 'mr' ? field.label_mr : field.label_en}
            <span className="text-slate-400 font-normal ml-2 text-xs">
              ({language === 'mr' ? field.label_en : field.label_mr})
            </span>
            {field.is_required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>

          {(field.field_type === 'Master Data Field' || field.field_type === 'Auto Calculated Field' || field.field_type === 'Read-only Field') && (
            <div className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-100 ${field.field_type === 'Master Data Field' ? 'border-purple-200 text-purple-900 bg-purple-50 font-semibold' : 'border-slate-200 text-slate-600'}`}>
              {formData[field.id] !== undefined && formData[field.id] !== '' ? formData[field.id] : (field.field_type === 'Master Data Field' ? (language === 'mr' ? 'आपोआप भरले जाईल' : 'Auto-populated') : '-')}
            </div>
          )}

          {field.field_type === 'Number' && (
            <input
              type="number"
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          )}

          {field.field_type === 'Text' && (
            <input
              type="text"
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={language === 'mr' ? 'माहिती प्रविष्ट करा...' : 'Enter details...'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          )}

          {field.field_type === 'Date' && (
            <input
              type="date"
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          )}

          {field.field_type === 'Yes/No' && (
            <div className="flex items-center gap-6 mt-1">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  checked={formData[field.id] === 'yes'}
                  onChange={() => handleInputChange(field.id, 'yes')}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                />
                <span>{language === 'mr' ? 'होय (Yes)' : 'Yes (होय)'}</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  checked={formData[field.id] === 'no'}
                  onChange={() => handleInputChange(field.id, 'no')}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                />
                <span>{language === 'mr' ? 'नाही (No)' : 'No (नाही)'}</span>
              </label>
            </div>
          )}

          {field.field_type === 'Dropdown' && (
            <select
              id={field.id}
              required={field.is_required}
              value={formData[field.id] !== undefined ? formData[field.id] : ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">{language === 'mr' ? '-- निवडा --' : '-- Select --'}</option>
              {field.options?.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {language === 'mr' ? opt.label_mr || opt.label_en : opt.label_en}
                </option>
              ))}
            </select>
          )}
        </div>
      </React.Fragment>
    );
  };
"""

content = old_fn_pattern.sub(new_fn, content)

with open('src/features/reports/ReportSubmission.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
