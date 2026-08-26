with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.startswith("const renderFieldNode ="):
        # We need to clean up lines from here to the opening <div of the card
        # Replace line i up to line i+4
        lines[i] = """const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (
  <React.Fragment key={field.id}>
    <div 
      style={{ marginLeft: `${depth * 2}rem` }}
      className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"
    >
"""
        lines[i+1] = ""
        lines[i+2] = ""
        lines[i+3] = ""
        lines[i+4] = ""
        lines[i+5] = ""
        break

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.writelines(lines)

