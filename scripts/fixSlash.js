const fs = require('fs');
let c1 = fs.readFileSync('app/hooks/useFigureRenderer.tsx', 'utf8');
c1 = c1.replace(/\/\\\\bvecteurs\?\\\\s\+\(\[a-z\]\(\?\:'\)\?\)\\\\s\+\(\?\:de\\\\s\+\)\?\(\[A-Z\]\)\\\\s\*\(\?\:vers\|->\)\\\\s\*\(\[A-Z\]\)\/gi/g, "/\\bvecteurs?\\s+([a-z](?:')?)\\s+(?:de\\s+)?([A-Z])\\s*(?:vers|->)\\s*([A-Z])/gi");
c1 = c1.replace(/\/\\\\bvecteurs\?\\\\s\+\(\[a-z\]\(\?\:'\)\?\)\[=\\\\s\]\+\(\[A-Z\]\{2\}\)\\\\b\/gi/g, "/\\bvecteurs?\\s+([a-z](?:')?)[=\\s]+([A-Z]{2})\\b/gi");
fs.writeFileSync('app/hooks/useFigureRenderer.tsx', c1, 'utf8');

let c2 = fs.readFileSync('app/hooks/useMathRouter.ts', 'utf8');
c2 = c2.replace(/\/\\\\bvecteurs\?\\\\s\+\(\[a-z\]\(\?\:'\)\?\)\\\\s\+\(\?\:de\\\\s\+\)\?\(\[A-Z\]\)\\\\s\*\(\?\:vers\|->\)\\\\s\*\(\[A-Z\]\)\/gi/g, "/\\bvecteurs?\\s+([a-z](?:')?)\\s+(?:de\\s+)?([A-Z])\\s*(?:vers|->)\\s*([A-Z])/gi");
c2 = c2.replace(/\/\\\\bvecteurs\?\\\\s\+\(\[a-z\]\(\?\:'\)\?\)\[=\\\\s\]\+\(\[A-Z\]\{2\}\)\\\\b\/gi/g, "/\\bvecteurs?\\s+([a-z](?:')?)[=\\s]+([A-Z]{2})\\b/gi");
fs.writeFileSync('app/hooks/useMathRouter.ts', c2, 'utf8');
console.log('Fixed slashes');
