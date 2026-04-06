const fs = require('fs');
let code = fs.readFileSync('app/hooks/useMathRouter.ts', 'utf8');

// The single replace function isn't working for multiline / spaces. Let me use regex for the whole block!
code = code.replace(
/body: JSON\.stringify\(\{ type: 'sign_table', expression: exprClean, niveau: resolveNiveau\(inputText\) \}\),/g,
"body: JSON.stringify({ type: 'sign_table', expression: exprClean, niveau: resolveNiveau(inputText), options: vOptions }),"
);

code = code.replace(
/expression: exprClean,\r?\n\s+niveau: resolveNiveau\(inputText\),\r?\n\s+\}\)/g,
"expression: exprClean, niveau: resolveNiveau(inputText), options: vOptions })"
);

code = code.replace(
/body: JSON\.stringify\(\{ type: 'variation_table', expression: exprClean, niveau: resolveNiveau\(inputText\) \}\),/g,
"body: JSON.stringify({ type: 'variation_table', expression: exprClean, niveau: resolveNiveau(inputText), options: vOptions }),"
);

fs.writeFileSync('app/hooks/useMathRouter.ts', code);
console.log("Hooks patched via regex g!");
