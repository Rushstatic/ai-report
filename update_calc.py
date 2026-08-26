import re

with open('src/features/reports/ReportSubmission.tsx', 'r') as f:
    content = f.read()

calc_logic = """
  // Auto-calculation Engine
  useEffect(() => {
    if (!form || !form.fields) return;

    let hasChanges = false;
    const newData = { ...formData };

    form.fields.filter(f => f.field_type === 'Auto Calculated Field' && f.calculation_formula).forEach(calcField => {
      try {
        const calcObj = JSON.parse(calcField.calculation_formula!);
        if (!calcObj.formula) return;
        
        let formulaStr = calcObj.formula;
        let canEvaluate = true;

        // Replace all {field_name} with actual values
        const matches = formulaStr.match(/\{([^}]+)\}/g);
        if (matches) {
          matches.forEach((m: string) => {
            const fieldName = m.slice(1, -1);
            // Find the field with this label
            const sourceField = form.fields.find(f => (f.label_en || f.label_mr) === fieldName || f.id === fieldName);
            if (sourceField) {
              const val = newData[sourceField.id];
              if (val === undefined || val === '') {
                canEvaluate = false; // Missing data
              } else {
                formulaStr = formulaStr.replace(m, String(val));
              }
            } else {
              canEvaluate = false;
            }
          });
        }

        if (canEvaluate) {
          // Replace SUM( ) and AVG( ) safely if they exist
          formulaStr = formulaStr.replace(/SUM\(\s*\)/g, '0'); // Placeholder if SUM isn't fully implemented
          formulaStr = formulaStr.replace(/AVG\(\s*\)/g, '0');
          
          // Evaluate safely
          // eslint-disable-next-line no-new-func
          const result = new Function('return ' + formulaStr)();
          
          if (!isNaN(result) && result !== Infinity && result !== -Infinity) {
            const finalVal = Number.isInteger(result) ? result : Number(result.toFixed(2));
            if (newData[calcField.id] !== finalVal) {
              newData[calcField.id] = finalVal;
              hasChanges = true;
            }
          }
        } else {
          if (newData[calcField.id] !== '') {
            newData[calcField.id] = '';
            hasChanges = true;
          }
        }
      } catch (err) {
        console.error('Calculation error for', calcField.label_en, err);
      }
    });

    if (hasChanges) {
      setFormData(newData);
    }
  }, [formData, form]);
"""

# insert right before return (
idx = content.find("  return (")
content = content[:idx] + calc_logic + "\n" + content[idx:]

with open('src/features/reports/ReportSubmission.tsx', 'w') as f:
    f.write(content)

