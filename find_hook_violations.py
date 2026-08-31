import os
import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will just look for function components and see if they have early returns before hooks
    # Find all "use..." words
    lines = content.split('\n')
    
    in_component = False
    has_early_return = False
    component_name = ""
    
    for i, line in enumerate(lines):
        if "export default function" in line or "export function" in line or "function " in line:
            in_component = True
            has_early_return = False
            
        if in_component:
            # check for return statement that is likely a component return (returns JSX or null)
            # This is a bit tricky, but let's just look for `return (` or `return <` or `return null`
            if re.match(r"^\s*return\s*\(", line) or re.match(r"^\s*return\s*<", line) or re.match(r"^\s*return\s*null", line) or re.match(r"^\s*if\s*\(.*?\)\s*\{\s*return\b", line) or re.match(r"^\s*if\s*\(.*?\)\s*return\b", line):
                # We found a return. If it's an early return, we might see hooks later.
                # Actually, wait, if we see a `return`, it might just be the end of the component.
                # Let's just track if we see a `return` before a hook.
                has_early_return = True
            
            if has_early_return and re.match(r"^\s*(const|let|var)\s+.*?=\s*use[A-Z]", line):
                print(f"Violation found in {filepath} at line {i+1}: {line}")
            elif has_early_return and re.match(r"^\s*use[A-Z].*?\(", line):
                print(f"Violation found in {filepath} at line {i+1}: {line}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            check_file(os.path.join(root, file))
