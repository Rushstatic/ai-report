import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Add GripVertical to imports
if 'GripVertical' not in content:
    content = content.replace("Building2\n} from 'lucide-react';", "Building2,\n  GripVertical\n} from 'lucide-react';")

# DnD Functions
dnd_code = """
  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, allowSub: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    el.classList.remove('border-t-blue-500', 'border-b-blue-500', 'border-t-2', 'border-b-2', 'bg-blue-50');

    if (allowSub && y > height * 0.25 && y < height * 0.75) {
      el.classList.add('bg-blue-50');
    } else if (y < height * 0.5) {
      el.classList.add('border-t-blue-500', 'border-t-2');
    } else {
      el.classList.add('border-b-blue-500', 'border-b-2');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('border-t-blue-500', 'border-b-blue-500', 'border-t-2', 'border-b-2', 'bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent, targetId: string, allowSub: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('border-t-blue-500', 'border-b-blue-500', 'border-t-2', 'border-b-2', 'bg-blue-50');

    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const newFields = [...fields];
    const sourceField = newFields.find(f => f.id === sourceId);
    const targetField = newFields.find(f => f.id === targetId);
    if (!sourceField || !targetField) return;

    // Prevent cyclic nesting
    let current = targetField;
    while (current.parent_field_id) {
      if (current.parent_field_id === sourceId) {
        // Cannot drop parent into its own child
        return;
      }
      const nextParent = newFields.find(f => f.id === current.parent_field_id);
      if (!nextParent) break;
      current = nextParent;
    }

    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let newParentId = targetField.parent_field_id;
    let isChildDrop = false;
    let insertBefore = false;

    if (allowSub && y > height * 0.25 && y < height * 0.75) {
      newParentId = targetField.id;
      isChildDrop = true;
    } else if (y < height * 0.5) {
      insertBefore = true;
    }

    sourceField.parent_field_id = newParentId || null;

    const siblings = newFields
      .filter(f => f.parent_field_id === newParentId && f.id !== sourceId)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    if (isChildDrop) {
      siblings.push(sourceField);
    } else {
      const targetSiblingIndex = siblings.findIndex(f => f.id === targetId);
      if (targetSiblingIndex !== -1) {
        if (insertBefore) {
          siblings.splice(targetSiblingIndex, 0, sourceField);
        } else {
          siblings.splice(targetSiblingIndex + 1, 0, sourceField);
        }
      } else {
        siblings.push(sourceField);
      }
    }

    siblings.forEach((s, idx) => {
      const f = newFields.find(x => x.id === s.id);
      if (f) f.display_order = idx;
    });

    setFields(newFields);
  };
"""

# Insert right before moveField
move_field_idx = content.find("  const moveField = (id: string")
content = content[:move_field_idx] + dnd_code + "\n" + content[move_field_idx:]

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

