with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_start = """const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (

                  <div 
                   
                    className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"
                  >"""

good_start = """const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (
                  <React.Fragment key={field.id}>
                  <div 
                    style={{ marginLeft: `${depth * 2}rem` }}
                    className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"
                  >"""

content = content.replace(bad_start, good_start)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
