with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

s = content.find("{/* Quick Indicator Presets */}")
e = content.find("{/* Preview Component */}")
print(s, e)
