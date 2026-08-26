import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = """              help_text: f.help_text || null,
              calculation_formula: f.calculation ? JSON.stringify(f.calculation) : null,
              conditional_logic: f.conditional_logic ? f.conditional_logic : null,
            };"""
good = """              help_text: f.help_text || null,
              calculation_formula: f.calculation ? JSON.stringify(f.calculation) : null,
              conditional_logic: f.conditional_logic ? f.conditional_logic : null,
              master_data_source: f.master_data_source || null,
              master_data_field: f.master_data_field || null,
              master_data_mode: f.master_data_mode || null,
            };"""

content = content.replace(bad, good)

# Add Master Data Field to the field type options in renderFieldNode
bad_options = """                          <option value="Yes/No">{language === 'mr' ? 'होय / नाही (Yes/No)' : 'Yes/No'}</option>
                          <option value="Auto Calculated Field">{language === 'mr' ? 'स्वयंचलित गणना (Auto Calculated)' : 'Auto Calculated Field'}</option>
                          <option value="Read-only Field">{language === 'mr' ? 'फक्त वाचण्यायोग्य (Read-only)' : 'Read-only Field'}</option>"""
good_options = """                          <option value="Yes/No">{language === 'mr' ? 'होय / नाही (Yes/No)' : 'Yes/No'}</option>
                          <option value="Auto Calculated Field">{language === 'mr' ? 'स्वयंचलित गणना (Auto Calculated)' : 'Auto Calculated Field'}</option>
                          <option value="Read-only Field">{language === 'mr' ? 'फक्त वाचण्यायोग्य (Read-only)' : 'Read-only Field'}</option>
                          <option value="Master Data Field">{language === 'mr' ? 'मास्टर डेटा (Master Data)' : 'Master Data Field'}</option>"""

content = content.replace(bad_options, good_options)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

