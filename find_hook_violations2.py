import os
import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will just look for function components and see if they have early returns before hooks
    lines = content.split('\n')
    
    in_component = False
    has_early_return = False
    component_name = ""
    
    for i, line in enumerate(lines):
        if "export default function" in line or "export function" in line or "function " in line:
            in_component = True
            has_early_return = False
            
        if in_component:
            # check for simple early returns
            if re.search(r"if\s*\(.*?\)\s*return\s*<", line) or re.search(r"if\s*\(.*?\)\s*\{\s*return\s*<", line) or re.search(r"if\s*\(.*?\)\s*return\s*null", line) or re.search(r"if\s*\(.*?\)\s*\{\s*return\s*null", line):
                has_early_return = True
                print(f"Possible early component return in {filepath} at line {i+1}: {line}")
            
            if has_early_return and re.search(r"\buse[A-Z]\w*\(", line):
                print(f"!!! HOOK AFTER EARLY RETURN in {filepath} at line {i+1}: {line}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            check_file(os.path.join(root, file))
