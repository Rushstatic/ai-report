import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_div = """    <div 
      style={{ marginLeft: `${depth * 2}rem` }}
      className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"
    >
                    {/* Index & Reorder */}
                    <div className="flex sm:flex-col items-center gap-1">"""

good_div = """    <div 
      style={{ marginLeft: `${depth * 2}rem` }}
      className="relative bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-300 transition-all shadow-xs"
      draggable={true}
      onDragStart={(e) => handleDragStart(e, field.id)}
      onDragOver={(e) => handleDragOver(e, field.allow_sub_fields || false)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, field.id, field.allow_sub_fields || false)}
    >
                    {/* Index & Reorder */}
                    <div className="flex sm:flex-col items-center gap-1">
                      <div className="text-slate-300 cursor-move hover:text-blue-500 mb-1" title="Drag to reorder/reparent">
                        <GripVertical className="h-4 w-4" />
                      </div>"""

content = content.replace(bad_div, good_div)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

