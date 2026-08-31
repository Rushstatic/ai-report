import re

with open('src/features/reports/ReportSubmission.tsx', 'r') as f:
    content = f.read()

# Add a useEffect to auto-populate master data when selectedVillageId changes (or on initial load)
auto_populate_effect = """
  // Auto-populate Master Data when village is selected or changed
  useEffect(() => {
    if (!form || !form.fields || !villages.length || !selectedVillageId) return;

    const v = villages.find(x => x.id === selectedVillageId);
    if (v) {
      let hasChanges = false;
      const newData = { ...formData };
      
      form.fields.forEach(f => {
        if (f.field_type === 'Master Data Field' && f.master_data_source === 'VILLAGE_MASTER') {
          let expectedVal: any = '';
          if (f.master_data_field === 'Population') expectedVal = v.population || 0;
          if (f.master_data_field === 'House Count') expectedVal = v.house_count || 0;
          if (f.master_data_field === 'Village Name') expectedVal = v.name;
          if (f.master_data_field === 'Village Code') expectedVal = v.code || '';
          
          if (newData[f.id] !== expectedVal) {
            newData[f.id] = expectedVal;
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        setFormData(newData);
      }
    }
  }, [selectedVillageId, form, villages]);
"""

idx = content.find("  const handleVillageChange =")
content = content[:idx] + auto_populate_effect + "\n" + content[idx:]

# Ensure employee query also selects population and house_count
content = content.replace(".select('id, name, code')", ".select('id, name, code, population, house_count')")

with open('src/features/reports/ReportSubmission.tsx', 'w') as f:
    f.write(content)

