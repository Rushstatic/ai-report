import re

with open('src/features/reports/ReportSubmission.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add parent_field_id and children to FormField interface
old_interface = r"""  master_data_mode?: string;
  calculation_formula?: string;
}"""

new_interface = r"""  master_data_mode?: string;
  calculation_formula?: string;
  parent_field_id?: string | null;
  children?: FormField[];
}"""

if old_interface in content:
    content = content.replace(old_interface, new_interface)
else:
    print("Could not find FormField interface!")

# 2. Add parent_field_id to mapping
old_mapping = r"""          is_required: f.required !== undefined ? !!f.required : !!f.is_required,
          options: (f.options || []).map((o: any) => ({"""

new_mapping = r"""          is_required: f.required !== undefined ? !!f.required : !!f.is_required,
          parent_field_id: f.parent_field_id || f.parentFieldId || null,
          options: (f.options || []).map((o: any) => ({"""

if old_mapping in content:
    content = content.replace(old_mapping, new_mapping)
else:
    print("Could not find mappedFields!")

with open('src/features/reports/ReportSubmission.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
