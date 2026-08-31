with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("/* Preview Component */\n        <div className=\"bg-white p-8 rounded-xl", "{isPreviewMode ? (\n        /* Preview Component */\n        <div className=\"bg-white p-8 rounded-xl")

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
