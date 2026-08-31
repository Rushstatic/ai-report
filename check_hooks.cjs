const fs = require('fs');
const ts = require('typescript');

function checkFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

    function checkComponentBody(node, functionName) {
        let hasEarlyReturn = false;
        if (!node.body || !ts.isBlock(node.body)) return;
        
        for (const statement of node.body.statements) {
            // Check if it's an early return
            if (ts.isReturnStatement(statement) && statement !== node.body.statements[node.body.statements.length - 1]) {
                hasEarlyReturn = true;
                console.log(`Early return in ${functionName} at ${sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1} in ${filePath}`);
            }
            if (ts.isIfStatement(statement)) {
                // simple heuristic
                const text = statement.getText();
                if (text.includes('return ') || text.includes('return;')) {
                    hasEarlyReturn = true;
                    console.log(`Early return in ${functionName} at ${sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1} in ${filePath}`);
                }
            }
            
            // Check if we hit a hook after early return
            if (hasEarlyReturn) {
                // look for hook call
                let hookFound = false;
                const checkHook = (n) => {
                    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text.startsWith('use')) {
                        hookFound = true;
                    }
                    ts.forEachChild(n, checkHook);
                };
                checkHook(statement);
                if (hookFound) {
                    console.log(`!!! HOOK AFTER EARLY RETURN in ${functionName} at line ${sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1} in ${filePath}`);
                }
            }
        }
    }

    function visit(node) {
        if (ts.isFunctionDeclaration(node)) {
            if (node.name && node.name.text[0] === node.name.text[0].toUpperCase()) {
                checkComponentBody(node, node.name.text);
            }
        } else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
            if (node.name && node.name.text[0] === node.name.text[0].toUpperCase()) {
                checkComponentBody(node.initializer, node.name.text);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = dir + '/' + file;
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            checkFile(fullPath);
        }
    }
}

walkDir('./src');
