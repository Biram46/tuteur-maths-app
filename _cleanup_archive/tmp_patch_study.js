const fs = require('fs');
let code = fs.readFileSync('app/hooks/useMathRouter.ts', 'utf8');

const target = `const wantsStudyFunction = /(?:étudier?|etudie)\\s+(?:la\\s+)?(?:fonction\\s+)?(?:[fghk]|cette\\s+fonction)/i.test(inputLower)\r
            || /(?:étude\\s+(?:complète|de\\s+la\\s+fonction))/i.test(inputLower);`;

const replacement = `const wantsStudyFunction = /(?:étudier?|etudie)\\s+(?:la\\s+)?(?:fonction\\s+)?(?:[fghk]|cette\\s+fonction)/i.test(inputLower)\r
            || /(?:étude\\s+(?:complète|de\\s+la\\s+fonction))/i.test(inputLower)\r
            || (/(?:sign\\w*|étud\\w*|etud\\w*).+dérivée/i.test(inputLower) && /variation/i.test(inputLower));`;

let replacedCode = code.replace(target, replacement);

if (replacedCode === code) {
    // try fallback with unix line endings
    const target2 = `const wantsStudyFunction = /(?:étudier?|etudie)\\s+(?:la\\s+)?(?:fonction\\s+)?(?:[fghk]|cette\\s+fonction)/i.test(inputLower)\n            || /(?:étude\\s+(?:complète|de\\s+la\\s+fonction))/i.test(inputLower);`;
    const replacement2 = `const wantsStudyFunction = /(?:étudier?|etudie)\\s+(?:la\\s+)?(?:fonction\\s+)?(?:[fghk]|cette\\s+fonction)/i.test(inputLower)\n            || /(?:étude\\s+(?:complète|de\\s+la\\s+fonction))/i.test(inputLower)\n            || (/(?:sign\\w*|étud\\w*|etud\\w*).*dérivée/i.test(inputLower) && /variation/i.test(inputLower));`;
    replacedCode = code.replace(target2, replacement2);
}

fs.writeFileSync('app/hooks/useMathRouter.ts', replacedCode);
console.log('Hooks patched. Length changed:', replacedCode.length !== code.length);
