with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("{/* Quick Indicator Presets */}")
if start_idx != -1:
    end_idx = content.find("/* Preview Component */")
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
