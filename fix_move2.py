import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Replace moveField function using regex
old_move = re.compile(r"  const moveField = \(index: number, direction: 'up' \| 'down'\) => \{.*?setFields\(newFields\);\n  \};", re.DOTALL)

new_move = """  const moveField = (id: string, direction: 'up' | 'down') => {
    const fieldIndex = fields.findIndex(f => f.id === id);
    if (fieldIndex === -1) return;
    const field = fields[fieldIndex];
    
    const siblings = fields.filter(f => f.parent_field_id === field.parent_field_id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const siblingIndex = siblings.findIndex(f => f.id === id);
    
    if (direction === 'up' && siblingIndex > 0) {
      const prevSibling = siblings[siblingIndex - 1];
      const newFields = [...fields];
      const idx1 = newFields.findIndex(f => f.id === id);
      const idx2 = newFields.findIndex(f => f.id === prevSibling.id);
      
      const tempOrder = newFields[idx1].display_order || idx1;
      newFields[idx1].display_order = newFields[idx2].display_order || idx2;
      newFields[idx2].display_order = tempOrder;
      
      setFields(newFields);
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
      const nextSibling = siblings[siblingIndex + 1];
      const newFields = [...fields];
      const idx1 = newFields.findIndex(f => f.id === id);
      const idx2 = newFields.findIndex(f => f.id === nextSibling.id);
      
      const tempOrder = newFields[idx1].display_order || idx1;
      newFields[idx1].display_order = newFields[idx2].display_order || idx2;
      newFields[idx2].display_order = tempOrder;
      
      setFields(newFields);
    }
  };"""

content = old_move.sub(new_move, content)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
