import re

with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add viewMode state
content = re.sub(
    r"const \[loadingForms, setLoadingForms\] = useState\(false\);",
    r"const [loadingForms, setLoadingForms] = useState(false);\n  const [viewMode, setViewMode] = useState<'list' | 'builder'>('list');",
    content
)

# 2. Add handleCreateForm, handleEditForm, handleBackToList
new_functions = """
  const handleCreateForm = () => {
    setLoadedFormId(null);
    setParentFormId(null);
    setCurrentVersion(1);
    setFormName('');
    setFormDescription('');
    setFormCode('');
    setPeriod('Monthly');
    setReportType('VILLAGE_NUMERICAL');
    setTargetRole('ALL');
    setEmployeeWiseSubmission(false);
    setFields([]);
    setSaveMode('update');
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoNotice(null);
    setViewMode('builder');
  };

  const handleEditForm = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoNotice(null);
    const fullForm = await getFormWithFields(id);
    if (!fullForm) return;

    setLoadedFormId(fullForm.id);
    setParentFormId(fullForm.parent_form_id || fullForm.id);
    setCurrentVersion(fullForm.version || 1);
    setFormName(fullForm.name || '');
    setFormDescription(fullForm.description || '');
    setFormCode(fullForm.form_code || '');
    setPeriod((fullForm.reporting_period as ReportPeriod) || 'Monthly');
    setReportType((fullForm.report_type as ReportType) || 'VILLAGE_NUMERICAL');
    setTargetRole(fullForm.target_role || 'ALL');
    setEmployeeWiseSubmission(fullForm.employee_wise_submission ?? false);
    setFields(fullForm.fields || []);
    setViewMode('builder');
  };

  const handleBackToList = () => {
    setViewMode('list');
    loadAllForms();
  };
"""

content = re.sub(r"const handleSelectForm = async \(e: React\.ChangeEvent<HTMLSelectElement>\) => \{", new_functions + r"\n  const handleSelectForm = async (e: React.ChangeEvent<HTMLSelectElement>) => {", content)

# 3. Replace the return statement to include the list view
list_view = """  if (viewMode === 'list') {
    const periods = ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Yearly'];
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {language === 'mr' ? 'प्रकाशित प्रपत्रे' : 'Published Forms'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {language === 'mr' ? 'सर्व अहवाल प्रपत्रांचे व्यवस्थापन करा' : 'Manage all health reporting forms'}
            </p>
          </div>
          <button
            onClick={handleCreateForm}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'mr' ? 'नवीन प्रपत्र तयार करा' : 'Create New Form'}
          </button>
        </div>

        {loadingForms ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {periods.map(period => {
              const periodForms = existingForms.filter(f => f.reporting_period === period);
              if (periodForms.length === 0) return null;
              
              return (
                <div key={period} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      {period} {language === 'mr' ? 'अहवाल' : 'Reports'}
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full ml-2">
                        {periodForms.length}
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {periodForms.map(form => (
                      <div key={form.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{form.name}</h4>
                            {form.is_active && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{form.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {form.target_role || 'ALL'}</span>
                            <span className="flex items-center gap-1"><Pencil className="w-3.5 h-3.5"/> v{form.version || 1}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditForm(form.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-slate-200 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4 mr-1.5" />
                          {language === 'mr' ? 'संपादित करा' : 'Edit'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {existingForms.length === 0 && (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
                <Database className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">
                  {language === 'mr' ? 'कोणतेही प्रपत्र आढळले नाही' : 'No forms found'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {language === 'mr' ? 'नवीन अहवाल प्रपत्र तयार करण्यासाठी वरील बटणावर क्लिक करा.' : 'Get started by creating a new reporting form.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
"""

content = re.sub(r"  return \(\n    <div className=\"max-w-5xl mx-auto space-y-6\">\n      \{\/\* Header Bar \*\/\}", list_view + r"    <div className=\"max-w-5xl mx-auto space-y-6\">\n      <div className=\"mb-2\">\n        <button onClick={handleBackToList} className=\"text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium\">\n          <ArrowLeft className=\"w-4 h-4\" /> {language === 'mr' ? 'मागे जा' : 'Back to Forms'}\n        </button>\n      </div>\n      {/* Header Bar */}", content)

if "ArrowLeft" not in content:
    content = content.replace("ArrowDown,", "ArrowDown,\n  ArrowLeft,")

# Remove the loadPreset function block completely
content = re.sub(r"  const loadPreset = \(.*?\}\s*\}\s*};\s*", "", content, flags=re.DOTALL)

# Remove the block: {/* Quick Indicator Presets */} ... {isPreviewMode ? (
content = re.sub(r"\{\/\* Quick Indicator Presets \*\/}.*?\{\/\* Preview Component \*\/\}", "{/* Preview Component */}", content, flags=re.DOTALL)

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Changes applied")
