with open('src/utils/formStorage.ts', 'r') as f:
    content = f.read()

new_fields = """  parent_field_id?: string | null;
  allow_sub_fields?: boolean;
  children?: FormFieldItem[];
  master_data_source?: string;
  master_data_field?: string;
  master_data_mode?: 'DISPLAY_ONLY' | 'CALCULATION_SOURCE';"""

content = content.replace("  parent_field_id?: string | null;\n  allow_sub_fields?: boolean;\n  children?: FormFieldItem[];", new_fields)
# Add Master Data Field to FormFieldType
content = content.replace("  | 'Village Selector' | 'Employee Selector' | 'Auto Calculated Field'\n  | 'Read-only Field';", "  | 'Village Selector' | 'Employee Selector' | 'Auto Calculated Field'\n  | 'Read-only Field' | 'Master Data Field';")

with open('src/utils/formStorage.ts', 'w') as f:
    f.write(content)
