with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const renderFieldNode =" in line:
        start = i
        break

for i in range(start, len(lines)):
    if lines[i].strip() == ");":
        end = i
        break

print("".join(lines[start:end+1]))
