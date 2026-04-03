const fs = require('fs');
const file = 'app/hooks/useFigureRenderer.tsx';
let c = fs.readFileSync(file, 'utf8');

const newCode = `                        if (vecNamesFR.length > 0) {
                            // Vérifier quels vecteurs sont effectivement absents du bloc
                            const toAdd = vecNamesFR.filter(name => {
                                const alreadyPresent = new RegExp('^\\\\s*(?:vecteur|vector|vec)\\\\s*:\\\\s*.*\\\\b' + name + '\\\\b.*\\\\s*$', 'im').test(rawToParse);
                                if (alreadyPresent) return false;
                                const hasA = new RegExp('^\\\\s*point\\\\s*:.*\\\\b' + name[0] + '\\\\b', 'im').test(rawToParse);
                                const hasB = new RegExp('^\\\\s*point\\\\s*:.*\\\\b' + name[1] + '\\\\b', 'im').test(rawToParse);
                                return hasA && hasB;
                            });
                            if (toAdd.length > 0) {
                                rawToParse += '\\n' + toAdd.map(n => 'vecteur: ' + n).join('\\n');
                                console.log('[Geo] Vecteurs synthétisés (IA les avait omis):', toAdd);
                            }
                        } else {
                            // Si pas de noms contextuels, vérifier juste si aucun vecteur n'existe
                            const hasVecLines = /^\\s*(?:vecteur|vector|vec)\\s*:/im.test(rawToParse);
                            if (!hasVecLines) {
                                console.log('[Geo] Aucun vecteur détecté mais titleHasVectors est true - pas de synthèse possible sans noms de vecteurs');
                            }
                        }
                        
                        // ── 5. Labels nommés (vecteur u de A vers B) ────────────────────
                        if (contextLine) {
                            const namedVecMap = new Map();
                            const nvP1 = [...contextLine.matchAll(/\\bvecteurs?\\s+([a-z](?:')?)\\s+(?:de\\s+)?([A-Z])\\s*(?:vers|->)\\s*([A-Z])/gi)];
                            nvP1.forEach(m => namedVecMap.set(m[2].toUpperCase() + m[3].toUpperCase(), m[1]));
                            const nvP2 = [...contextLine.matchAll(/\\bvecteurs?\\s+([a-z](?:')?)[=\\s]+([A-Z]{2})\\b/gi)];
                            nvP2.forEach(m => namedVecMap.set(m[2].toUpperCase(), m[1]));
                            namedVecMap.forEach((lbl, pts) => {
                                const pattern = '\\\\[?\\\\s*' + pts[0] + '\\\\s*,?\\\\s*' + pts[1] + '\\\\s*\\\\]?';
                                rawToParse = rawToParse.replace(new RegExp('^([ \\\\t]*(?:vecteur|vector|vec)\\\\s*:\\\\s*' + pattern + ')\\\\s*$', 'gim'), '$1, ' + lbl);
                            });
                        }
                        console.log('[Geo] vecteur patch applied (context:', contextLine || titleLine, ')');`;

const startIdx = c.indexOf('                        if (vecNamesFR.length > 0) {');
const endIdx = c.indexOf(`                    }
                    const parsedScene = parseGeoScene(rawToParse);`);

if (startIdx !== -1 && endIdx !== -1) {
    c = c.substring(0, startIdx) + newCode + "\n" + c.substring(endIdx);
    fs.writeFileSync(file, c, 'utf8');
    console.log("Renderer patched");
} else {
    console.log("Could not find renderer patch location");
}
