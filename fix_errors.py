with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix code vs form_code
content = content.replace("setFormCode(fullForm.form_code || '');", "setFormCode(fullForm.code || '');")

# Add ArrowLeft to imports if it is not there
if "ArrowLeft" not in content:
    content = content.replace("ArrowDown,", "ArrowDown,\n  ArrowLeft,")

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
