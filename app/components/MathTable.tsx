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
    try { html = katex.renderToString(latex, { throwOnError: false, displayMode: false }); }
    catch { html = latex.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    // Wrap KaTeX HTML with a style override to force dark text color
    // This prevents the parent's text-slate-100 (light) from bleeding through
    const styledHtml = `<style>.katex,.katex *,.katex .mord,.katex .mbin,.katex .mrel,.katex .mopen,.katex .mclose,.katex .mpunct,.katex .minner{color:${color}!important;}</style>${html}`;
    const W = 130; const H = fontSize * 2.2;
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

    // ── DEBUG TRACE (à retirer après debug) ──
    console.log('[MATHTABLE] xValues:', xValues, 'N:', N);
    for (const row of rows) {
        console.log(`[MATHTABLE] Row "${row.label}" [${row.type}] (${row.content.length}):`, row.content);
    }


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
                } else if (isForbidden(val) && !isFxRow) {
                    // Sur une ligne facteur : si || → le facteur S'ANNULE à ce point
                    // (c'est ce zéro qui rend f(x) interdite) → afficher "0"
                    cells.push(
                        <text key={`z-${idx}`} x={xPos} y={yMid} dy="0.35em"
                            textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">0</text>
                    );
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
        const len = content.length;

        /**
         * Deux formats possibles :
         *
         * FORMAT A — 2N-1 éléments (Terminale, avec valeurs aux bornes) :
         *   content[2k]   = valeur en x[k]     (k = 0..N-1)
         *   content[2k+1] = flèche intervalle k (k = 0..N-2)
         *
         * FORMAT B — 2N-3 éléments (1ère/Seconde, SANS valeurs aux bornes) :
         *   content[0]      = flèche intervalle 0
         *   content[2k-1]   = valeur en x[k]       (k = 1..N-2)
         *   content[2k]     = flèche intervalle k   (k = 1..N-2)
         *   content[2N-4]   = flèche intervalle N-2
         *   (x[0] et x[N-1] n'ont pas de valeur)
         *
         * Détection : FORMAT A si len === 2N-1, FORMAT B sinon.
         */
        const isFullFormat = len === 2 * N - 1;

        // ── Construire les tableaux de valeurs et de flèches indexés par k ──
        // valAtXk[k] = valeur à afficher en x[k], ou null si pas de valeur
        // arrowAtInterval[k] = flèche dans l'intervalle (x[k], x[k+1])
        const valAtXk: (string | null)[] = new Array(N).fill(null);
        const arrowAtInterval: (string | null)[] = new Array(N - 1).fill(null);

        if (isFullFormat) {
            // FORMAT A : content[2k] = val, content[2k+1] = flèche
            for (let k = 0; k < N; k++) {
                valAtXk[k] = content[2 * k] ?? null;
            }
            for (let k = 0; k < N - 1; k++) {
                arrowAtInterval[k] = content[2 * k + 1] ?? null;
            }
        } else {
            // FORMAT B : content[0] = flèche0, content[1] = val_x1, content[2] = flèche1, ...
            // Longueur attendue 2N-3 → N-2 valeurs (aux x[1]..x[N-2]) et N-1 flèches
            // Structure : [flèche0, val1, flèche1, val2, flèche2, ..., val(N-2), flèche(N-2)]
            // content[0]      → flèche 0
            // content[2k-1]   → val en x[k]   pour k=1..N-2
            // content[2k]     → flèche k       pour k=1..N-2
            for (let k = 0; k < N - 1; k++) {
                arrowAtInterval[k] = content[2 * k] ?? null; // flèche k
                if (k >= 1 && k <= N - 2) {
                    valAtXk[k] = content[2 * k - 1] ?? null; // val en x[k]
                }
            }
            // valAtXk[0] et valAtXk[N-1] = null (pas de valeur aux bornes)
        }

        // ── Calculer la position Y de chaque colonne x-value ──
        const yAtX: number[] = new Array(N).fill(yMid);

        for (let k = 0; k < N; k++) {
            const leftArrow = k > 0 ? arrowAtInterval[k - 1] : null;
            const rightArrow = k < N - 1 ? arrowAtInterval[k] : null;

            if (leftArrow && /nearrow/i.test(leftArrow)) {
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
            if (!val) continue;
            const xPos = xCenter(2 * k);

            if (isForbidden(val)) {
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
            } else {
                elements.push(
                    <text key={`v-${k}`} x={xPos} y={yAtX[k]} dy="0.35em"
                        textAnchor="middle" fontSize="13" fill="#1e293b">
                        {clean(val)}
                    </text>
                );
            }
        }


        // ── Dessiner les flèches ──
        for (let k = 0; k < N - 1; k++) {
            const arrow = arrowAtInterval[k];
            if (!arrow || !isArrow(arrow)) continue;

            const xStart = xCenter(2 * k);
            const xEnd = xCenter(2 * (k + 1));

            const leftForbidden = isForbidden(valAtXk[k] ?? '');
            const rightForbidden = isForbidden(valAtXk[k + 1] ?? '');
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

            const yA = yAtX[k];
            const yB = yAtX[k + 1];

            const isNear = /nearrow/i.test(arrow);
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
        <div className="w-full overflow-x-auto my-6 custom-scrollbar-horizontal">
            <div style={{ minWidth: `${totalWidth}px` }}>
                <svg
                    width="100%"
                    height={totalHeight}
                    viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                    preserveAspectRatio="xMinYMid meet"
                    style={{ display: 'block', fontFamily: 'serif' }}
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
                    {xValues.map((xVal, i) => {
                        const cx = xCenter(i * 2);
                        const cleaned = clean(xVal);
                        // Détecter les fractions pour les rendre en notation mathématique
                        const fracMatch = cleaned.match(/^(-?\d+)\/(\d+)$/);
                        if (fracMatch) {
                            // Fraction → rendu KaTeX avec barre horizontale
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
        </div>
    );
}
