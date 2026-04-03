const fs = require('fs');
const file = 'app/hooks/useMathRouter.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /(?:\^|\\n)\(\\s\*\)\(\?\:segment\|seg\)\\s\*:\\s\*\(\[\^\\n\]\+\)/g,
    '(?:^|\\n)(\\s*)(?:segment|seg|droite|demi[- ]?droite)\\s*:\\s*([^\\n]+)'
);

const newBlock = `// ── 4. Synthèse vecteurs manquants + points auto ────────────────
                                                // Si l'IA a généré les points MAIS oublié les lignes vecteur:,
                                                // on les ajoute. Si un point est absent (ex: C), on l'auto-génère.
                                                if (!blockHasTriangle && !blockHasPolygon && vecNames.length > 0) {
                                                    const toAdd: string[] = [];
                                                    const autoOff = [[-1,2],[2,-1],[-2,-1],[1,3],[-3,1]];
                                                    vecNames.forEach((name, idx) => {
                                                        const alreadyPresent = new RegExp('^\\\\s*(?:vecteur|vector|vec)\\\\s*:\\\\s*.*\\\\b' + name + '\\\\b.*\\\\s*$', 'im').test(block);
                                                        if (alreadyPresent) return; // SKIP if VECTOR line already exists for this name

                                                        const hA = new RegExp('^\\\\s*point\\\\s*:.*\\\\b' + name[0] + '\\\\b', 'im').test(block);
                                                        const hB = new RegExp('^\\\\s*point\\\\s*:.*\\\\b' + name[1] + '\\\\b', 'im').test(block);
                                                        
                                                        if (hA && hB) { toAdd.push(name); }
                                                        else if (hA && !hB) {
                                                            const aM = block.match(new RegExp('^\\\\s*point\\\\s*:\\\\s*' + name[0] + '\\\\s*,\\\\s*(-?[\\\\d.]+)\\\\s*,\\\\s*(-?[\\\\d.]+)', 'im'));
                                                            const ax = aM ? parseFloat(aM[1]) : 0;
                                                            const ay = aM ? parseFloat(aM[2]) : 0;
                                                            const [ox,oy] = autoOff[idx % autoOff.length];
                                                            block += '\\npoint: ' + name[1] + ', ' + (ax+ox) + ', ' + (ay+oy);
                                                            toAdd.push(name);
                                                        }
                                                    });
                                                    if (toAdd.length > 0) {
                                                        block += '\\n' + toAdd.map(n => 'vecteur: ' + n).join('\\n');
                                                        console.log('[Geo] Vecteurs synthétisés:', toAdd);
                                                    }
                                                }
                                                // ── 5. Labels nommés (vecteur u de A vers B) ────────────────────
                                                const namedVecMap = new Map<string, string>();
                                                const nvP1 = [...inputText.matchAll(/\\\\bvecteurs?\\\\s+([a-z](?:')?)\\\\s+(?:de\\\\s+)?([A-Z])\\\\s*(?:vers|->)\\\\s*([A-Z])/gi)];
                                                nvP1.forEach(m => namedVecMap.set(m[2].toUpperCase() + m[3].toUpperCase(), m[1]));
                                                const nvP2 = [...inputText.matchAll(/\\\\bvecteurs?\\\\s+([a-z](?:')?)[=\\\\s]+([A-Z]{2})\\\\b/gi)];
                                                nvP2.forEach(m => namedVecMap.set(m[2].toUpperCase(), m[1]));
                                                namedVecMap.forEach((lbl, pts) => {
                                                    // FIX: \\\\s*$ instead of [ \\\\t]*$ allows matching \\\\r and \\\\n correctly without failing
                                                    block = block.replace(new RegExp('^([ \\\\t]*(?:vecteur|vector|vec):\\\\s*' + pts + ')\\\\s*$', 'gim'), '$1, ' + lbl);
                                                });
                                            }`;

c = c.slice(0, 163584) + newBlock + c.slice(167198);
fs.writeFileSync(file, c, 'utf8');
console.log('Patch success');
