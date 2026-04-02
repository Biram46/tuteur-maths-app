/**
 * ═══════════════════════════════════════════════════════════════════
 * PARSEUR DE COMMANDES AI — lib/geo-engine/parser.ts
 * Transforme le texte brut généré par mimimaths@ai en GeoScene
 * ═══════════════════════════════════════════════════════════════════
 */

import type { GeoScene, GeoObject, GeoPoint, GeoSegment, GeoLine, GeoCircle, GeoPolygon, GeoAngle, GeoVector, GeoLabel, ComputedResult, RepereType } from './types';
import {
    Frac, distanceExact, midpointExact, slopeExact,
    arePerpendicular, areParallel, exactToLatex, exactToFloat,
    triangleAreaExact, perimeterExact, dotProductExact,
    lineEquationExact, vectorNormExact,
} from './exact';
import type { ExactPoint } from './exact';

let _idCounter = 0;
const uid = (prefix: string) => `${prefix}_${++_idCounter}`;

function parseNumber(s: string): number {
    // Strip caractères parasites : parenthèses, crochets, espaces insécables
    s = s.trim().replace(/[()[\]]/g, '').replace(/\u00A0/g, ' ').trim();
    s = s.replace(',', '.');
    // Supporte: -3, 1/2, √2, pi
    if (s.includes('/')) {
        const [n, d] = s.split('/').map(Number);
        return n / d;
    }
    if (s.includes('√') || s.includes('sqrt')) {
        const inner = s.replace(/√|sqrt\(|\)/g, '').trim();
        return Math.sqrt(Number(inner));
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n; // Fallback 0 au lieu de NaN pour éviter les points invisibles
}

function parseFrac(s: string): Frac {
    s = s.trim().replace(',', '.');
    if (s.includes('/')) {
        const [n, d] = s.split('/');
        return Frac.of(parseInt(n), parseInt(d));
    }
    const f = parseFloat(s);
    // Convertir en fraction avec dénominateur max 1000
    for (let d = 1; d <= 100; d++) {
        const n = Math.round(f * d);
        if (Math.abs(n / d - f) < 1e-9) return Frac.of(n, d);
    }
    return Frac.of(Math.round(f));
}

/**
 * Parse le bloc brut (entre @@@...@@@) généré par l'IA.
 *
 * Format souple, plusieurs variantes acceptées :
 *   geo | title: Triangle | repère: orthonormal | point: A,0,0 | point: B,4,0 | ...
 *   geo\ntitle: ...\npoint: A,0,0\n...
 */
export function parseGeoScene(raw: string): GeoScene {
    // Normaliser les séparateurs
    const sections = raw
        .replace(/\|/g, '\n')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const objects: GeoObject[] = [];
    const pointMap = new Map<string, { x: number; y: number }>();
    let domain: { x: [number, number]; y: [number, number] } | undefined;
    let repere: RepereType = 'none';
    let title = '';
    let showGrid = false;
    let showSteps = false;
    const computed: ComputedResult[] = [];

    for (const section of sections) {
        const colonIdx = section.indexOf(':');
        if (colonIdx === -1) continue;
        const cmd = section.slice(0, colonIdx).trim().toLowerCase();
        const rest = section.slice(colonIdx + 1).trim();
        // Accepter ',' et ';' comme séparateurs (notation française A(4; 5))
        const parts = rest.split(/[,;]/).map(s => s.trim());


        switch (cmd) {
            case 'geo': // ligne d'en-tête, skip
                break;

            case 'context': // ligne de contexte injectée par useMathRouter, skip (pas d'objet à créer)
                break;

            case 'title':
                title = rest;
                break;

            case 'repere':
            case 'repère':
            case 'frame':
                if (rest.includes('none') || rest.includes('aucun')) repere = 'none';
                else if (rest.includes('ortho') && rest.includes('normal')) repere = 'orthonormal';
                else if (rest.includes('ortho')) repere = 'orthogonal';
                break;

            case 'grid':
                showGrid = rest !== 'false' && rest !== '0' && rest !== 'non';
                break;

            case 'steps':
                showSteps = rest === 'true' || rest === '1' || rest === 'oui';
                break;

            case 'domain':
            case 'domaine':
                if (parts.length >= 4) {
                    domain = {
                        x: [parseNumber(parts[0]), parseNumber(parts[1])],
                        y: [parseNumber(parts[2]), parseNumber(parts[3])],
                    };
                }
                break;

            case 'point': {
                // Formats acceptés :
                //   point: A, 1, 2        (standard)
                //   point: A(1, 2)        (IA utilise parfois les parenthèses)
                //   point: A(1; 2)        (notation française)
                if (parts.length < 1) break;

                // Détecter format compacte : "A(1.5" → extraire nom + coords
                const raw0 = parts[0];
                const compactMatch = raw0.match(/^([A-Z][A-Z0-9']?)\(\s*(-?[\d./]+)\s*$/i);
                let name: string, x: number, y: number, label: string | undefined, color: string | undefined;

                if (compactMatch && parts.length >= 2) {
                    // Format compact : "A(1" split avec "2)" dans parts[1]
                    name = compactMatch[1].toUpperCase();
                    x = parseNumber(compactMatch[2]);
                    y = parseNumber(parts[1]);
                    label = parts[2] || undefined;
                    color = parts[3] || undefined;
                } else {
                    // Format standard : "A", "1", "2"
                    name = raw0.replace(/\(.*/, '').toUpperCase().trim(); // strip toute parenthèse résiduelle
                    x = parts.length > 1 ? parseNumber(parts[1]) : 0;
                    y = parts.length > 2 ? parseNumber(parts[2]) : 0;
                    label = parts[3] || undefined;
                    color = parts[4] || undefined;
                }

                if (!name || name.length === 0) break; // ID invalide → ignorer
                pointMap.set(name, { x, y });
                objects.push({ kind: 'point', id: name, x, y, label, color, style: 'cross' });
                break;
            }

            case 'points': {
                // points: A(x,y), B(x,y), C(x,y) — format pluriel avec parenthèses
                const pointsStr = rest;
                const pointMatches = pointsStr.matchAll(/([A-Z][A-Z0-9']*)\s*\(\s*([^,)]+)\s*[,;]\s*([^)]+)\s*\)/gi);
                for (const m of pointMatches) {
                    const name = m[1].toUpperCase().trim();
                    const x = parseNumber(m[2]);
                    const y = parseNumber(m[3]);
                    if (!isNaN(x) && !isNaN(y)) {
                        pointMap.set(name, { x, y });
                        objects.push({ kind: 'point', id: name, x, y, style: 'cross' });
                    }
                }
                break;
            }

            case 'segments': {
                // segments: [AB], [BC], [CA] — format pluriel avec crochets
                const segMatches = rest.matchAll(/\[?\s*([A-Z])([A-Z])\s*\]?/g);
                for (const m of segMatches) {
                    objects.push({ kind: 'segment', id: uid('seg'), from: m[1], to: m[2] });
                }
                break;
            }

            case 'segment':
            case 'seg': {
                // Stratégie 1 : 2 lettres majuscules consécutives (cas le plus fiable)
                // Stratégie 2 : 2 lettres séparées par des espaces/virgules/parenthèses
                // Stratégie 3 : fallback — extraire les 2 premières lettres après nettoyage LaTeX
                const cleanRest = rest
                    .replace(/\$\$?/g, '')                          // supprimer $
                    .replace(/\\[a-zA-Z]+\s*\{?/g, ' ')            // supprimer \commande{
                    .replace(/[{}]/g, ' ')                          // supprimer accolades
                    .replace(/\[|\]/g, ' ')                         // supprimer crochets
                    .replace(/VEC|SEG|VECTOR|SEGMENT/gi, ' ');
                // Chercher d'abord 2 lettres MAJ consécutives (AB, BC...)
                const twoLettersMatch = cleanRest.match(/\b([A-Z])([A-Z])\b/);
                let a: string, b: string;
                if (twoLettersMatch) {
                    a = twoLettersMatch[1];
                    b = twoLettersMatch[2];
                } else {
                    // Fallback : extraire les 2 premières lettres MAJ isolées
                    const letters = (cleanRest.match(/[A-Z]/g) || []).slice(0, 2);
                    a = letters[0] || '';
                    b = letters[1] || '';
                }
                let color: string | undefined;
                if (parts.length > 1) {
                    const possibleColors = parts.filter(p => /^#/.test(p) || /^(rouge|bleu|vert|orange|violet|rose|noir|blanc|gris|jaune|cyan|magenta|red|blue|green|yellow|purple|pink|black|white|gray|grey)$/i.test(p));
                    if (possibleColors.length > 0) color = possibleColors[possibleColors.length - 1];
                }
                if (a && b) {
                    objects.push({ kind: 'segment', id: uid('seg'), from: a, to: b, color });
                }
                break;
            }

            case 'vecteur':
            case 'vector':
            case 'vec': {
                // 1. Chercher des coordonnées explicites, ex: vecteur: u(2,3) ou u=(2, 3)
                // On accepte les minuscules ou majuscules, ex: u(2,3), AB(2,3)
                const coordMatch = rest.match(/\b([a-zA-Z][a-zA-Z0-9_]*)\s*[\(=:]\s*\+?([+-]?[\d.]+)\s*[,;]\s*\+?([+-]?[\d.]+)/);
                if (coordMatch) {
                    const vName = coordMatch[1];
                    const vx = parseNumber(coordMatch[2]);
                    const vy = parseNumber(coordMatch[3]);
                    let color = parts.length > 1 ? parts[parts.length - 1] : undefined;
                    if (color && !/^#/.test(color) && !/^(rouge|bleu|vert|orange|violet|rose|noir|blanc|gris|jaune|cyan|magenta|red|blue|green|yellow|purple|pink|black|white|gray|grey)$/i.test(color)) {
                        color = undefined;
                    }
                    if (!isNaN(vx) && !isNaN(vy)) {
                        const ptOriginId = uid('O_v');
                        const ptDestId = uid('M_v');
                        pointMap.set(ptOriginId, { x: 0, y: 0 });
                        pointMap.set(ptDestId, { x: vx, y: vy });
                        objects.push({ kind: 'point', id: ptOriginId, x: 0, y: 0, style: 'none' });
                        objects.push({ kind: 'point', id: ptDestId, x: vx, y: vy, style: 'none' });
                        objects.push({
                            kind: 'vector', id: uid('vec'),
                            from: ptOriginId, to: ptDestId,
                            label: vName.length === 1 ? `\\vec{${vName}}` : `\\overrightarrow{${vName}}`,
                            color
                        });
                        break;
                    }
                }

                // 2. Nettoyage robuste du LaTeX généré par l'IA :
                // ex: "\vec{AB}", "$\overrightarrow{AB}$", "[AB]"
                const cleanVecRest = rest
                    .replace(/\$\$?/g, '')                              // $ et $$
                    .replace(/\\overrightarrow\s*\{([^}]*)\}/g, '$1')  // \overrightarrow{AB} → AB
                    .replace(/\\overrightarrow\s*/g, '')                // \overrightarrow seul
                    .replace(/\\vec\s*\{([^}]*)\}/g, '$1')             // \vec{AB} → AB
                    .replace(/\\vec\s*/g, '')                           // \vec seul
                    .replace(/\\[a-zA-Z]+\s*\{?/g, ' ')               // autres commandes LaTeX
                    .replace(/[{}]/g, ' ')                              // accolades
                    .replace(/\[|\]/g, ' ')                             // crochets
                    .replace(/\bVEC\b|\bSEG\b|\bVECTOR\b|\bSEGMENT\b|\bOVERRIGHTARROW\b/gi, ' ');
                // Chercher d'abord 2 lettres MAJ adjacentes (AB, BC...) — cas le plus fiable
                const twoLettersVecMatch = cleanVecRest.match(/\b([A-Z]{2})\b/);
                let a: string = "", b: string = "";
                if (twoLettersVecMatch) {
                    a = twoLettersVecMatch[1][0];
                    b = twoLettersVecMatch[1][1];
                } else {
                    // Deuxième essai : 2 lettres MAJ séparées par un espace ("A B")
                    const spacedMatch = cleanVecRest.match(/\b([A-Z])\b[\s,]+\b([A-Z])\b/);
                    if (spacedMatch) {
                        a = spacedMatch[1];
                        b = spacedMatch[2];
                    } else {
                        // Fallback : extraire les 2 premières lettres MAJ isolées
                        const letters = (cleanVecRest.toUpperCase().match(/[A-Z]/g) || []).slice(0, 2);
                        if (letters.length === 2) {
                             a = letters[0];
                             b = letters[1];
                        }
                    }
                }
                let label: string | undefined;
                let color: string | undefined;
                
                if (parts.length > 1) {
                    // Couleurs reconnues : hex (#...) ou noms CSS français/anglais courants
                    const COLOR_NAMES = /^(rouge|bleu|vert|orange|violet|rose|noir|blanc|gris|jaune|cyan|magenta|red|blue|green|yellow|purple|pink|black|white|gray|grey)$/i;
                    const possibleColors = parts.filter(p => /^#/.test(p) || COLOR_NAMES.test(p.trim()));
                    if (possibleColors.length > 0) color = possibleColors[possibleColors.length - 1];
                    // Label : nom du vecteur (ex: u, v, w) ou expression LaTeX
                    // ⚠️ On accepte les lettres minuscules (u, v, w) comme noms de vecteurs
                    // mais on rejette les majuscules isolées qui sont des identifiants de points (A, B, C...)
                    const possibleLabels = parts.slice(1).filter(p => {
                        const t = p.trim();
                        if (!t || COLOR_NAMES.test(t)) return false;
                        if (/^#/.test(t)) return false;
                        if (/^[A-Z]{1,2}$/.test(t)) return false; // identifiant de point MAJ seul → pas un label
                        // Lettre minuscule seule (u, v, w, i, j, k...) → nom de vecteur valide
                        return true;
                    });
                    if (possibleLabels.length > 0) label = possibleLabels[0];
                }
                
                if (a && b) {
                    objects.push({
                        kind: 'vector', id: uid('vec'),
                        from: a, to: b,
                        label: label || `\\vec{${a}${b}}`,
                        color,
                    });
                } else if (!a && !b) {
                    // 3. Fallback : Vecteur libre défini uniquement par une lettre (ex: "vecteur: u")
                    const singleLetterMatch = cleanVecRest.match(/\b([a-z])\b/);
                    if (singleLetterMatch) {
                        const vName = singleLetterMatch[1];
                        const ptOriginId = uid('O_vgen');
                        const ptDestId = uid('M_vgen');
                        pointMap.set(ptOriginId, { x: 0, y: 0 });
                        pointMap.set(ptDestId, { x: 3, y: 2 }); // Vecteur générique arbitraire (3, 2)
                        objects.push({ kind: 'point', id: ptOriginId, x: 0, y: 0, style: 'none' });
                        objects.push({ kind: 'point', id: ptDestId, x: 3, y: 2, style: 'none' });
                        objects.push({
                            kind: 'vector', id: uid('vec'),
                            from: ptOriginId, to: ptDestId,
                            label: `\\vec{${vName}}`,
                            color
                        });
                    }
                }
                break;
            }

            case 'droite':
            case 'line': {
                // line: AB [, label, color]  ou  line: A, B [, label, color]
                let a: string, b: string, color: string | undefined, label: string | undefined;
                const namePart = parts[0].toUpperCase().trim();
                if (/^[A-Z]{2}$/.test(namePart)) {
                    a = namePart[0]; b = namePart[1];
                    // parts[1] peut être un label comme (d), (delta), ou une couleur
                    if (parts[1] && /[()]/.test(parts[1])) {
                        label = parts[1].trim();
                        color = parts[2] || undefined;
                    } else {
                        label = `(${a}${b})`;
                        color = parts[1] || undefined;
                    }
                } else {
                    a = namePart; b = (parts[1] || '').toUpperCase().trim();
                    if (parts[2] && /[()]/.test(parts[2])) {
                        label = parts[2].trim();
                        color = parts[3] || undefined;
                    } else {
                        label = `(${a}${b})`;
                        color = parts[2] || undefined;
                    }
                }
                objects.push({ kind: 'line', id: uid('line'), type: 'line', through: [a, b], label, color });
                break;
            }

            case 'demi-droite':
            case 'ray': {
                let a: string, b: string;
                const namePart = parts[0].toUpperCase().trim();
                if (/^[A-Z]{2}$/.test(namePart)) { a = namePart[0]; b = namePart[1]; }
                else { a = namePart; b = (parts[1] || '').toUpperCase().trim(); }
                objects.push({ kind: 'line', id: uid('ray'), type: 'ray', through: [a, b], label: `[${a}${b})`, color: parts[2] });
                break;
            }

            case 'cercle':
            case 'circle': {
                // circle: O, r  ou  circle: O, A (passant par A)
                const center = parts[0].toUpperCase().trim();
                const second = (parts[1] || '').trim();
                const color = parts[2] || undefined;
                // Créer le point centre implicitement si absent (ex: "circle: O, 4" sans "point: O, 0, 0")
                if (!pointMap.has(center)) {
                    pointMap.set(center, { x: 0, y: 0 });
                    objects.push({ kind: 'point', id: center, x: 0, y: 0, style: 'cross' });
                }
                const radiusNum = parseNumber(second);
                if (isNaN(radiusNum) || /^[A-Z]$/.test(second)) {
                    // Point sur le cercle (rayon = distance centre→point)
                    objects.push({ kind: 'circle', id: uid('circ'), center, radiusPoint: second.toUpperCase(), color });
                } else {
                    objects.push({ kind: 'circle', id: uid('circ'), center, radiusValue: radiusNum, color });
                }
                break;
            }

            case 'triangle': {
                // triangle: A, B, C [, color]
                const verts = parts.slice(0, 3).map(p => p.toUpperCase().trim());
                const color = parts[3] || undefined;
                // Créer les 3 segments
                objects.push(
                    { kind: 'segment', id: uid('seg'), from: verts[0], to: verts[1], color },
                    { kind: 'segment', id: uid('seg'), from: verts[1], to: verts[2], color },
                    { kind: 'segment', id: uid('seg'), from: verts[2], to: verts[0], color },
                );
                break;
            }

            case 'rectangle':
            case 'square':
            case 'carré': {
                const verts = parts.slice(0, 4).map(p => p.toUpperCase().trim());
                const color = parts[4] || undefined;
                for (let i = 0; i < 4; i++) {
                    objects.push({ kind: 'segment', id: uid('seg'), from: verts[i], to: verts[(i + 1) % 4], color });
                }
                break;
            }

            // Note: case 'vecteur'/'vector'/'vec' traité plus haut (lignes ~165-187)

            case 'angle': {
                // angle: A, B, C [, label]  →  angle ABC de sommet B
                if (parts.length < 3) break;
                const [p1, vertex, p2] = parts.slice(0, 3).map(p => p.toUpperCase().trim());
                const label = parts[3] || `\\widehat{${p1}${vertex}${p2}}`;
                const color = parts[4] || '#fbbf24';
                objects.push({ kind: 'angle', id: uid('ang'), vertex, from: p1, to: p2, label, color });
                break;
            }

            case 'angle_droit':
            case 'right_angle': {
                // right_angle: A, B, C → angle droit en B
                if (parts.length < 3) break;
                const [p1, vertex, p2] = parts.slice(0, 3).map(p => p.toUpperCase().trim());
                objects.push({ kind: 'angle', id: uid('ang'), vertex, from: p1, to: p2, label: '90°', value: 90, square: true, color: '#34d399' });
                break;
            }

            case 'cercle_circonscrit':
            case 'circumscribed_circle':
            case 'circumcircle': {
                // cercle_circonscrit: A, B, C → calcule le circumcentre O et tracer le cercle circonscrit
                if (parts.length < 3) break;
                const [va, vb, vc] = parts.slice(0, 3).map(p => p.toUpperCase().trim());
                const pA = pointMap.get(va), pB = pointMap.get(vb), pC = pointMap.get(vc);
                if (!pA || !pB || !pC) { console.warn('[geo] cercle_circonscrit: points manquants', va, vb, vc); break; }
                // Formule du circumcentre par determinant
                const ax = pA.x, ay = pA.y;
                const bx = pB.x, by = pB.y;
                const cx = pC.x, cy = pC.y;
                const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
                if (Math.abs(D) < 1e-10) { console.warn('[geo] cercle_circonscrit: points collinéaires'); break; }
                const a2 = ax*ax + ay*ay, b2 = bx*bx + by*by, c2 = cx*cx + cy*cy;
                const Ox = (a2*(by-cy) + b2*(cy-ay) + c2*(ay-by)) / D;
                const Oy = (a2*(cx-bx) + b2*(ax-cx) + c2*(bx-ax)) / D;
                const R = Math.sqrt((Ox-ax)**2 + (Oy-ay)**2);
                // Ajouter le circumcentre O (point auxiliaire) + le cercle
                const circumId = '_O_circ';
                if (!pointMap.has(circumId)) {
                    pointMap.set(circumId, { x: Ox, y: Oy });
                    objects.push({ kind: 'point', id: circumId, x: Ox, y: Oy, label: 'O', style: 'cross', color: '#f59e0b' });
                }
                objects.push({ kind: 'circle', id: uid('circ'), center: circumId, radiusValue: R, color: '#f59e0b' });
                break;
            }

            case 'cercle_inscrit':
            case 'inscribed_circle':
            case 'incircle': {
                // cercle_inscrit: A, B, C → calcule l'incentre I et le rayon inscrit
                if (parts.length < 3) break;
                const [va2, vb2, vc2] = parts.slice(0, 3).map(p => p.toUpperCase().trim());
                const pA2 = pointMap.get(va2), pB2 = pointMap.get(vb2), pC2 = pointMap.get(vc2);
                if (!pA2 || !pB2 || !pC2) { console.warn('[geo] cercle_inscrit: points manquants'); break; }
                // Longueurs des côtés opposés à chaque sommet
                const a_side = Math.sqrt((pB2.x-pC2.x)**2 + (pB2.y-pC2.y)**2); // BC
                const b_side = Math.sqrt((pA2.x-pC2.x)**2 + (pA2.y-pC2.y)**2); // CA
                const c_side = Math.sqrt((pA2.x-pB2.x)**2 + (pA2.y-pB2.y)**2); // AB
                const perim = a_side + b_side + c_side;
                if (perim < 1e-10) break;
                // Incentre = barycentre pondéré par les longueurs opposées
                const Ix = (a_side*pA2.x + b_side*pB2.x + c_side*pC2.x) / perim;
                const Iy = (a_side*pA2.y + b_side*pB2.y + c_side*pC2.y) / perim;
                // Rayon = Aire / demi-périmètre
                const s = perim / 2;
                const area = Math.abs((pB2.x-pA2.x)*(pC2.y-pA2.y) - (pC2.x-pA2.x)*(pB2.y-pA2.y)) / 2;
                const r = area / s;
                const incircleId = '_I_insc';
                if (!pointMap.has(incircleId)) {
                    pointMap.set(incircleId, { x: Ix, y: Iy });
                    objects.push({ kind: 'point', id: incircleId, x: Ix, y: Iy, label: 'I', style: 'cross', color: '#34d399' });
                }
                objects.push({ kind: 'circle', id: uid('circ'), center: incircleId, radiusValue: r, color: '#34d399' });
                break;
            }



            case 'label':
            case 'text': {
                const text = parts[0] || '';
                const x = parts.length > 1 ? parseNumber(parts[1]) : 0;
                const y = parts.length > 2 ? parseNumber(parts[2]) : 0;
                objects.push({ kind: 'label', id: uid('lbl'), text, x, y });
                break;
            }

            case 'polygon':
            case 'polygone': {
                // polygon: A, B, C, D [, fillColor, strokeColor]
                // Crée un objet polygon + les segments visuels
                const verts = parts.filter(p => /^[A-Z]$/i.test(p.trim())).map(p => p.toUpperCase().trim());
                if (verts.length >= 3) {
                    const fillColor = parts.find(p => p.startsWith('#') || p.startsWith('rgba')) || undefined;
                    const strokeColor = parts.find((p, i) => i > 0 && (p.startsWith('#') || p.startsWith('rgba')) && p !== fillColor) || undefined;
                    objects.push({
                        kind: 'polygon', id: uid('poly'), vertices: verts,
                        fillColor, strokeColor,
                    });
                    // Segments automatiques pour le tracé
                    for (let i = 0; i < verts.length; i++) {
                        objects.push({
                            kind: 'segment', id: uid('seg'),
                            from: verts[i], to: verts[(i + 1) % verts.length],
                            color: strokeColor,
                        });
                    }
                }
                break;
            }

            case 'mediatrice':
            case 'médiatrice':
            case 'perpendicular_bisector': {
                // mediatrice: A, B [, label]
                // → calcule M = milieu(A,B), trace la droite perpendiculaire à (AB) par M
                if (parts.length < 2) break;
                const mA = parts[0].toUpperCase().trim();
                const mB = parts[1].toUpperCase().trim();
                const pA = pointMap.get(mA);
                const pB = pointMap.get(mB);
                if (!pA || !pB) { console.warn('[geo] mediatrice: points manquants', mA, mB); break; }
                // Milieu M
                const Mx = (pA.x + pB.x) / 2;
                const My = (pA.y + pB.y) / 2;
                const midId = `_M_${mA}${mB}`;
                if (!pointMap.has(midId)) {
                    pointMap.set(midId, { x: Mx, y: My });
                    objects.push({ kind: 'point', id: midId, x: Mx, y: My, label: 'M', style: 'cross', color: '#a78bfa' });
                }
                // Direction de AB → direction perpendiculaire = (-dy, dx)
                const dx = pB.x - pA.x, dy = pB.y - pA.y;
                const perpLen = Math.sqrt(dx*dx + dy*dy) || 1;
                // Second point de la médiatrice (dans la direction perpendiculaire)
                const med2Id = `_M2_${mA}${mB}`;
                const med2x = Mx + (-dy / perpLen);
                const med2y = My + (dx / perpLen);
                if (!pointMap.has(med2Id)) {
                    pointMap.set(med2Id, { x: med2x, y: med2y });
                    objects.push({ kind: 'point', id: med2Id, x: med2x, y: med2y, style: 'none' });
                }
                const lineLabel = parts[2] || undefined;
                objects.push({ kind: 'line', id: uid('line'), type: 'line', through: [midId, med2Id], label: lineLabel, color: '#a78bfa' });
                // ⊾ Angle droit automatique en M :
                // from=A (direction du segment), vertex=M, to=med2 (direction médiatrice)
                objects.push({ kind: 'angle', id: uid('ang'), vertex: midId, from: mA, to: med2Id, label: '90°', value: 90, square: true, color: '#34d399' });
                break;
            }


            case 'parallele':

            case 'parallèle':
            case 'parallel':
            case 'perpendiculaire':
            case 'perpendicular':
            case 'perp': {
                const isPerp = cmd.startsWith('perp');
                // Syntaxes : P, AB | P, A, B | P, d (nom de droite)
                const throughPoint = parts[0].toUpperCase().trim();
                const ref = parts[1]?.trim() || '';
                const refUpper = ref.toUpperCase();
                let label = parts[2] || undefined;
                let color = parts[3] || undefined;
                let dirX = 0, dirY = 0;
                let resolved = false;
                let refPt1: { x: number; y: number } | null = null; // un point connu sur la droite de référence

                // 1) Paire de lettres : "BC"
                if (/^[A-Z]{2}$/.test(refUpper)) {
                    const pA = pointMap.get(refUpper[0]);
                    const pB = pointMap.get(refUpper[1]);
                    if (pA && pB) {
                        dirX = pB.x - pA.x; dirY = pB.y - pA.y;
                        refPt1 = pA;
                        resolved = true;
                    }
                }

                // 2) Deux points séparés : "B, C" (uniquement si le 3e arg est un point, pas un label)
                if (!resolved && /^[A-Z]$/.test(refUpper) && parts[2] && /^[A-Z]$/i.test(parts[2].trim())) {
                    const pA = pointMap.get(refUpper);
                    const pB = pointMap.get(parts[2].toUpperCase().trim());
                    if (pA && pB) {
                        dirX = pB.x - pA.x; dirY = pB.y - pA.y;
                        refPt1 = pA;
                        resolved = true;
                        label = parts[3] || undefined;
                        color = parts[4] || undefined;
                    }
                }

                // 3) Nom de droite : "d", "delta", "Δ", "(d)" → chercher dans les objets existants
                if (!resolved) {
                    // Aliases courants pour les noms de droites en géométrie française
                    const GREEK_ALIASES: Record<string, string[]> = {
                        'd': ['d', 'delta', 'δ', 'Δ'],
                        'delta': ['d', 'delta', 'δ', 'Δ'],
                        'δ': ['d', 'delta', 'δ', 'Δ'],
                        'Δ': ['d', 'delta', 'δ', 'Δ'],
                        'g': ['g', 'gamma', 'γ', 'Γ'],
                        'gamma': ['g', 'gamma', 'γ', 'Γ'],
                        'γ': ['g', 'gamma', 'γ', 'Γ'],
                        'Γ': ['g', 'gamma', 'γ', 'Γ'],
                        't': ['t'],
                        'd1': ['d1'],
                        'd2': ['d2'],
                    };
                    const lineName = ref.replace(/[()]/g, '').trim();
                    const lineNameLower = lineName.toLowerCase();
                    const aliases = GREEK_ALIASES[lineNameLower] || [lineNameLower];

                    const foundLine = objects.find(o => {
                        if (o.kind !== 'line') return false;
                        const oLabel = (o.label || '').replace(/[()]/g, '').trim().toLowerCase();
                        // Match direct ou via alias
                        return aliases.includes(oLabel) || oLabel === lineNameLower;
                    }) as GeoLine | undefined;

                    if (foundLine) {
                        const pA = pointMap.get(foundLine.through[0]);
                        const pB = pointMap.get(foundLine.through[1]);
                        if (pA && pB) {
                            dirX = pB.x - pA.x; dirY = pB.y - pA.y;
                            refPt1 = pA;
                            resolved = true;
                        }
                    }
                }

                const pP = pointMap.get(throughPoint);
                if (resolved && pP && (dirX !== 0 || dirY !== 0)) {
                    // Direction effective (perpendiculaire ou parallèle)
                    const fx = isPerp ? -dirY : dirX;
                    const fy = isPerp ? dirX : dirY;
                    const q = { x: pP.x + fx, y: pP.y + fy };
                    const prefix = isPerp ? '_perp_' : '_par_';
                    const auxName = `${prefix}${throughPoint}`;
                    pointMap.set(auxName, q);
                    objects.push({
                        kind: 'line', id: uid('line'), type: 'line',
                        through: [throughPoint, auxName],
                        label: label || (isPerp ? `(Δ)` : `(d)`), color,
                    });
                    objects.push({ kind: 'point', id: auxName, x: q.x, y: q.y, style: 'none' as any });

                    // ⊾ Angle droit — uniquement pour perpendiculaire
                    // Mathématiquement : le carré est à l'intersection des deux droites,
                    // c'est-à-dire au pied H de la perpendiculaire sur la droite de référence.
                    if (isPerp && refPt1) {
                        // Calculer H = pied de la perpendiculaire de pP sur la droite de référence
                        // H = refPt1 + t*(dirX,dirY) avec t = ((pP - refPt1)·dir) / |dir|²
                        const d2 = dirX * dirX + dirY * dirY;
                        const t = ((pP.x - refPt1.x) * dirX + (pP.y - refPt1.y) * dirY) / d2;
                        const footX = refPt1.x + t * dirX;
                        const footY = refPt1.y + t * dirY;
                        const footId = `_foot_${throughPoint}`;

                        if (!pointMap.has(footId)) {
                            pointMap.set(footId, { x: footX, y: footY });
                            // Le pied H est affiché comme point (croix) sauf s'il coïncide avec throughPoint
                            const footCoincides = Math.abs(footX - pP.x) < 1e-9 && Math.abs(footY - pP.y) < 1e-9;
                            objects.push({
                                kind: 'point', id: footId, x: footX, y: footY,
                                style: footCoincides ? 'none' as any : 'cross',
                                label: footCoincides ? undefined : 'H',
                                color: '#34d399',
                            });
                        }

                        // Point auxiliaire dans la direction de AB depuis H (pour "from" de l'angle droit)
                        const refLen = Math.sqrt(d2) || 1;
                        const fromDirId = `_fromdir_${throughPoint}`;
                        const fromDirPt = { x: footX + dirX / refLen, y: footY + dirY / refLen };
                        if (!pointMap.has(fromDirId)) {
                            pointMap.set(fromDirId, fromDirPt);
                            objects.push({ kind: 'point', id: fromDirId, x: fromDirPt.x, y: fromDirPt.y, style: 'none' as any });
                        }

                        // Angle droit : vertex=H, from=direction AB, to=C (throughPoint)
                        objects.push({
                            kind: 'angle', id: uid('ang'),
                            vertex: footId,
                            from: fromDirId,
                            to: throughPoint,
                            label: '90°', value: 90, square: true, color: '#34d399',
                        });
                    }
                }
                break;
            }


            case 'compute':
            case 'calculer': {
                // compute: distance AB  |  compute: aire ABC
                const what = rest.toLowerCase();
                try {
                    const result = computeResult(what, pointMap);
                    if (result) computed.push(result);
                } catch { /* ignore */ }
                break;
            }
        }
    }

    // Calcul automatique du domaine si non fourni
    if (!domain && pointMap.size > 0) {
        const xs = Array.from(pointMap.values()).map(p => p.x);
        const ys = Array.from(pointMap.values()).map(p => p.y);

        // Étendre les bornes avec les cercles : centre ± rayon
        for (const obj of objects) {
            if (obj.kind === 'circle') {
                const circ = obj as import('./types').GeoCircle;
                const center = pointMap.get(circ.center);
                if (center) {
                    let r = 0;
                    if (circ.radiusValue !== undefined) {
                        r = circ.radiusValue;
                    } else if (circ.radiusPoint) {
                        const rpt = pointMap.get(circ.radiusPoint);
                        if (rpt) {
                            const dx = rpt.x - center.x;
                            const dy = rpt.y - center.y;
                            r = Math.sqrt(dx * dx + dy * dy);
                        }
                    }
                    if (r > 0) {
                        xs.push(center.x - r, center.x + r);
                        ys.push(center.y - r, center.y + r);
                    }
                }
            }
        }

        const xMin = Math.min(...xs, 0);
        const xMax = Math.max(...xs, 0);
        const yMin = Math.min(...ys, 0);
        const yMax = Math.max(...ys, 0);
        const pad = Math.max((xMax - xMin) * 0.25, 1.5);
        const padY = Math.max((yMax - yMin) * 0.25, 1.5);
        domain = {
            x: [Math.floor(xMin - pad), Math.ceil(xMax + pad)],
            y: [Math.floor(yMin - padY), Math.ceil(yMax + padY)],
        };
    }

    return { objects, domain, repere, title, showGrid, showSteps, computed };
}

function computeResult(
    expr: string,
    pointMap: Map<string, { x: number; y: number }>
): ComputedResult | null {
    const getP = (name: string): ExactPoint | null => {
        const p = pointMap.get(name.toUpperCase());
        if (!p) return null;
        return { name: name.toUpperCase(), x: parseFrac(p.x.toString()), y: parseFrac(p.y.toString()) };
    };

    // ── Distance AB ──────────────────────────────────────────────────────
    const distMatch = expr.match(/distance\s+([a-z])([a-z])/i);
    if (distMatch) {
        const A = getP(distMatch[1]);
        const B = getP(distMatch[2]);
        if (A && B) {
            const d = distanceExact(A, B);
            return {
                label: `${A.name}${B.name} =`,
                latex: exactToLatex(d),
                approx: exactToFloat(d).toFixed(3),
            };
        }
    }

    // ── Milieu AB ────────────────────────────────────────────────────────
    const midMatch = expr.match(/milieu\s+([a-z])([a-z])/i);
    if (midMatch) {
        const A = getP(midMatch[1]);
        const B = getP(midMatch[2]);
        if (A && B) {
            const M = midpointExact(A, B);
            return {
                label: `M_{${A.name}${B.name}} =`,
                latex: `\\left(${M.x.toLatex()} \\,;\\, ${M.y.toLatex()}\\right)`,
                approx: `(${M.x.toFloat().toFixed(2)} ; ${M.y.toFloat().toFixed(2)})`,
            };
        }
    }

    // ── Pente AB ─────────────────────────────────────────────────────────
    const slopeMatch = expr.match(/(?:pente|coefficient\s*directeur|slope)\s+([a-z])([a-z])/i);
    if (slopeMatch) {
        const A = getP(slopeMatch[1]);
        const B = getP(slopeMatch[2]);
        if (A && B) {
            const m = slopeExact(A, B);
            if (m === null) {
                return { label: `Pente (${A.name}${B.name}) :`, latex: '\\text{verticale (non définie)}' };
            }
            return {
                label: `m_{(${A.name}${B.name})} =`,
                latex: m.toLatex(),
                approx: m.toFloat().toFixed(3),
            };
        }
    }

    // ── Aire d'un triangle ABC ───────────────────────────────────────────
    const aireMatch = expr.match(/aire\s+([a-z])([a-z])([a-z])/i);
    if (aireMatch) {
        const A = getP(aireMatch[1]);
        const B = getP(aireMatch[2]);
        const C = getP(aireMatch[3]);
        if (A && B && C) {
            const area = triangleAreaExact(A, B, C);
            return {
                label: `\\mathcal{A}_{${A.name}${B.name}${C.name}} =`,
                latex: exactToLatex(area),
                approx: exactToFloat(area).toFixed(3),
            };
        }
    }

    // ── Périmètre (2-6 points) ───────────────────────────────────────────
    const perimMatch = expr.match(/p[eé]rim[eè]tre\s+([a-z]+)/i);
    if (perimMatch) {
        const names = perimMatch[1].split('');
        const pts = names.map(n => getP(n)).filter(Boolean) as ExactPoint[];
        if (pts.length >= 2) {
            const p = perimeterExact(pts);
            return {
                label: `\\mathcal{P}_{${names.map(n => n.toUpperCase()).join('')}} =`,
                latex: exactToLatex(p),
                approx: exactToFloat(p).toFixed(3),
            };
        }
    }

    // ── Perpendiculaire ? AB CD ──────────────────────────────────────────
    const perpMatch = expr.match(/perpendiculai?re\s+([a-z])([a-z])\s+([a-z])([a-z])/i);
    if (perpMatch) {
        const A = getP(perpMatch[1]), B = getP(perpMatch[2]);
        const C = getP(perpMatch[3]), D = getP(perpMatch[4]);
        if (A && B && C && D) {
            const result = arePerpendicular(A, B, C, D);
            return {
                label: `(${A.name}${B.name}) \\perp (${C.name}${D.name}) ?`,
                latex: result ? '\\text{Oui}' : '\\text{Non}',
            };
        }
    }

    // ── Parallèle ? AB CD ────────────────────────────────────────────────
    const paraMatch = expr.match(/parall[eè]le\s+([a-z])([a-z])\s+([a-z])([a-z])/i);
    if (paraMatch) {
        const A = getP(paraMatch[1]), B = getP(paraMatch[2]);
        const C = getP(paraMatch[3]), D = getP(paraMatch[4]);
        if (A && B && C && D) {
            const result = areParallel(A, B, C, D);
            return {
                label: `(${A.name}${B.name}) \\parallel (${C.name}${D.name}) ?`,
                latex: result ? '\\text{Oui}' : '\\text{Non}',
            };
        }
    }

    // ── Équation de droite AB ────────────────────────────────────────────
    const eqMatch = expr.match(/(?:[eé]quation|droite)\s+([a-z])([a-z])/i);
    if (eqMatch) {
        const A = getP(eqMatch[1]);
        const B = getP(eqMatch[2]);
        if (A && B) {
            const eq = lineEquationExact(A, B);
            if (eq) {
                return {
                    label: `(${A.name}${B.name}) :`,
                    latex: eq.latex,
                };
            }
        }
    }

    // ── Norme (vecteur) AB ───────────────────────────────────────────────
    const normMatch = expr.match(/(?:norme|norm)\s+([a-z])([a-z])/i);
    if (normMatch) {
        const A = getP(normMatch[1]);
        const B = getP(normMatch[2]);
        if (A && B) {
            const n = vectorNormExact(A, B);
            return {
                label: `\\|\\vec{${A.name}${B.name}}\\| =`,
                latex: exactToLatex(n),
                approx: exactToFloat(n).toFixed(3),
            };
        }
    }

    // ── Produit scalaire AB · CD ─────────────────────────────────────────
    const dotMatch = expr.match(/(?:produit\s*scalaire|dot|scalaire)\s+([a-z])([a-z])\s+([a-z])([a-z])/i);
    if (dotMatch) {
        const A = getP(dotMatch[1]), B = getP(dotMatch[2]);
        const C = getP(dotMatch[3]), D = getP(dotMatch[4]);
        if (A && B && C && D) {
            const d = dotProductExact(A, B, C, D);
            return {
                label: `\\vec{${A.name}${B.name}} \\cdot \\vec{${C.name}${D.name}} =`,
                latex: d.toLatex(),
                approx: d.toFloat().toFixed(3),
            };
        }
    }

    return null;
}
