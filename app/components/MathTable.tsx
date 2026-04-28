'use client';

import { useId } from 'react';
import katex from 'katex';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  MATHTABLE v4.0 — Tableau de signes / variations        ║
 * ║  Conforme programme Éducation Nationale France          ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * FORMAT ATTENDU (sign row, N x-values) :
 *   content = [s0, v1, s1, v2, s2, ..., s(N-2)]   → longueur 2N-3
 *   où :
 *     s_i = signe dans l'intervalle ouvert ('+' ou '-')
 *     v_j = valeur au point critique x[j] ('0', '||', '+', '-')
 *
 * FORMAT ATTENDU (variation row, N x-values) :
 *   content = [val0, arrow0, val1, arrow1, ..., val(N-1)]  → longueur 2N-1
 *   où :
 *     val_i = valeur (nombre ou borne) aux points x[i]
 *     arrow_i = 'nearrow' (↗) ou 'searrow' (↘) dans l'intervalle
 *
 * CONVENTION D'AFFICHAGE ÉD. NATIONALE :
 *   - La ligne x comporte N colonnes (les x-values) + (N-1) intervalles = 2N-1 demi-colonnes
 *   - Le signe/flèche d'intervalle s'affiche ENTRE deux colonnes x-value
 *   - '||' = double barre (valeur interdite)
 *   - '0' = zéro du facteur (affiché en gras)
 *   - Ligne f(x) est toujours la dernière ligne de signes
 */

export interface MathTableProps {
    data: {
        xValues: string[];
        rows: {
            label: string;
            type: 'sign' | 'variation';
            content: string[];
        }[];
    };
    title?: string;
}

// ─── Dimensions ────────────────────────────────────────────────
const LABEL_W = 130; // largeur colonne étiquette
const XCOL_W = 70;  // largeur colonne x-value (zéros, ||, valeurs critiques)
const ICOL_W = 70;  // largeur colonne intervalle (signes)
const ROW_H = 68;  // hauteur d'une ligne de données
const HEADER_H = 48;  // hauteur de la ligne d'en-tête (x)
const MARGIN = 40;  // espace pour la flèche à droite

// ─── Helpers ────────────────────────────────────────────────────

/** Nettoie les labels (LaTeX simplifié, infinis…) */
function clean(text: string): string {
    if (!text) return '';
    let t = text.replace(/\$/g, '').replace(/\\/g, '').trim();
    const low = t.toLowerCase();
    const map: Record<string, string> = {
        '-inf': '-∞', '+inf': '+∞', 'inf': '+∞',
        '-infty': '-∞', '+infty': '+∞', 'infty': '+∞',
    };
    if (map[low]) return map[low];
    if (low.includes('infty') || low.includes('inf')) {
        return t.replace(/[-+]?inf(ty)?/gi, (m) => m.startsWith('-') ? '-∞' : '+∞');
    }
    return t;
}

/**
 * Vrai si la valeur contient des notations LaTeX mathématiques
 * OU des constantes exactes générées par SymPy (e, π, fractions…)
 * Ces valeurs DOIVENT être rendues via KaTeX, pas via clean().
 */
function isLatexValue(val: string): boolean {
    if (!val) return false;
    const t = val.trim();
    return (
        // LaTeX brut (fractions, racines, exposants…)
        t.includes('\\frac') ||
        t.includes('\\dfrac') ||
        t.includes('\\sqrt') ||
        t.includes('\\pi') ||
        t.includes('\\infty') ||
        t.includes('\\cdot') ||
        t.includes('\\ln') ||
        t.includes('^{') ||
        // Constantes exactes SymPy texte
        /^-?\d*π(\/\d+)?$/.test(t) ||   // π, 2π, π/3, 3π/4…
        /^-?\d*e(²|³)?$/.test(t) ||      // e, 2e, -e, e², -e²
        /^-?(\d+\/)?e(²|³)?$/.test(t) ||  // 1/e, 1/e², -1/e, -1/e²
        // Fractions simples non-LaTeX (ex: "3/2") → aussi via KaTeX
        /^-?\d+\/\d+$/.test(t)
    );
}

