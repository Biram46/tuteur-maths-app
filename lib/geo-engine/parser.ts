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
    s = s.trim().replace(',', '.');
    // Supporte: -3, 1/2, √2, pi
    if (s.includes('/')) {
        const [n, d] = s.split('/').map(Number);
        return n / d;
    }
    if (s.includes('√') || s.includes('sqrt')) {
        const inner = s.replace(/√|sqrt\(|\)/g, '').trim();
        return Math.sqrt(Number(inner));
    }
    return Number(s);
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
        const parts = rest.split(',').map(s => s.trim());

        switch (cmd) {
            case 'geo': // ligne d'en-tête, skip
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
                // point: A, x, y [, label, color]
                if (parts.length < 1) break;
                const name = parts[0].toUpperCase().trim();
                const x = parts.length > 1 ? parseNumber(parts[1]) : 0;
                const y = parts.length > 2 ? parseNumber(parts[2]) : 0;
                const label = parts[3] || undefined;
                const color = parts[4] || undefined;
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
                // segment: AB [, color]  ou  segment: A, B [, color]
                let a: string, b: string, color: string | undefined;
                if (parts[0].length === 2 && /[A-Z]{2}/.test(parts[0])) {
                    a = parts[0][0]; b = parts[0][1]; color = parts[1];
                } else {
                    a = parts[0].toUpperCase(); b = (parts[1] || '').toUpperCase(); color = parts[2];
                }
                objects.push({ kind: 'segment', id: uid('seg'), from: a, to: b, color });
                break;
            }

            case 'vecteur':
            case 'vector':
            case 'vec': {
                // vecteur: AB [, label, color]  ou  vecteur: A, B [, label, color]
                let a: string, b: string, label: string | undefined, color: string | undefined;
                const namePart = parts[0].toUpperCase().trim();
                if (/^[A-Z]{2}$/.test(namePart)) {
                    a = namePart[0]; b = namePart[1];
                    label = parts[1] || undefined;
                    color = parts[2] || undefined;
                } else {
                    a = namePart; b = (parts[1] || '').toUpperCase().trim();
                    label = parts[2] || undefined;
                    color = parts[3] || undefined;
                }
                objects.push({
                    kind: 'vector', id: uid('vec'),
                    from: a, to: b,
                    label: label || `\\vec{${a}${b}}`,
                    color,
                });
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
            case 'right_angle':
            case 'perpendicular': {
                // right_angle: A, B, C → angle droit en B
                if (parts.length < 3) break;
                const [p1, vertex, p2] = parts.slice(0, 3).map(p => p.toUpperCase().trim());
                objects.push({ kind: 'angle', id: uid('ang'), vertex, from: p1, to: p2, label: '90°', value: 90, square: true, color: '#34d399' });
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

                // 1) Paire de lettres : "BC"
                if (/^[A-Z]{2}$/.test(refUpper)) {
                    const pA = pointMap.get(refUpper[0]);
                    const pB = pointMap.get(refUpper[1]);
                    if (pA && pB) {
                        dirX = pB.x - pA.x; dirY = pB.y - pA.y;
                        resolved = true;
                    }
                }

                // 2) Deux points séparés : "B, C" (uniquement si le 3e arg est un point, pas un label)
                if (!resolved && /^[A-Z]$/.test(refUpper) && parts[2] && /^[A-Z]$/i.test(parts[2].trim())) {
                    const pA = pointMap.get(refUpper);
                    const pB = pointMap.get(parts[2].toUpperCase().trim());
                    if (pA && pB) {
                        dirX = pB.x - pA.x; dirY = pB.y - pA.y;
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
                            resolved = true;
                        }
                    }
                }

                const pP = pointMap.get(throughPoint);
                if (resolved && pP && (dirX !== 0 || dirY !== 0)) {
                    // Perpendiculaire : rotation 90° → (-dy, dx)
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
