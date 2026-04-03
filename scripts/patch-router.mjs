// scripts/patch-router.mjs
// Patch ciblé pour useMathRouter.ts : fix vecteurs nommés + auto-génération points
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/hooks/useMathRouter.ts';
let content = readFileSync(filePath, 'utf8');

// ── PATCH STREAMING BLOCK : remplacer step 4 (synthèse) ──────────────────────
const OLD_STEP4_STREAM = `                                                // ── 4. Synthèse vecteurs manquants ──────────────────────────────\r
                                                 // Si l'IA a généré les points MAIS oublié les lignes vecteur:\r
                                                 // (cas fréquent quand les coordonnées sont explicites), on les ajoute.\r
                                                 if (!blockHasTriangle && !blockHasPolygon && vecNames.length > 0) {\r
                                                     const blockHasVecLines = /^\\s*(?:vecteur|vector|vec)\\s*:/im.test(block);\r
                                                     if (!blockHasVecLines) {\r
                                                         const toAdd = vecNames.filter(name => {\r
                                                             // Vérifier que les 2 points du vecteur sont déclarés dans le bloc\r
                                                             const hasA = new RegExp(\`^\\\\\\\\s*point\\\\\\\\s*:.*\\\\\\\\b\${name[0]}\\\\\\\\b\`, 'im').test(block);\r
                                                             const hasB = new RegExp(\`^\\\\\\\\s*point\\\\\\\\s*:.*\\\\\\\\b\${name[1]}\\\\\\\\b\`, 'im').test(block);\r
                                                             return hasA && hasB;\r
                                                         });\r
                                                         if (toAdd.length > 0) {\r
                                                             block += '\\n' + toAdd.map(n => \`vecteur: \${n}\`).join('\\n');\r
                                                             console.log('[Geo] Vecteurs synthétisés (IA les avait omis):', toAdd);\r
                                                         }\r
                                                     }\r
                                                 }\r
                                             }`;

const NEW_STEP4_STREAM = `                                                // ── 4. Synthèse vecteurs manquants + points auto ────────────────\r
                                                 // Si l'IA a généré les points MAIS oublié les lignes vecteur:,\r
                                                 // on les ajoute. Si un point est absent (ex: C), on l'auto-génère.\r
                                                 if (!blockHasTriangle && !blockHasPolygon && vecNames.length > 0) {\r
                                                     const blockHasVecLines = /^\\s*(?:vecteur|vector|vec)\\s*:/im.test(block);\r
                                                     if (!blockHasVecLines) {\r
                                                         const toAdd: string[] = [];\r
                                                         const autoOff = [[-1,2],[2,-1],[-2,-1],[1,3],[-3,1],[3,-2]];\r
                                                         vecNames.forEach((name, idx) => {\r
                                                             const hA = new RegExp(\`^\\\\\\\\s*point\\\\\\\\s*:.*\\\\\\\\b\${name[0]}\\\\\\\\b\`, 'im').test(block);\r
                                                             const hB = new RegExp(\`^\\\\\\\\s*point\\\\\\\\s*:.*\\\\\\\\b\${name[1]}\\\\\\\\b\`, 'im').test(block);\r
                                                             if (hA && hB) { toAdd.push(name); }\r
                                                             else if (hA && !hB) {\r
                                                                 const aM = block.match(new RegExp(\`^\\\\\\\\s*point\\\\\\\\s*:\\\\\\\\s*\${name[0]}\\\\\\\\s*,\\\\\\\\s*(-?[\\\\\\\\d.]+)\\\\\\\\s*,\\\\\\\\s*(-?[\\\\\\\\d.]+)\`, 'im'));\r
                                                                 const ax = aM ? parseFloat(aM[1]) : 0;\r
                                                                 const ay = aM ? parseFloat(aM[2]) : 0;\r
                                                                 const [ox, oy] = autoOff[idx % autoOff.length];\r
                                                                 block += \`\\npoint: \${name[1]}, \${ax + ox}, \${ay + oy}\`;\r
                                                                 toAdd.push(name);\r
                                                             }\r
                                                         });\r
                                                         if (toAdd.length > 0) {\r
                                                             block += '\\n' + toAdd.map(n => \`vecteur: \${n}\`).join('\\n');\r
                                                             console.log('[Geo] Vecteurs synthétisés:', toAdd);\r
                                                         }\r
                                                     }\r
                                                 }\r
                                                 // ── 5. Labels nommés (ex: "vecteur u de A vers B") ──────────────\r
                                                 const namedVecMap = new Map();\r
                                                 const nvP1 = [...inputText.matchAll(/\\bvecteurs?\\s+([a-z](?:')?)\\s+(?:de\\s+)?([A-Z])\\s*(?:vers|->)\\s*([A-Z])/gi)];\r
                                                 nvP1.forEach(m => namedVecMap.set(\`\${m[2].toUpperCase()}\${m[3].toUpperCase()}\`, m[1]));\r
                                                 const nvP2 = [...inputText.matchAll(/\\bvecteurs?\\s+([a-z](?:')?)[\\s=]+([A-Z]{2})\\b/gi)];\r
                                                 nvP2.forEach(m => namedVecMap.set(m[2].toUpperCase(), m[1]));\r
                                                 namedVecMap.forEach((lbl, pts) => {\r
                                                     block = block.replace(new RegExp(\`^([ \\\\t]*vecteur:\\\\s*\${pts})[ \\\\t]*$\`, 'gim'), \`$1, \${lbl}\`);\r
                                                 });\r
                                             }`;

if (content.includes(OLD_STEP4_STREAM)) {
    content = content.replace(OLD_STEP4_STREAM, NEW_STEP4_STREAM);
    console.log('✅ Streaming block step 4+5 patched');
} else {
    console.error('❌ Streaming block OLD not found - checking with LF...');
    // Try LF only
    const oldLF = OLD_STEP4_STREAM.replace(/\r\n/g, '\n');
    if (content.includes(oldLF)) {
        const newLF = NEW_STEP4_STREAM.replace(/\r\n/g, '\n');
        content = content.replace(oldLF, newLF);
        console.log('✅ Streaming block step 4+5 patched (LF)');
    } else {
        console.error('❌ Not found with LF either. Dumping first 200 chars around marker...');
        const idx = content.indexOf('Synthèse vecteurs manquants');
        if (idx >= 0) console.log('Marker found at', idx, ':', JSON.stringify(content.slice(idx, idx+100)));
        process.exit(1);
    }
}

writeFileSync(filePath, content, 'utf8');
console.log('✅ File written successfully');