/** Convertit une valeur en LaTeX pour l'affichage dans variation row */
function valToLatex(val: string): string {
    if (!val) return '';
    const t = val.trim();
    // Infinis
    if (t === '-inf' || t === '-infty') return '-\\infty';
    if (t === '+inf' || t === '+infty' || t === 'inf') return '+\\infty';
    // Fraction simple non-LaTeX : 3/2 → \dfrac{3}{2}
    const frac = t.match(/^(-?\d+)\/(\d+)$/);
    if (frac) return `\\dfrac{${frac[1]}}{${frac[2]}}`;
    // Constantes π texte → LaTeX  (π, 2π, -π, π/3, 2π/3…)
    const piMatch = t.match(/^(-?)(\d*)π(?:\/(\d+))?$/);
    if (piMatch) {
        const sign = piMatch[1];
        const coeff = piMatch[2];   // ex: "2" pour 2π, "" pour π
        const denom = piMatch[3];   // ex: "3" pour π/3, undefined sinon
        let num = (coeff ? coeff : '1') + '\\pi';
        if (sign === '-') num = '-' + num;
        return denom ? `\\dfrac{${num}}{${denom}}` : num;
    }
    // Constante e (nombre d'Euler) : e, 2e, -e, e/2, e², 1/e, 1/e²…
    const eMatch = t.match(/^(-?)(\d*)e([²³])?$/);
    if (eMatch) {
        const s = eMatch[1]; const c = eMatch[2]; const sup = eMatch[3];
        const supLatex = sup === '²' ? '^2' : sup === '³' ? '^3' : '';
        const base = `${c}e${supLatex}`;
        return s === '-' ? `-${base}` : base;
    }
    const eFracMatch = t.match(/^(-?)(\d*)\/(e)([²³]?)$/);
    if (eFracMatch) {
        const s = eFracMatch[1]; const n = eFracMatch[2] || '1';
        const sup = eFracMatch[4];
        const supLatex = sup === '²' ? '^2' : sup === '³' ? '^3' : '';
        return `${s}\\dfrac{${n}}{e${supLatex}}`;
    }
    const eFrac2Match = t.match(/^(-?)e([²³]?)\/?(\d+)?$/);
    if (eFrac2Match && eFrac2Match[3]) {
        // e/n ou e²/n
        const s = eFrac2Match[1]; const sup = eFrac2Match[2]; const d = eFrac2Match[3];
        const supLatex = sup === '²' ? '^2' : sup === '³' ? '^3' : '';
        return `${s}\\dfrac{e${supLatex}}{${d}}`;
    }
    // Déjà du LaTeX → retourner tel quel
    return t;
}

/** Vrai si la chaîne représente une valeur interdite (double barre) */
function isForbidden(v: string): boolean {
    if (!v) return false;
    const d = clean(v).toLowerCase().trim();
    return d === '||' || d === '|' || d === 'nd' || d === 'double' || d.includes('barre');
}

/** Vrai si la chaîne est un zéro (y compris 'D' = zéro du dénominateur) */
function isZero(v: string): boolean {
    const d = clean(v).toLowerCase().trim();
    return d === '0' || d === 'z' || d === 'zero' || d === 'd';
}

/** Vrai si c'est une flèche de variation */
function isArrow(v: string): boolean {
    return /nearrow|searrow/i.test(v);
}

// ─── Positions X ────────────────────────────────────────────────
/**
 * Retourne le centre X d'une demi-colonne.
 * halfIdx pair  → colonne x-value  i = halfIdx/2
 * halfIdx impair → colonne intervalle i = (halfIdx-1)/2
 */
function xCenter(halfIdx: number): number {
    if (halfIdx % 2 === 0) {
        const i = halfIdx / 2;
        return LABEL_W + i * (XCOL_W + ICOL_W) + XCOL_W / 2;
    } else {
        const i = (halfIdx - 1) / 2;
        return LABEL_W + (i + 1) * XCOL_W + i * ICOL_W + ICOL_W / 2;
    }
}

/** Bord gauche de la colonne x-value i */
function xLeft(i: number): number {
    return LABEL_W + i * (XCOL_W + ICOL_W);
}

/** Bord droit de la colonne x-value i */
function xRight(i: number): number {
    return LABEL_W + i * (XCOL_W + ICOL_W) + XCOL_W;
}

