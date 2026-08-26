with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = """                          <button
                            type="button"
                            onClick={() => removeField(field.id)}
                            className="inline-flex items-center text-xs text-red-600 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded"
                          >
                            
                          <button
                            type="button"
                            onClick={() => addField(field.id)}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {language === 'mr' ? '+ उप-निर्देशक' : '+ Sub-field'}
                          </button>

                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {language === 'mr' ? 'काढून टाका' : 'Remove'}
                          </button>"""

good = """                          {field.allow_sub_fields && (
                            <button
                              type="button"
                              onClick={() => addField(field.id)}
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              {language === 'mr' ? '+ उप-निर्देशक' : '+ Sub-field'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeField(field.id)}
                            className="inline-flex items-center text-xs text-red-600 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {language === 'mr' ? 'काढून टाका' : 'Remove'}
                          </button>"""

content = content.replace(bad, good)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
