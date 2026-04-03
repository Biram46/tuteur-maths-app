const fs = require('fs');
let code = fs.readFileSync('app/hooks/useMathRouter.ts', 'utf8');

const targetStr = `v.replace(/-\\s*\\\\?inft?y?|-?\\s*infini?/gi, '-inf').replace(/\\+?\\s*\\\\?inft?y?|\\+?\\s*infini?/gi, '+inf').replace(/↗/g, 'nearrow').replace(/↘/g, 'searrow')`;

const replacementStr = `v.replace(/-\\s*\\\\?inft?y?|-?\\s*infini?/gi, '-inf')
                         .replace(/\\+?\\s*\\\\?inft?y?|\\+?\\s*infini?/gi, '+inf')
                         .replace(/↗|\\\\nearrow\\b|\\bcroissante?\\b|\\bmonte\\b/gi, 'nearrow')
                         .replace(/↘|\\\\searrow\\b|\\bd[eé]croissante?\\b|\\bdescend\\b/gi, 'searrow')`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('app/hooks/useMathRouter.ts', code);
    console.log("Patched successfully!");
} else {
    // try removing newlines / formatting
    console.log("Could not find the target string.");
}
