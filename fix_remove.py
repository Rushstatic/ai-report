with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

old = """  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };"""

new = """  const removeField = (id: string) => {
    // Collect all descendants to remove
    const idsToRemove = new Set([id]);
    let currentIds = [id];
    
    while (currentIds.length > 0) {
      const nextIds = fields.filter(f => currentIds.includes(f.parent_field_id as string)).map(f => f.id);
      nextIds.forEach(nid => idsToRemove.add(nid));
      currentIds = nextIds;
    }
    
    setFields(fields.filter(f => !idsToRemove.has(f.id)));
  };"""

content = content.replace(old, new)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
