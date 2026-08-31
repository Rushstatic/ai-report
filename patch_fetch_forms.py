import re

with open('src/utils/formStorage.ts', 'r') as f:
    content = f.read()

bad_sig = "export async function fetchAllActiveForms(targetRole?: string): Promise<StoredForm[]> {"
good_sig = "export async function fetchAllActiveForms(targetRole?: string, includeDrafts: boolean = false): Promise<StoredForm[]> {"
content = content.replace(bad_sig, good_sig)

bad_query = """      const { data: dbForms, error } = await (supabase
        .from('forms') as any)
        .select('*')
        .or('active.is.null,active.eq.true')
        .order('name');"""
good_query = """      let query = (supabase.from('forms') as any).select('*').order('name');
      if (!includeDrafts) {
        query = query.or('active.is.null,active.eq.true');
      }
      const { data: dbForms, error } = await query;"""
content = content.replace(bad_query, good_query)

bad_local = """  for (const lf of localForms) {
    if (lf.active !== false) {
      combinedMap.set(lf.id, lf);
    }
  }"""
good_local = """  for (const lf of localForms) {
    if (includeDrafts || lf.active !== false) {
      combinedMap.set(lf.id, lf);
    }
  }"""
content = content.replace(bad_local, good_local)

with open('src/utils/formStorage.ts', 'w') as f:
    f.write(content)

