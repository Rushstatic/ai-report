import re

with open('src/utils/syncForms.ts', 'r') as f:
    content = f.read()

# We want to replace the whole STANDARD_FORMS array with an empty array.
# Let's find where it starts and ends, or just do a regex substitution.

pattern = re.compile(r"export const STANDARD_FORMS: StandardFormDefinition\[\] = \[.*?\];", re.DOTALL)
content = pattern.sub("export const STANDARD_FORMS: StandardFormDefinition[] = [];", content)

with open('src/utils/syncForms.ts', 'w') as f:
    f.write(content)