// \u2500\u2500 Rendu KaTeX dans SVG via foreignObject \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function MathSvgText({
    latex, x, y, fontSize = 14, color = '#1e293b',
}: {
    latex: string; x: number; y: number; fontSize?: number; color?: string;
}) {
    let html = '';
    const cleanLatex = latex.replace(/\$/g, '').trim();
    try { html = katex.renderToString(cleanLatex, { throwOnError: false, displayMode: false }); }
    catch { html = cleanLatex.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    // Sanitize color: only allow valid CSS color characters to prevent style injection
    const safeColor = /^[a-zA-Z0-9#(),.\s%+-]+$/.test(color) ? color : '#1e293b';
    const styledHtml = `<style>.katex,.katex *,.katex .mord,.katex .mbin,.katex .mrel,.katex .mopen,.katex .mclose,.katex .mpunct,.katex .minner{color:${safeColor}!important;}</style>${html}`;
    const W = 130; const H = fontSize * 4.5;
    return (
        <foreignObject x={x - W / 2} y={y - H / 2} width={W} height={H} style={{ overflow: 'visible' }}>
            <div
                // @ts-ignore
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                    fontSize: `${fontSize}px`, color,
                    textAlign: 'center', lineHeight: '1', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                }}
                dangerouslySetInnerHTML={{ __html: styledHtml }}
            />
        </foreignObject>
    );
}

function toLatex(s: string): string {
    if (!s) return '';
    let t = s.trim();
    if (t === '-inf' || t === '-infty') return '-\\infty';
    if (t === '+inf' || t === '+infty' || t === 'inf') return '+\\infty';
    const frac = t.match(/^(-?\d+)\/(\d+)$/);
    if (frac) return `\\dfrac{${frac[1]}}{${frac[2]}}`;
    // Exposants
    t = t.replace(/\^(\w+)/g, '^{$1}');
    t = t.replace(/\^\(([^)]+)\)/g, '^{$1}');
    // ln, sqrt, exp
    t = t.replace(/\bln\(/g, '\\ln(');
    t = t.replace(/\blog\(/g, '\\ln(');
    t = t.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    t = t.replace(/\bexp\(([^)]+)\)/g, 'e^{$1}');
    // Multiplication
    t = t.replace(/\*/g, '\\cdot ');
    // Notation décimale française : 3.14 → 3{,}14
    t = t.replace(/(\d)\.(\d)/g, '$1{,}$2');
    t = t.replace(/\$/g, '');
    return t;
}

/** Convertit un label en texte SVG lisible — sans KaTeX (stable dès le 1er rendu) */
function cleanLabel(s: string): string {
    if (!s) return '';
    let t = s.trim()
        .replace(/\$?-\\?infty\$?|-inf/g, '-∞')
        .replace(/\$?\+?\\?infty\$?|\+inf/g, '+∞')
        .replace(/\^{?2}?/g, '²')
        .replace(/\^{?3}?/g, '³')
        .replace(/\\cdot/g, '·')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
        .replace(/\$/g, '');
    return t;
}

