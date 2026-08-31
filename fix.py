with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r'className=\"max-w-5xl mx-auto space-y-6\"', 'className="max-w-5xl mx-auto space-y-6"')
content = content.replace(r'className=\"mb-2\"', 'className="mb-2"')
content = content.replace(r'className=\"text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium\"', 'className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"')
content = content.replace(r'className=\"w-4 h-4\"', 'className="w-4 h-4"')

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
