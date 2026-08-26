with open('src/features/forms/FormBuilder.tsx', 'r') as f:
    content = f.read()

# Replace the broken end
bad_end = """                  </div>
                ))
                    {/* Render Children */}
                    {field.children && field.children.length > 0 && (
                      <div className="w-full mt-4 space-y-4 border-l-2 border-blue-200 pl-4">
                        {field.children.map((child, childIdx) => renderFieldNode(child, childIdx, depth + 1))}
                      </div>
                    )}

  );"""

good_end = """                  </div>
                    {/* Render Children */}
                    {field.children && field.children.length > 0 && (
                      <div className="w-full mt-4 space-y-4 border-l-2 border-blue-200 pl-4">
                        {field.children.map((child, childIdx) => renderFieldNode(child, childIdx, depth + 1))}
                      </div>
                    )}
                  </div>
  );"""

content = content.replace(bad_end, good_end)

with open('src/features/forms/FormBuilder.tsx', 'w') as f:
    f.write(content)
