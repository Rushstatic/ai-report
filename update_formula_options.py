import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = "{fields.filter(f => f.id !== field.id && (f.type === 'Number' || f.type === 'Auto Calculated Field')).map(f => {"
good = "{fields.filter(f => f.id !== field.id && (f.type === 'Number' || f.type === 'Auto Calculated Field' || (f.type === 'Master Data Field' && f.master_data_mode === 'CALCULATION_SOURCE'))).map(f => {"
content = content.replace(bad, good)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

