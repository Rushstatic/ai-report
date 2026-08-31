import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad_buttons = """          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formName.trim() || fields.length === 0}
            className="inline-flex items-center px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {language === 'mr' ? 'जतन होत आहे...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {loadedFormId 
                  ? (saveMode === 'update' 
                      ? (language === 'mr' ? 'बदल जतन करा' : 'Save Changes') 
                      : (language === 'mr' ? 'नवीन आवृत्ती प्रकाशित करा' : 'Publish New Version'))
                  : (language === 'mr' ? 'प्रपत्र प्रकाशित करा (Publish)' : 'Publish Form')
                }
              </>
            )}
          </button>"""

good_buttons = """          <button 
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || !formName.trim() || fields.length === 0}
            className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-xs text-sm font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {language === 'mr' ? 'मसुदा म्हणून जतन करा' : 'Save as Draft'}
          </button>
          
          <button 
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || !formName.trim() || fields.length === 0}
            className="inline-flex items-center px-5 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {language === 'mr' ? 'जतन होत आहे...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {loadedFormId 
                  ? (saveMode === 'update' 
                      ? (language === 'mr' ? 'बदल जतन करा' : 'Update & Publish') 
                      : (language === 'mr' ? 'नवीन आवृत्ती प्रकाशित करा' : 'Publish New Version'))
                  : (language === 'mr' ? 'प्रपत्र प्रकाशित करा (Publish)' : 'Publish Form')
                }
              </>
            )}
          </button>"""

if bad_buttons in content:
    content = content.replace(bad_buttons, good_buttons)
else:
    print("Warning: Buttons not matched exactly")

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

