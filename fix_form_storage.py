import re

with open('src/utils/formStorage.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix getFormWithFields to load parent_field_id, allow_sub_fields etc.
old_load = r"""              required: !!f.is_required,
              options: f.form_field_options?.map((o: any) => ({
                id: o.id,
                labelEn: o.label_en,
                labelMr: o.label_mr,
                value: o.value
              })) || []
            }));"""

new_load = r"""              required: !!f.is_required,
              parent_field_id: f.parent_field_id || null,
              allow_sub_fields: f.allow_sub_fields || false,
              master_data_source: f.master_data_source || null,
              master_data_field: f.master_data_field || null,
              master_data_mode: f.master_data_mode || null,
              min_value: f.min_value,
              max_value: f.max_value,
              default_value: f.default_value,
              help_text: f.help_text,
              calculation: f.calculation_formula ? JSON.parse(f.calculation_formula) : undefined,
              conditional_logic: f.conditional_logic,
              options: f.form_field_options?.map((o: any) => ({
                id: o.id,
                labelEn: o.label_en,
                labelMr: o.label_mr,
                value: o.value
              })) || []
            }));"""

if old_load in content:
    content = content.replace(old_load, new_load)
else:
    print("Could not find the load fields block!")

with open('src/utils/formStorage.ts', 'w', encoding='utf-8') as f:
    f.write(content)
