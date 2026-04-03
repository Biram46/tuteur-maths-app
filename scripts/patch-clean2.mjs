import { readFileSync, writeFileSync } from 'fs';

const p1 = 'app/hooks/useMathRouter.ts';
let c1 = readFileSync(p1, 'utf8');

// Fix 1: Add droite and demi-droite to segment replacement
c1 = c1.replace(
    /\/\(\?\:\^\|\\\\n\)\(\\\\s\*\)\(\?\:segment\|seg\)\\\\s\\\*\:\\\\s\\\*\(\[\^\\\\n\]\+\)\/gim/g,
    '/(?:^|\\\\n)(\\\\s*)(?:segment|seg|droite|demi[- ]?droite)\\\\s*:\\\\s*([^\\\\n]+)/gim'
);

// We need to replace ALL the broken 'Step 4 / 5' block
const step4start = c1.indexOf('// Step 4: Synthesis + auto-generate missing points');
const step5end = c1.indexOf('// Anti-hallucination angle_droit', step4start);

if (step4start >= 0 && step5end > step4start) {
    const brokenBlock = c1.substring(step4start, step5end);
    const newBlock = // ── 4. Synthèse vecteurs manquants + points auto ────────────────
                                                // Si l'IA a généré les points MAIS oublié les lignes vecteur:,
                                                // on les ajoute. Si un point est absent (ex: C), on l'auto-génère.
                                                if (!blockHasTriangle && !blockHasPolygon && vecNames.length > 0) {
                                                    const toAdd: string[] = [];
                                                    const autoOff = [[-1,2],[2,-1],[-2,-1],[1,3],[-3,1]];
                                                    vecNames.forEach((name, idx) => {
                                                        const alreadyPresent = new RegExp(\^\\\\s*(?:vecteur|vector|vec)\\\\s*:\\\\s*.*\\\\b\\\\\b.*\\\\s*\$\, 'im').test(block);
                                                        if (alreadyPresent) return; // SKIP if VECTOR line already exists for this name

                                                        const hA = new RegExp(\^\\\\s*point\\\\s*:.*\\\\b\\\\\b\, 'im').test(block);
                                                        const hB = new RegExp(\^\\\\s*point\\\\s*:.*\\\\b\\\\\b\, 'im').test(block);
                                                        
                                                        if (hA && hB) { toAdd.push(name); }
                                                        else if (hA && !hB) {
                                                            const aM = block.match(new RegExp(\^\\\\s*point\\\\s*:\\\\s*\\\\\s*,\\\\s*(-?[\\\\d.]+)\\\\s*,\\\\s*(-?[\\\\d.]+)\, 'im'));
                                                            const ax = aM ? parseFloat(aM[1]) : 0;
                                                            const ay = aM ? parseFloat(aM[2]) : 0;
                                                            const [ox,oy] = autoOff[idx % autoOff.length];
                                                            block += \\\npoint: \, \, \\;
                                                            toAdd.push(name);
                                                        }
                                                    });
                                                    if (toAdd.length > 0) {
                                                        block += '\\n' + toAdd.map(n => \ecteur: \\).join('\\n');
                                                        console.log('[Geo] Vecteurs synthétisés:', toAdd);
                                                    }
                                                }
                                                // ── 5. Labels nommés (vecteur u de A vers B) ────────────────────
                                                const namedVecMap = new Map<string, string>();
                                                const nvP1 = [...inputText.matchAll(/\\\\bvecteurs?\\\\s+([a-z](?:')?)\\\\s+(?:de\\\\s+)?([A-Z])\\\\s*(?:vers|->)\\\\s*([A-Z])/gi)];
                                                nvP1.forEach(m => namedVecMap.set(\\\\, m[1]));
                                                const nvP2 = [...inputText.matchAll(/\\\\bvecteurs?\\\\s+([a-z](?:')?)[=\\\\s]+([A-Z]{2})\\\\b/gi)];
                                                nvP2.forEach(m => namedVecMap.set(m[2].toUpperCase(), m[1]));
                                                namedVecMap.forEach((lbl, pts) => {
                                                    // FIX: \\\\s*\$ instead of [ \\\\t]*\$ allows matching \r and \n correctly without failing
                                                    block = block.replace(new RegExp(\^([ \\\\t]*(?:vecteur|vector|vec):\\\\s*\)\\\\s*\$\, 'gim'), \\, \\);
                                                });
                                            }

                                            ;
    const newContent = c1.substring(0, step4start) + newBlock + c1.substring(step5end);
    writeFileSync(p1, newContent, 'utf8');
    console.log('✅ useMathRouter.ts modified successfully!');
} else {
    console.log('❌ Could not find block boundaries in useMathRouter.ts');
}
