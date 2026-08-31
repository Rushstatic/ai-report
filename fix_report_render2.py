import re

with open('src/features/reports/ReportSubmission.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# First, find the boundary where we inserted buildFieldTree
start_idx = content.find("buildFieldTree(form.fields).map((field) => renderReportFieldNode(field))")

if start_idx != -1:
    end_idx = content.find("{/* Action Buttons */}")
    
    if end_idx != -1:
        # Reconstruct the correct section
        content = content[:start_idx] + "buildFieldTree(form.fields).map((field) => renderReportFieldNode(field))\n          )}\n        </div>\n\n        " + content[end_idx:]

with open('src/features/reports/ReportSubmission.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
