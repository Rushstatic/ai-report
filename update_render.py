import re

with open('src/features/reports/ReportSubmission.tsx', 'r') as f:
    content = f.read()

master_render = """                {(field.field_type === 'Master Data Field' || field.field_type === 'Auto Calculated Field' || field.field_type === 'Read-only Field') && (
                  <div className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-100 ${field.field_type === 'Master Data Field' ? 'border-purple-200 text-purple-900 bg-purple-50 font-semibold' : 'border-slate-200 text-slate-600'}`}>
                    {formData[field.id] !== undefined && formData[field.id] !== '' ? formData[field.id] : (field.field_type === 'Master Data Field' ? (language === 'mr' ? 'आपोआप भरले जाईल' : 'Auto-populated') : '-')}
                  </div>
                )}
"""

content = content.replace("{field.field_type === 'Number' && (", master_render + "\n                {field.field_type === 'Number' && (")

with open('src/features/reports/ReportSubmission.tsx', 'w') as f:
    f.write(content)

