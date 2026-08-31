import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_retry = """          if (insertErr && (insertErr.message?.includes('employee_wise_submission') || insertErr.code === '42703')) {
            // Retry insert without employee_wise_submission column if database schema is awaiting migration
            delete insertPayload.employee_wise_submission;
            const retryRes = await (supabase
              .from('forms') as any)
              .insert(insertPayload);
            insertErr = retryRes.error;
          }"""

good_retry = """          if (insertErr && insertErr.code === '42703') {
            // Column missing, fallback to minimal payload
            console.warn('Database schema missing columns, falling back to basic insert', insertErr);
            const minimalInsert = {
              id: targetId,
              name: formName.trim(),
              code: finalCode,
              description: formDescription.trim(),
              reporting_period: period,
              report_type: reportType,
              active: isPublishing
            };
            const retryRes = await (supabase.from('forms') as any).insert(minimalInsert);
            insertErr = retryRes.error;
          }"""

content = content.replace(bad_retry, good_retry)

bad_update_retry = """          if (updateErr && (updateErr.message?.includes('employee_wise_submission') || updateErr.code === '42703')) {
            // Retry update without employee_wise_submission column if database schema is awaiting migration
            delete updatePayload.employee_wise_submission;
            const retryRes = await (supabase
              .from('forms') as any)
              .update(updatePayload)
              .eq('id', loadedFormId);
            updateErr = retryRes.error;
          }"""

good_update_retry = """          if (updateErr && updateErr.code === '42703') {
            console.warn('Database schema missing columns, falling back to basic update', updateErr);
            const minimalUpdate = {
              name: formName.trim(),
              description: formDescription.trim(),
              reporting_period: period,
              report_type: reportType,
              active: isPublishing,
              updated_at: new Date().toISOString()
            };
            const retryRes = await (supabase.from('forms') as any).update(minimalUpdate).eq('id', loadedFormId);
            updateErr = retryRes.error;
          }"""

content = content.replace(bad_update_retry, good_update_retry)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