// \u2500\u2500 Composant principal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export default function MathTable({ data, title }: MathTableProps) {
    const rawId = useId();
    const id = rawId.replace(/:/g, '');
    const { xValues, rows } = data;
    const N = xValues.length;



    // Largeur & hauteur totales
    const totalWidth = LABEL_W + N * XCOL_W + (N - 1) * ICOL_W + MARGIN;
    const totalHeight = HEADER_H + rows.length * ROW_H;

    // ═══════════════════════════════════════════════════════════════════
    // CONVENTION PROGRAMME ÉDUCATION NATIONALE FRANÇAISE
    // ═══════════════════════════════════════════════════════════════════
    // • 1 ligne PLEINE  : séparateur label | tableau
    // • Lignes POINTILLÉES aux valeurs critiques (k=1..N-2), pleine hauteur
    // • Dans les lignes de signe :
    //    - signe +/- SEULEMENT dans les intervalles (halfIdx impair)
    //    - 0 sur la ligne pointillée correspondante
    //    - || sur la dernière ligne (f(x)) aux valeurs interdites
    //    - RIEN d'autre sur les positions de valeurs critiques (halfIdx pair)
    // ═══════════════════════════════════════════════════════════════════

    const lastSignRowIdx = rows.reduce<number>((last, r, i) => r.type === 'sign' ? i : last, -1);
    const hasVariation = rows.some(r => r.type === 'variation');

    // Détection de la borne stricte du domaine :
    // Convention API : le premier xValue commence par ']' si la borne est exclue (ex: ]0 pour ln)
    // Sans ']' = borne incluse (ex: 0 pour sqrt) → pas de ||
    // IMPORTANT : ne pas muter xValues (prop) sinon React strict mode casse au 2ème rendu
    const firstXRaw = xValues[0] || '';
    const isDomainBounded = firstXRaw.startsWith(']');
    const displayXValues = isDomainBounded
        ? [firstXRaw.substring(1), ...xValues.slice(1)]
        : xValues;

    // halfIdx pairs des valeurs critiques intérieures : 2k pour k=1..N-2
    // Ces positions reçoivent une ligne pointillée
    const criticalHalfIdxs: number[] = [];
    for (let k = 1; k <= N - 2; k++) criticalHalfIdxs.push(2 * k);

    // Index de la première ligne de variation (si présente)
    const firstVariationRowIdx = rows.findIndex(r => r.type === 'variation');

    // ── Rendu d'une ligne SIGN ──────────────────────────────────
    function renderSignRow(row: { label: string; content: string[] }, rowIdx: number, yTop: number) {
        const yMid = yTop + ROW_H / 2;
        const content = row.content;
        const isFxRow = rowIdx === lastSignRowIdx;
        const cells: React.JSX.Element[] = [];

        /**
         * Format 2N-3 : content[idx] → halfIdx = idx + 1
         *   halfIdx impair = intervalle → afficher +/-
         *   halfIdx pair   = valeur critique → afficher 0 (si zéro) ou || sur f(x) (si interdit)
         *                    RIEN sinon (pas de + ou - sur la ligne pointillée)
         */
        content.forEach((val, idx) => {
            const halfIdx = idx + 1;
            const isXValueCol = halfIdx % 2 === 0;
            const xPos = xCenter(halfIdx);

            if (isXValueCol) {
                // Position valeur critique : 0 ou || seulement
                if (isZero(val)) {
                    cells.push(
                        <text key={`z-${idx}`} x={xPos} y={yMid} dy="0.35em"
                            textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">0</text>
                    );
                } else if (isForbidden(val) && isFxRow) {
                    // || UNIQUEMENT sur la ligne f(x) — Convention Éducation Nationale
                    cells.push(
                        <g key={`fb-${idx}`}>
                            <rect x={xPos - 12} y={yTop + 4} width={24} height={ROW_H - 8} fill="white" />
                            <line x1={xPos - 5} y1={yTop + 4} x2={xPos - 5} y2={yTop + ROW_H - 4}
                                stroke="#1e293b" strokeWidth="1.5" />
                            <line x1={xPos + 5} y1={yTop + 4} x2={xPos + 5} y2={yTop + ROW_H - 4}
                                stroke="#1e293b" strokeWidth="1.5" />
                        </g>
                    );
                } else if (val.trim() === 'D') {
                    // 'D' = marqueur JS pour "zéro du dénominateur" → le facteur s'annule ici → afficher "0"
                    // (convention moteur JS sign-table-engine)
                    cells.push(
                        <text key={`z-${idx}`} x={xPos} y={yMid} dy="0.35em"
                            textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">0</text>
                    );
                } else if (isForbidden(val) && !isFxRow) {
                    // '||' sur une ligne facteur non-f(x) (venant de SymPy) :
                    // Ce facteur ne s'annule pas forcément à ce point (ex: x+2 en x=3 vaut 5).
                    // On n'affiche RIEN ici — la valeur interdite est déjà indiquée par la ligne f(x).
                    // Exception : si le facteur est du type dénominateur et son propre zéro coïncide avec ce point,
                    // cela est géré par isZero(val) → '0' plus haut, pas par ce cas.
                }
                // Sinon : RIEN (pas de + ou - sur la ligne pointillée)
            } else {
                // Position intervalle : afficher + ou -
                const isPlus = val.trim() === '+';
                const isMinus = val.trim() === '-';
                if (isPlus || isMinus) {
                    cells.push(
                        <text key={`s-${idx}`} x={xPos} y={yMid} dy="0.35em"
                            textAnchor="middle" fontSize="22" fontWeight="bold"
                            fill={isPlus ? '#16a34a' : '#dc2626'}>
                            {val.trim()}
                        </text>
                    );
                }
            }
        });

        // Si la borne du domaine est finie, dessiner || sur la première colonne (halfIdx=0)
        if (isDomainBounded && isFxRow) {
            const xPos = xCenter(0);
            cells.push(
                <g key="domain-boundary">
                    <rect x={xPos - 12} y={yTop + 4} width={24} height={ROW_H - 8} fill="white" />
                    <line x1={xPos - 5} y1={yTop + 4} x2={xPos - 5} y2={yTop + ROW_H - 4}
                        stroke="#1e293b" strokeWidth="1.5" />
                    <line x1={xPos + 5} y1={yTop + 4} x2={xPos + 5} y2={yTop + ROW_H - 4}
                        stroke="#1e293b" strokeWidth="1.5" />
                </g>
            );
        }

        return (
            <g key={`row-${rowIdx}`}>
                <text x={LABEL_W / 2} y={yMid} dy="0.35em"
                    textAnchor="middle" fontSize="13" fontStyle="italic"
                    fontFamily="Georgia, 'Times New Roman', serif" fill="#1e293b">
                    {cleanLabel(row.label)}
                </text>
                {cells}
            </g>
        );
    }

    // ── Rendu d'une ligne VARIATION ──────────────────────────────
    function renderVariationRow(row: { label: string; content: string[] }, rowIdx: number, yTop: number) {
        const yMid = yTop + ROW_H / 2;
        const margin = 16;
        const elements: React.JSX.Element[] = [];

        const content = row.content;

        /**
         * Le variation engine produit une liste de tokens alternant :
         *   [val0], arrow0, [val1 | limitLeft '||' limitRight], arrow1, ...
         * 
         * On reconstruit pour chaque x-value k (0..N-1) :
         *   - valAtXk[k] = valeur à afficher, ou null
         *   - forbiddenAt[k] = true si c'est une valeur interdite (||)
         *   - leftLimitAt[k] = limite à gauche (si forbidden && Terminale)
         *   - rightLimitAt[k] = limite à droite (si forbidden && Terminale)
         * Et pour chaque intervalle k (0..N-2) :
         *   - arrowAtInterval[k] = 'nearrow' | 'searrow' | null
         * 
         * Parsing séquentiel :
         *   On attend en alternance : une position x-value (colonne paire) puis un intervalle (flèche).
         *   À chaque position x-value, si le token est '||', c'est une discontinuité.
         *   Si c'est "nearrow"/"searrow", c'est une flèche (= pas en format complet, format B).
         */

        const valAtXk: (string | null)[] = new Array(N).fill(null);
        const arrowAtInterval: (string | null)[] = new Array(N - 1).fill(null);
        const forbiddenAt: boolean[] = new Array(N).fill(false);
        const leftLimitAt: (string | null)[] = new Array(N).fill(null);
        const rightLimitAt: (string | null)[] = new Array(N).fill(null);

        // Scanning séquentiel token par token
        let tokenIdx = 0;
        let xIdx = 0;      // quel x-value on traite (0..N-1)

        // Détecter si c'est le format "complet" (commence par une valeur/||, pas une flèche)
        // Format A : val, arrow, val, arrow, ..., val
        // Format B : arrow, val, arrow, val, ..., arrow (sans valeurs aux bornes)
        const firstIsArrow = content.length > 0 && isArrow(content[0]);
        const isFormatB = firstIsArrow;

        if (isFormatB) {
            // Format B : pas de valeurs aux bornes -∞ et +∞
            // Structure : [arrow0, val1, arrow1, val2, ..., arrow(N-2)]
            for (let k = 0; k < N - 1 && tokenIdx < content.length; k++) {
                // Flèche k
                arrowAtInterval[k] = content[tokenIdx] ?? null;
                tokenIdx++;
                // Valeur au point x[k+1] (sauf dernier)
                if (k < N - 2 && tokenIdx < content.length) {
                    const tok = content[tokenIdx];
                    if (isForbidden(tok)) {
                        forbiddenAt[k + 1] = true;
                        tokenIdx++;
                    } else if (isArrow(tok)) {
                        // Pas de valeur ici, la prochaine est déjà une flèche
                    } else {
                        valAtXk[k + 1] = tok;
                        tokenIdx++;
                    }
                }
            }
        } else {
            // Format A (complet) : val0, arrow0, val1|..., arrow1, ...
            // Mais les discontinuités insèrent [limitLeft, ||, limitRight] au lieu d'une valeur
            for (xIdx = 0; xIdx < N && tokenIdx < content.length; xIdx++) {
                // Lire la valeur/discontinuité à x[xIdx]
                const tok = content[tokenIdx];
                if (isForbidden(tok)) {
                    // Simple || (format 1ère Spé)
                    forbiddenAt[xIdx] = true;
                    tokenIdx++;
                } else if (isArrow(tok)) {
                    // On est tombé sur une flèche alors qu'on attendait une valeur
                    // → c'est qu'il n'y a pas de valeur ici (format mixte)
                    // Ne pas avancer tokenIdx, on va le traiter comme flèche
                } else {
                    // Regarder si le token SUIVANT est || (= c'est une limite latérale gauche)
                    if (tokenIdx + 1 < content.length && isForbidden(content[tokenIdx + 1])) {
                        // Format Terminale : limitLeft, ||, limitRight
                        leftLimitAt[xIdx] = tok; 
                        forbiddenAt[xIdx] = true; 
                        tokenIdx++; // skip limitLeft
                        tokenIdx++; // skip ||
                        // limitRight : on le stocke aussi
                        if (tokenIdx < content.length && !isArrow(content[tokenIdx])) {
                            rightLimitAt[xIdx] = content[tokenIdx];
                            tokenIdx++; // skip limitRight
                        }
                    } else {
                        // Valeur normale (extremum ou limite à l'infini)
                        valAtXk[xIdx] = tok;
                        tokenIdx++;
                    }
                }

                // Lire la flèche de l'intervalle (x[xIdx], x[xIdx+1]) si on n'est pas au dernier x
                if (xIdx < N - 1 && tokenIdx < content.length) {
                    if (isArrow(content[tokenIdx])) {
                        arrowAtInterval[xIdx] = content[tokenIdx];
                        tokenIdx++;
                    }
                }
            }
        }

        // ── Calculer la position Y de chaque colonne x-value ──
        const yAtX: number[] = new Array(N).fill(yMid);

        for (let k = 0; k < N; k++) {
            const leftArrow = k > 0 ? arrowAtInterval[k - 1] : null;
            const rightArrow = k < N - 1 ? arrowAtInterval[k] : null;

            if (forbiddenAt[k]) {
                yAtX[k] = yMid;
            } else if (leftArrow && rightArrow && leftArrow === rightArrow) {
                // Point d'inflexion / palier (dérivée nulle sans changement de signe)
                // Ex: x^3 en 0. On positionne la valeur au milieu pour que les flèches l'encadrent bien.
                yAtX[k] = yMid;
            } else if (leftArrow && /nearrow/i.test(leftArrow)) {
                yAtX[k] = yTop + margin;             // arrivée ↗ → haut
            } else if (leftArrow && /searrow/i.test(leftArrow)) {
                yAtX[k] = yTop + ROW_H - margin;    // arrivée ↘ → bas
            } else if (rightArrow && /nearrow/i.test(rightArrow)) {
                yAtX[k] = yTop + ROW_H - margin;    // départ ↗ → bas
            } else if (rightArrow && /searrow/i.test(rightArrow)) {
                yAtX[k] = yTop + margin;             // départ ↘ → haut
            }
        }

        // ── Dessiner les valeurs ──
        for (let k = 0; k < N; k++) {
            const val = valAtXk[k];
            const xPos = xCenter(2 * k);

            if (forbiddenAt[k]) {
                // Double barre verticale pour valeur interdite dans le tableau de variations
                elements.push(
                    <g key={`vfb-${k}`}>
                        <rect x={xPos - 12} y={yTop + 4} width={24} height={ROW_H - 8} fill="white" />
                        <line x1={xPos - 5} y1={yTop + 4} x2={xPos - 5} y2={yTop + ROW_H - 4}
                            stroke="#1e293b" strokeWidth="1.5" />
                        <line x1={xPos + 5} y1={yTop + 4} x2={xPos + 5} y2={yTop + ROW_H - 4}
                            stroke="#1e293b" strokeWidth="1.5" />
                    </g>
                );
                
                // Dessiner limite gauche
                const leftLim = leftLimitAt[k];
                if (leftLim) {
                    const prevArrow = k > 0 ? arrowAtInterval[k - 1] : null;
                    const yLeft = prevArrow 
                        ? (/nearrow/i.test(prevArrow) ? (yTop + margin) : (yTop + ROW_H - margin))
                        : (yTop + ROW_H / 2);
                    
                    if (isLatexValue(leftLim)) {
                        elements.push(<MathSvgText key={`ll-${k}`} latex={valToLatex(leftLim)} x={xPos - 24} y={yLeft} fontSize={12} />);
                    } else {
                        elements.push(<text key={`ll-${k}`} x={xPos - 24} y={yLeft} dy="0.35em" textAnchor="middle" fontSize={13} fill="#1e293b">{clean(leftLim)}</text>);
                    }
                }
                
                // Dessiner limite droite
                const rightLim = rightLimitAt[k];
                if (rightLim) {
                    const nextArrow = k < N - 1 ? arrowAtInterval[k] : null;
                    const yRight = nextArrow
                        ? (/nearrow/i.test(nextArrow) ? (yTop + ROW_H - margin) : (yTop + margin))
                        : (yTop + ROW_H / 2);
                        
                    if (isLatexValue(rightLim)) {
                        elements.push(<MathSvgText key={`rl-${k}`} latex={valToLatex(rightLim)} x={xPos + 24} y={yRight} fontSize={12} />);
                    } else {
                        elements.push(<text key={`rl-${k}`} x={xPos + 24} y={yRight} dy="0.35em" textAnchor="middle" fontSize={13} fill="#1e293b">{clean(rightLim)}</text>);
                    }
                }
                
            } else if (val) {
                // ── Valeurs exactes SymPy (fractions, racines…) → KaTeX ──
                // ── Valeurs simples (entiers, ±∞) → texte SVG natif ──
                if (isLatexValue(val)) {
                    elements.push(
                        <MathSvgText
                            key={`v-${k}`}
                            latex={valToLatex(val)}
                            x={xPos}
                            y={yAtX[k]}
                            fontSize={12}
                        />
                    );
                } else {
                    elements.push(
                        <text key={`v-${k}`} x={xPos} y={yAtX[k]} dy="0.35em"
                            textAnchor="middle" fontSize="13" fill="#1e293b">
                            {clean(val)}
                        </text>
                    );
                }
            }
        }


        // ── Dessiner les flèches ──
        for (let k = 0; k < N - 1; k++) {
            const arrow = arrowAtInterval[k];
            if (!arrow || !isArrow(arrow)) continue;

            const xStart = xCenter(2 * k);
            const xEnd = xCenter(2 * (k + 1));

            const leftForbidden = forbiddenAt[k];
            const rightForbidden = forbiddenAt[k + 1];
            const hasLeftVal = valAtXk[k] !== null && !leftForbidden;
            const hasRightVal = valAtXk[k + 1] !== null && !rightForbidden;

            const valOffset = 22;
            const forbidOffset = 10;
            const noValOffset = 5;

            const xA = leftForbidden ? xStart + forbidOffset
                : hasLeftVal ? xStart + valOffset
                    : xStart + noValOffset;
            const xB = rightForbidden ? xEnd - forbidOffset
                : hasRightVal ? xEnd - valOffset
                    : xEnd - noValOffset;

            // ── Y positions: handle discontinuities ──
            const isNear = /nearrow/i.test(arrow);
            let yA = yAtX[k];
            let yB = yAtX[k + 1];

            if (leftForbidden) {
                yA = isNear ? (yTop + ROW_H - margin) : (yTop + margin);
            }
            if (rightForbidden) {
                yB = isNear ? (yTop + margin) : (yTop + ROW_H - margin);
            }

            elements.push(
                <line key={`arr-${k}`}
                    x1={xA} y1={yA} x2={xB} y2={yB}
                    stroke="#1e293b" strokeWidth="1.5"
                    markerEnd={isNear ? `url(#nearrow-${id})` : `url(#searrow-${id})`} />
            );
        }

        return (
            <g key={`vrow-${rowIdx}`}>
                <text x={LABEL_W / 2} y={yMid} dy="0.35em"
                    textAnchor="middle" fontSize="13" fontStyle="italic"
                    fontFamily="Georgia, 'Times New Roman', serif" fill="#1e293b">
                    {cleanLabel(row.label)}
                </text>
                {elements}
            </g>
        );
    }

    // ── SVG principal ────────────────────────────────────────────
    return (
        <div className="w-full overflow-x-auto my-6 custom-scrollbar-horizontal" style={{ WebkitOverflowScrolling: 'touch' }}>
            <svg
                width={totalWidth}
                height={totalHeight}
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                style={{ display: 'block', fontFamily: 'serif', minWidth: `${totalWidth}px` }}
            >
                    {/* ── Marqueurs flèches ── */}
                    <defs>
                        {/* Flèche axe X */}
                        <marker id={`axarrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#1e293b" />
                        </marker>
                        {/* nearrow ↗ */}
                        <marker id={`nearrow-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                            <path d="M0,10 L10,5 L0,0" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        </marker>
                        {/* searrow ↘ */}
                        <marker id={`searrow-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        </marker>
                    </defs>

                    {/* ── Fond ── */}
                    <rect x="0" y="0" width={totalWidth} height={totalHeight}
                        fill="white" stroke="#1e293b" strokeWidth="1.5" />

                    {/* ── Séparateur label | tableau ── */}
                    <line x1={LABEL_W} y1="0" x2={LABEL_W} y2={totalHeight}
                        stroke="#1e293b" strokeWidth="1.5" />

                    {/* ── Séparateur en-tête | données ── */}
                    <line x1="0" y1={HEADER_H} x2={totalWidth} y2={HEADER_H}
                        stroke="#1e293b" strokeWidth="1.5" />

                    {/* ── Label « x » dans la colonne étiquette ── */}
                    <text x={LABEL_W / 2} y={HEADER_H / 2} dy="0.35em"
                        textAnchor="middle" fontSize="16" fontStyle="italic" fontWeight="bold" fill="#1e293b">
                        x
                    </text>

                    {/* ── Valeurs x dans l'en-tête ── */}
                    {displayXValues.map((xVal, i) => {
                        const cx = xCenter(i * 2);
                        // Valeurs exactes SymPy (fractions, π, e…) → KaTeX
                        if (isLatexValue(xVal)) {
                            return (
                                <MathSvgText key={`xc-${i}`}
                                    latex={valToLatex(xVal)}
                                    x={cx} y={HEADER_H / 2}
                                    fontSize={13}
                                />
                            );
                        }
                        const cleaned = clean(xVal);
                        // Fraction simple (après stripping backslash) → KaTeX
                        const fracMatch = cleaned.match(/^(-?\d+)\/(\d+)$/);
                        if (fracMatch) {
                            return (
                                <MathSvgText key={`xc-${i}`}
                                    latex={`\\dfrac{${fracMatch[1]}}{${fracMatch[2]}}`}
                                    x={cx} y={HEADER_H / 2}
                                    fontSize={13}
                                />
                            );
                        }
                        // Valeur simple (entier, ±∞) → texte SVG natif
                        return (
                            <text key={`xc-${i}`} x={cx} y={HEADER_H / 2} dy="0.35em"
                                textAnchor="middle" fontSize="14" fill="#1e293b">
                                {cleanLabel(xVal)}
                            </text>
                        );
                    })}

                    {/* PAS de flèche x→ : non attendue dans le format Éd. Nationale */}

                    {/* ── Lignes horizontales entre lignes de données ── */}
                    {rows.map((_, rowIdx) => {
                        if (rowIdx === 0) return null;
                        const y = HEADER_H + rowIdx * ROW_H;
                        return <line key={`hsep-${rowIdx}`} x1="0" y1={y} x2={totalWidth} y2={y}
                            stroke="#1e293b" strokeWidth="1" />;
                    })}

                    {/* ── Lignes POINTILLÉES aux valeurs critiques ──
                         - Traversent TOUTES les lignes de signe (les || ont fond blanc et masquent la ligne)
                         - S'arrêtent avant les lignes de variation (celles-ci gèrent leurs propres séparateurs)
                         - Conforme programme Éducation Nationale */}
                    {criticalHalfIdxs.map(halfIdx => {
                        const yStart = HEADER_H;
                        // La ligne pointillée s'arrête :
                        // - avant la 1ère ligne de variation (si présente)
                        // - sinon jusqu'en bas du tableau
                        const yEnd = firstVariationRowIdx >= 0
                            ? HEADER_H + firstVariationRowIdx * ROW_H
                            : totalHeight;
                        return (
                            <line key={`crit-${halfIdx}`}
                                x1={xCenter(halfIdx)} y1={yStart}
                                x2={xCenter(halfIdx)} y2={yEnd}
                                stroke="#374151" strokeWidth="1" strokeDasharray="5,4" />
                        );
                    })}

                    {/* ── Ligne pointillée pour la borne du domaine (si existante) ── */}
                    {isDomainBounded && (
                        <line key="domain-crit"
                            x1={xCenter(0)} y1={HEADER_H}
                            x2={xCenter(0)} y2={firstVariationRowIdx >= 0 ? HEADER_H + firstVariationRowIdx * ROW_H : totalHeight}
                            stroke="#374151" strokeWidth="1" strokeDasharray="5,4" />
                    )}
                    {/* ── Lignes de données ── */}
                    {rows.map((row, rowIdx) => {
                        const yTop = HEADER_H + rowIdx * ROW_H;
                        if (row.type === 'variation') {
                            return renderVariationRow(row, rowIdx, yTop);
                        } else {
                            return renderSignRow(row as any, rowIdx, yTop);
                        }
                    })}

                    {/* ── Titre (sous le tableau) ── */}
                    {title && (
                        <text x={totalWidth / 2} y={totalHeight + 20} dy="0.35em"
                            textAnchor="middle" fontSize="12" fill="#64748b" fontStyle="italic">
                            {title}
                        </text>
                    )}
                </svg>
            </div>
    );
}
