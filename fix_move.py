import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Replace moveField function
old_move = """  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    if (direction === 'up' && index > 0) {
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    setFields(newFields);
  };"""

new_move = """  const moveField = (id: string, direction: 'up' | 'down') => {
    // Find field in the flat list
    const fieldIndex = fields.findIndex(f => f.id === id);
    if (fieldIndex === -1) return;
    const field = fields[fieldIndex];
    
    // Find siblings (fields with same parent_field_id)
    const siblings = fields.filter(f => f.parent_field_id === field.parent_field_id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const siblingIndex = siblings.findIndex(f => f.id === id);
    
    if (direction === 'up' && siblingIndex > 0) {
      const prevSibling = siblings[siblingIndex - 1];
      const newFields = [...fields];
      const idx1 = newFields.findIndex(f => f.id === id);
      const idx2 = newFields.findIndex(f => f.id === prevSibling.id);
      
      const tempOrder = newFields[idx1].display_order || 0;
      newFields[idx1].display_order = newFields[idx2].display_order || 0;
      newFields[idx2].display_order = tempOrder;
      
      setFields(newFields);
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
      const nextSibling = siblings[siblingIndex + 1];
      const newFields = [...fields];
      const idx1 = newFields.findIndex(f => f.id === id);
      const idx2 = newFields.findIndex(f => f.id === nextSibling.id);
      
      const tempOrder = newFields[idx1].display_order || 0;
      newFields[idx1].display_order = newFields[idx2].display_order || 0;
      newFields[idx2].display_order = tempOrder;
      
      setFields(newFields);
    }
  };"""

content = content.replace(old_move, new_move)

# Also update the calls
content = content.replace("moveField(index, 'up')", "moveField(field.id, 'up')")
content = content.replace("moveField(index, 'down')", "moveField(field.id, 'down')")

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
