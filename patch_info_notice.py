import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_notice = """      if (supabaseErrorNote) {
        setInfoNotice(
          language === 'mr'
            ? `टीप: सर्व उपकरणांवर त्वरित सिंक करण्यासाठी Supabase SQL Editor मध्ये मायग्रेशन 00017 चालवा.`
            : `Note: Live locally in portal. To sync across multi-tenant servers, run migration 00017 in your Supabase SQL Editor.`
        );
      }"""

good_notice = """      if (supabaseErrorNote) {
        setInfoNotice(supabaseErrorNote);
      }"""

content = content.replace(bad_notice, good_notice)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
