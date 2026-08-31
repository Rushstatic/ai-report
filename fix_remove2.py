with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove loadPreset
start_idx = content.find("const loadPreset =")
if start_idx != -1:
    end_idx = content.find("const handleSave = async")
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
