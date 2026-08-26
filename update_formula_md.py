import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = "return <option key={f.id} value={f.labelEn || f.labelMr || f.id}>{path}</option>"
good = "return <option key={f.id} value={f.labelEn || f.labelMr || f.id}>{f.type === 'Master Data Field' ? `📊 ${path}` : path}</option>"
content = content.replace(bad, good)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
