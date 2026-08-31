import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Change function signature
content = content.replace("const handleSave = async () => {", "const handleSave = async (isPublishing: boolean = true) => {")

# In updatePayload
bad_update = """          const updatePayload: any = {
            name: formName.trim(),
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            employee_wise_submission: employeeWiseSubmission,
            active: true,
            updated_at: new Date().toISOString()
          };"""
good_update = """          const updatePayload: any = {
            name: formName.trim(),
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            employee_wise_submission: employeeWiseSubmission,
            active: isPublishing,
            updated_at: new Date().toISOString()
          };"""
content = content.replace(bad_update, good_update)

# In insertPayload
bad_insert = """          const insertPayload: any = {
            id: targetId,
            name: formName.trim(),
            code: finalCode,
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            employee_wise_submission: employeeWiseSubmission,
            active: true
          };"""
good_insert = """          const insertPayload: any = {
            id: targetId,
            name: formName.trim(),
            code: finalCode,
            description: formDescription.trim(),
            reporting_period: period,
            report_type: reportType,
            employee_wise_submission: employeeWiseSubmission,
            active: isPublishing
          };"""
content = content.replace(bad_insert, good_insert)

# In storedFormObject
bad_stored = """      employee_wise_submission: employeeWiseSubmission,
      version: nextVersion,
      parent_form_id: finalParentId,
      active: true,
      fields: fields.map((f, idx) => ({"""
good_stored = """      employee_wise_submission: employeeWiseSubmission,
      version: nextVersion,
      parent_form_id: finalParentId,
      active: isPublishing,
      fields: fields.map((f, idx) => ({"""
content = content.replace(bad_stored, good_stored)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

