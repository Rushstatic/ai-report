with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

bad = """const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (
                  <div 
                    key={field.id}"""

good = """const renderFieldNode = (field: FormFieldItem, index: number, depth: number = 0): React.ReactNode => (
                  <React.Fragment key={field.id}>
                  <div 
                    style={{ marginLeft: `${depth * 2}rem` }} """

content = content.replace(bad, good)

# also remove the old `key={field.id}` inside the <div>
content = content.replace("                    key={field.id}\n                    style={{ marginLeft: `${depth * 2}rem` }} ", "                    ")

# close the fragment at the end
bad_end = """                      </div>
                    )}
                  </div>
  );"""

good_end = """                      </div>
                    )}
                  </React.Fragment>
  );"""

content = content.replace(bad_end, good_end)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)

print("Done")
