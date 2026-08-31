import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_catch = """        if (err?.code === '42501') {
          supabaseErrorNote = 'RLS Permission Denied. You MUST run all pending SQL migrations (especially 00017) in your Supabase dashboard to enable cloud saving.';
        } else {"""

good_catch = """        if (err?.code === '42501') {
          supabaseErrorNote = 'RLS Permission Denied. Please run the migration file "00021_fix_form_builder_rls.sql" in your Supabase SQL Editor.';
        } else {"""

content = content.replace(bad_catch, good_catch)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

