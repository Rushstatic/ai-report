import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_catch = """      } catch (err: any) {
        console.warn('Supabase save warning (fallback to local form storage):', err);
        supabaseErrorNote = err?.message || 'Supabase database policy requires migration';
      }"""

good_catch = """      } catch (err: any) {
        console.warn('Supabase save warning (fallback to local form storage):', err);
        if (err?.code === '42501') {
          supabaseErrorNote = 'RLS Permission Denied. You MUST run all pending SQL migrations (especially 00017) in your Supabase dashboard to enable cloud saving.';
        } else {
          supabaseErrorNote = err?.message || 'Database schema requires migration';
        }
      }"""

content = content.replace(bad_catch, good_catch)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

