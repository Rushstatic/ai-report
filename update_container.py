with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

content = content.replace('<div className="space-y-4">\n              {fields.length === 0', '<div className={`space-y-4 ${compactMode ? \'compact-mode\' : \'\'}`}>\n              {fields.length === 0')

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
