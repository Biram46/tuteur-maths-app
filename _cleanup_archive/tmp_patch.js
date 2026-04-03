const fs = require('fs');
let code = fs.readFileSync('app/hooks/useMathRouter.ts', 'utf8');

// Replace 1
code = code.replace(
    '                    // ── 3. Pré-calculer tous les résultats déterministes ──',
    `                    // ── Extraire le domaine (intervalle) s'il est spécifié ──
                    const vOptions: any = {};
                    const intMatch = cleanedInput.match(/\\[\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*[;,]\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*\\]/);
                    if (intMatch) {
                        vOptions.searchDomain = [parseFloat(intMatch[1]), parseFloat(intMatch[2])];
                    }

                    // ── 3. Pré-calculer tous les résultats déterministes ──`
);

// replace 2
code = code.replace(
    `body: JSON.stringify({ type: 'sign_table', expression: exprClean, niveau: resolveNiveau(inputText) }),`,
    `body: JSON.stringify({ type: 'sign_table', expression: exprClean, niveau: resolveNiveau(inputText), options: vOptions }),`
);

// replace 3 - regex to match varying whitespace
code = code.replace(
    /expression:\s*exprClean,\s*niveau:\s*resolveNiveau\(inputText\),?\s*\}\)/g,
    `expression: exprClean, niveau: resolveNiveau(inputText), options: vOptions })`
);

// replace 4
code = code.replace(
    `body: JSON.stringify({ type: 'variation_table', expression: exprClean, niveau: resolveNiveau(inputText) }),`,
    `body: JSON.stringify({ type: 'variation_table', expression: exprClean, niveau: resolveNiveau(inputText), options: vOptions }),`
);

fs.writeFileSync('app/hooks/useMathRouter.ts', code);
console.log("Hooks patched!");
