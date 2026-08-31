import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Update the insert fallback condition
old_insert_cond = "if (insertErr && insertErr.code === '42703')"
new_insert_cond = "if (insertErr && (insertErr.code === '42703' || (insertErr.message && insertErr.message.includes('schema cache'))))"
content = content.replace(old_insert_cond, new_insert_cond)

# Update the update fallback condition
old_update_cond = "if (updateErr && updateErr.code === '42703')"
new_update_cond = "if (updateErr && (updateErr.code === '42703' || (updateErr.message && updateErr.message.includes('schema cache'))))"
content = content.replace(old_update_cond, new_update_cond)

# Update the fields fallback condition
old_fields_cond = "if (fieldInsertErr && fieldInsertErr.code === '42703')"
new_fields_cond = "if (fieldInsertErr && (fieldInsertErr.code === '42703' || (fieldInsertErr.message && fieldInsertErr.message.includes('schema cache'))))"
content = content.replace(old_fields_cond, new_fields_cond)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
