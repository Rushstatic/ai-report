import re
with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"\{\/\* Quick Indicator Presets \*\/\}.*?\{\/\* Preview Component \*\/\}\s*", "{/* Preview Component */}\n      ", content, flags=re.DOTALL)

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
