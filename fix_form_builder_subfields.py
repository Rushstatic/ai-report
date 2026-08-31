import re

with open('src/features/forms/FormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We want to remove the field.allow_sub_fields condition around the Add Sub-field button.
# Let's find the button code first.

old_btn = r"""                          {field.allow_sub_fields && (
                            <button
                              type="button"
                              onClick={() => addField(field.id)}
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              {language === 'mr' ? '+ उप-निर्देशक' : '+ Sub-field'}
                            </button>
                          )}"""

new_btn = r"""                          <button
                            type="button"
                            onClick={() => {
                              updateField(field.id, { allow_sub_fields: true });
                              addField(field.id);
                            }}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {language === 'mr' ? '+ उप-निर्देशक' : '+ Sub-field'}
                          </button>"""

if old_btn in content:
    content = content.replace(old_btn, new_btn)
else:
    print("Could not find the Add Sub-field button block!")

with open('src/features/forms/FormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
