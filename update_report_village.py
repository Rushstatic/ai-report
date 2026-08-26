import re

with open('src/features/reports/ReportSubmission.tsx', 'r') as f:
    content = f.read()

# Make sure we fetch population and house_count
content = content.replace("await (supabase.from('villages') as any).select('id, name, code').limit(20);", "await (supabase.from('villages') as any).select('id, name, code, population, house_count').limit(100);")

# Update handleVillageChange (or create it)
if 'handleVillageChange' not in content:
    content = content.replace('setSelectedVillageId(e.target.value)', 'handleVillageChange(e.target.value)')

    new_handler = """  const handleVillageChange = (vId: string) => {
    setSelectedVillageId(vId);
    if (!form || !form.fields) return;
    
    const v = villages.find(x => x.id === vId);
    if (v) {
      const newData = { ...formData };
      form.fields.forEach(f => {
        if (f.field_type === 'Master Data Field' && f.master_data_source === 'VILLAGE_MASTER') {
          if (f.master_data_field === 'Population') newData[f.id] = v.population || 0;
          if (f.master_data_field === 'House Count') newData[f.id] = v.house_count || 0;
          if (f.master_data_field === 'Village Name') newData[f.id] = v.name;
          if (f.master_data_field === 'Village Code') newData[f.id] = v.code || '';
        }
      });
      setFormData(newData);
    }
  };"""
    # Insert before handleInputChange
    idx = content.find("const handleInputChange =")
    if idx == -1:
        # maybe it's not there, let's just insert before setFormData(prev
        idx = content.find("const [periodStart")
        content = content[:idx] + new_handler + "\n\n  " + content[idx:]
    else:
        content = content[:idx] + new_handler + "\n\n  " + content[idx:]

    
with open('src/features/reports/ReportSubmission.tsx', 'w') as f:
    f.write(content)
