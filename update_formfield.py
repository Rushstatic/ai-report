with open('src/features/reports/ReportSubmission.tsx', 'r') as f:
    content = f.read()

content = content.replace("type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No';", "type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Yes/No' | 'Auto Calculated Field' | 'Read-only Field' | 'Master Data Field';")

old_iface = """interface FormField {
  id: string;
  name: string;
  label_en: string;
  label_mr: string;
  field_type: FieldType;
  is_required: boolean;
  options?: { id: string; label_en: string; label_mr: string; value: string }[];
}"""

new_iface = """interface FormField {
  id: string;
  name: string;
  label_en: string;
  label_mr: string;
  field_type: FieldType | string;
  is_required: boolean;
  options?: { id: string; label_en: string; label_mr: string; value: string }[];
  master_data_source?: string;
  master_data_field?: string;
  master_data_mode?: string;
  calculation_formula?: string;
}"""

content = content.replace(old_iface, new_iface)

with open('src/features/reports/ReportSubmission.tsx', 'w') as f:
    f.write(content)

