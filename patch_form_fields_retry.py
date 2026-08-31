import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_fields_insert = """          const { data: insertedFields } = await (supabase
            .from('form_fields') as any)
            .insert(fieldsToInsert)
            .select();"""

good_fields_insert = """          let { data: insertedFields, error: fieldInsertErr } = await (supabase
            .from('form_fields') as any)
            .insert(fieldsToInsert)
            .select();
            
          if (fieldInsertErr && fieldInsertErr.code === '42703') {
             console.warn('Database schema missing columns in form_fields, falling back to minimal', fieldInsertErr);
             const minimalFields = fieldsToInsert.map(f => {
               const { parent_field_id, allow_sub_fields, master_data_source, master_data_field, master_data_mode, ...rest } = f;
               return rest;
             });
             const retryRes = await (supabase.from('form_fields') as any).insert(minimalFields).select();
             insertedFields = retryRes.data;
             fieldInsertErr = retryRes.error;
          }
          if (fieldInsertErr) throw fieldInsertErr;
"""

content = content.replace(bad_fields_insert, good_fields_insert)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

