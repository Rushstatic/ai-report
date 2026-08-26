import re

with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Replace py-1.5 with conditionally py-1
# Replace sm:text-sm with conditionally text-xs
content = content.replace('py-1.5', '${compactMode ? \'py-1 text-xs\' : \'py-1.5 sm:text-sm\'}')
content = content.replace('sm:text-sm ', '') # remove static sm:text-sm to prevent conflict, but wait, it's inside className="..." so it's a string, not a template literal.

