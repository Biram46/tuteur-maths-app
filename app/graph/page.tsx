'use client';
/**
 * PAGE GRAPHIQUE — Fenêtre séparée pour le tracé de courbes
 * =========================================================
 * Communique avec MathAssistant via BroadcastChannel + localStorage.
 * Rendu Canvas haute performance avec thème sombre premium.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { compile } from 'mathjs';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface CurveData {
    id: string;
    expression: string;
    name: string;
    color: string;
    interval: [number, number];
}

interface IntersectionPoint {
    x: number;
    y: number;
    label: string;
}

interface PositionRelative {
    interval: [number, number];
    fAbove: boolean; // true = 1ère courbe au-dessus
}

interface TangentData {
    x0: number;
    y0: number;
    slope: number;
    equation: string;
    interval: [number, number];
}

export interface GraphState {
    curves: CurveData[];
    intersections: IntersectionPoint[];
    positionsRelatives: PositionRelative[];
    tangent: TangentData | null;
    title: string;
}

// ─────────────────────────────────────────────────────────────
// COULEURS & CONSTANTES
// ─────────────────────────────────────────────────────────────

const COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
const BG_COLOR = '#0f172a';
const GRID_COLOR = 'rgba(255,255,255,0.07)';
const AXIS_COLOR = 'rgba(255,255,255,0.35)';
const TEXT_COLOR = '#e2e8f0';
const GOLD = '#fbbf24';
const GREEN_ZONE = 'rgba(74,222,128,0.15)';
const PINK_ZONE = 'rgba(244,114,182,0.15)';
const GREEN_LINE = '#4ade80';
const PINK_LINE = '#f472b6';

const MARGIN = { top: 50, right: 40, bottom: 60, left: 70 };
const CHANNEL_NAME = 'mimimaths-graph';

// ─────────────────────────────────────────────────────────────
// ÉVALUATION SÉCURISÉE
// ─────────────────────────────────────────────────────────────

function sanitizeExpr(expr: string): string {
    return expr
        // LaTeX
        .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
        .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
        .replace(/\\sqrt\s+(\w+)/g, 'sqrt($1)')
        .replace(/\\left\s*[([]/g, '(').replace(/\\right\s*[)\]]/g, ')')
        .replace(/\\cdot/g, '*').replace(/\\times/g, '*')
        .replace(/\\text\s*\{([^}]*)\}/g, '$1')
        // JS / Unicode
        .replace(/\*\*/g, '^')
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/⁴/g, '^4')
        .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
        .replace(/√(\w+)/g, 'sqrt($1)')
        .replace(/π/g, 'pi')
        .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
        // Implicit multiplication (2x -> 2*x, x e^x -> x*e^x, 2 sin -> 2*sin)
        .replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2')
        .replace(/([xX])\s*([a-zA-Z(])/g, '$1*$2')
        .replace(/\)\s*([a-zA-Z(])/g, ')*$1')
        // Français
        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?\(([^)]+)\)/gi, 'sqrt($1)')
        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)')
        .replace(/\bln\b/g, 'log');
}

function createEvaluator(expression: string): ((xVal: number) => number | null) | null {
    try {
        const sanitized = sanitizeExpr(expression);
        const compiled = compile(sanitized);
        return (xVal: number): number | null => {
            try {
                const result = compiled.evaluate({ x: xVal });
                if (typeof result === 'number' && isFinite(result) && Math.abs(result) < 1e8) {
                    return result;
                }
                return null;
            } catch {
                return null;
            }
        };
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// DÉTECTION DES VALEURS INTERDITES (asymptotes verticales)
// ─────────────────────────────────────────────────────────────

/**
 * Détecte les valeurs interdites d'une expression (dénominateur = 0).
 * Retourne les x où l'expression a une asymptote verticale.
 */
function findVerticalAsymptotes(
    evaluator: (x: number) => number | null,
    xMin: number, xMax: number, N: number = 2000
): number[] {
    const asymptotes: number[] = [];
    const step = (xMax - xMin) / N;
    let prevY: number | null = null;
    let prevX: number = xMin;

    for (let i = 0; i <= N; i++) {
        const xv = xMin + i * step;
        const yv = evaluator(xv);

        if (i > 0) {
            // Transition défini ↔ non-défini
            if ((prevY !== null && yv === null) || (prevY === null && yv !== null)) {
                // Bisection pour trouver le x exact
                let lo = prevX, hi = xv;
                for (let j = 0; j < 50; j++) {
                    const mid = (lo + hi) / 2;
                    const mVal = evaluator(mid);
                    if ((prevY !== null && mVal !== null)) lo = mid;
                    else hi = mid;
                }
                const disc = Math.round(((lo + hi) / 2) * 10000) / 10000;
                if (!asymptotes.some(a => Math.abs(a - disc) < 0.01)) {
                    asymptotes.push(disc);
                }
            }
            // Saut énorme entre deux valeurs définies (signe opposé, ratio immense)
            else if (prevY !== null && yv !== null && Math.sign(prevY) !== Math.sign(yv)) {
                const ratio = Math.abs(prevY - yv) / step;
                if (ratio > 100) {
                    const disc = Math.round(((prevX + xv) / 2) * 10000) / 10000;
                    if (!asymptotes.some(a => Math.abs(a - disc) < 0.01)) {
                        asymptotes.push(disc);
                    }
                }
            }
        }

        prevX = xv;
        prevY = yv;
    }

    return asymptotes;
}

/**
 * Calcul intelligent du domaine Y en utilisant l'IQR (Interquartile Range)
 * pour exclure les outliers proches des asymptotes.
 * Produit un domaine pédagogiquement lisible (ex: [-8, 8] pour (x-3)/(x+2)).
 */
function computeSmartYDomain(
    evaluators: ((x: number) => number | null)[],
    xMin: number, xMax: number,
    asymptotes: number[]
): [number, number] {
    const allValues: number[] = [];
    const N = 800;
    const step = (xMax - xMin) / N;

    for (const evaluator of evaluators) {
        for (let i = 0; i <= N; i++) {
            const xv = xMin + i * step;
            // Exclure les points trop proches d'une asymptote
            if (asymptotes.some(a => Math.abs(xv - a) < 0.15)) continue;
            const yv = evaluator(xv);
            if (yv !== null) allValues.push(yv);
        }
    }

    if (allValues.length === 0) return [-10, 10];

    // Trier pour exclure les outliers (percentiles 2% et 98%)
    allValues.sort((a, b) => a - b);
    const q2Idx = Math.floor(allValues.length * 0.02);
    const q98Idx = Math.floor(allValues.length * 0.98);
    const robustMin = allValues[q2Idx];
    const robustMax = allValues[q98Idx];

    // Marge pédagogique : 25% du range, minimum 0.5
    const range = robustMax - robustMin;
    const margin = Math.max(range * 0.25, 0.5);

    let yMin = robustMin - margin;
    let yMax = robustMax + margin;

    // Arrondir à des ENTIERS pour des graduations propres
    yMin = Math.floor(yMin);
    yMax = Math.ceil(yMax);

    // S'assurer que 0 est TOUJOURS visible (pédagogique)
    if (yMin > 0) yMin = 0;
    if (yMax < 0) yMax = 0;

    // Garantir un intervalle minimum de 2
    if (yMax - yMin < 2) {
        yMin = Math.floor((yMin + yMax) / 2) - 1;
        yMax = yMin + 2;
    }

    return [yMin, yMax];
}

// ─────────────────────────────────────────────────────────────
// TROUVER LES INTERSECTIONS (numérique)
// ─────────────────────────────────────────────────────────────

function findIntersections(
    evalF: (x: number) => number | null,
    evalG: (x: number) => number | null,
    interval: [number, number],
    N = 5000
): IntersectionPoint[] {
    const [a, b] = interval;
    const step = (b - a) / N;
    const points: IntersectionPoint[] = [];

    for (let i = 0; i < N; i++) {
        const x1 = a + i * step;
        const x2 = a + (i + 1) * step;
        const f1 = evalF(x1), f2 = evalF(x2);
        const g1 = evalG(x1), g2 = evalG(x2);
        if (f1 === null || f2 === null || g1 === null || g2 === null) continue;

        const d1 = f1 - g1;
        const d2 = f2 - g2;

        if (d1 * d2 < 0) {
            // Changement de signe → bisection
            let lo = x1, hi = x2;
            for (let j = 0; j < 50; j++) {
                const mid = (lo + hi) / 2;
                const fm = evalF(mid), gm = evalG(mid);
                if (fm === null || gm === null) break;
                const dm = fm - gm;
                if (Math.abs(dm) < 1e-12) break;
                if (dm * d1 < 0) hi = mid; else lo = mid;
            }
            const xSol = (lo + hi) / 2;
            const ySol = evalF(xSol);
            if (ySol !== null) {
                // Éviter les doublons
                if (!points.some(p => Math.abs(p.x - xSol) < 1e-6)) {
                    points.push({
                        x: Math.round(xSol * 10000) / 10000,
                        y: Math.round(ySol * 10000) / 10000,
                        label: `(${formatNum(xSol)}, ${formatNum(ySol)})`
                    });
                }
            }
        } else if (Math.abs(d1) < 1e-10) {
            const ySol = f1;
            if (!points.some(p => Math.abs(p.x - x1) < 1e-6)) {
                points.push({
                    x: Math.round(x1 * 10000) / 10000,
                    y: Math.round(ySol * 10000) / 10000,
                    label: `(${formatNum(x1)}, ${formatNum(ySol)})`
                });
            }
        }
    }

    return points;
}

function formatNum(n: number): string {
    if (Math.abs(n - Math.round(n)) < 1e-8) return String(Math.round(n));
    return n.toFixed(2);
}

/**
 * Formate un nombre en notation π.
 * Ex: 0.5 → "π/2", -1 → "−π", 2 → "2π", 0 → "0"
 */
function formatPiLabel(piMultiplier: number): string {
    if (Math.abs(piMultiplier) < 1e-10) return '0';

    // Convertir en fraction
    const sign = piMultiplier < 0 ? -1 : 1;
    const abs = Math.abs(piMultiplier);
    const denominators = [1, 2, 3, 4, 6, 8, 12];
    let bestNum = Math.round(abs);
    let bestDen = 1;

    for (const d of denominators) {
        const n = Math.round(abs * d);
        if (Math.abs(abs - n / d) < 1e-6) {
            const g = gcd(n, d);
            bestNum = n / g;
            bestDen = d / g;
            break;
        }
    }

    const prefix = sign < 0 ? '−' : '';

    if (bestDen === 1) {
        if (bestNum === 1) return `${prefix}π`;
        return `${prefix}${bestNum}π`;
    }

    if (bestNum === 1) return `${prefix}π/${bestDen}`;
    return `${prefix}${bestNum}π/${bestDen}`;
}

function gcd(a: number, b: number): number {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

// ─────────────────────────────────────────────────────────────
// POSITIONS RELATIVES
// ─────────────────────────────────────────────────────────────

function computePositionsRelatives(
    evalF: (x: number) => number | null,
    evalG: (x: number) => number | null,
    intersections: IntersectionPoint[],
    interval: [number, number]
): PositionRelative[] {
    const [a, b] = interval;
    const sorted = [...intersections].sort((a, b) => a.x - b.x);
    const bornes = [a, ...sorted.map(p => p.x), b];
    const result: PositionRelative[] = [];

    for (let i = 0; i < bornes.length - 1; i++) {
        const left = bornes[i], right = bornes[i + 1];
        const mid = (left + right) / 2;
        const fMid = evalF(mid), gMid = evalG(mid);
        if (fMid !== null && gMid !== null) {
            result.push({
                interval: [left, right],
                fAbove: fMid > gMid,
            });
        }
    }
    return result;
}

// ═════════════════════════════════════════════════════════════
// RENDU CANVAS
// ═════════════════════════════════════════════════════════════

function drawGraph(
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    state: GraphState,
    mouseX: number | null
) {
    const dpr = window.devicePixelRatio || 1;
    const plotW = W - MARGIN.left - MARGIN.right;
    const plotH = H - MARGIN.top - MARGIN.bottom;

    // ── Déterminer la fenêtre de vue ──
    let xMin = -10, xMax = 10;
    if (state.curves.length > 0) {
        xMin = Math.min(...state.curves.map(c => c.interval[0]));
        xMax = Math.max(...state.curves.map(c => c.interval[1]));
    }

    // ── Construire les évaluateurs & détecter les asymptotes verticales ──
    const evaluators: ((x: number) => number | null)[] = [];
    const allAsymptotes: number[] = [];

    for (const curve of state.curves) {
        const evaluator = createEvaluator(curve.expression);
        evaluators.push(evaluator || (() => null));
        if (evaluator) {
            const asyms = findVerticalAsymptotes(evaluator, xMin, xMax);
            for (const a of asyms) {
                if (!allAsymptotes.some(e => Math.abs(e - a) < 0.01)) {
                    allAsymptotes.push(a);
                }
            }
        }
    }

    // ── Calculer yMin/yMax avec l'algorithme IQR intelligent ──
    let [yMin, yMax] = computeSmartYDomain(evaluators, xMin, xMax, allAsymptotes);
    const yRange = yMax - yMin || 2;

    // ── Fonctions de transformation ──
    const toCanvasX = (x: number) => MARGIN.left + (x - xMin) / (xMax - xMin) * plotW;
    const toCanvasY = (y: number) => MARGIN.top + (yMax - y) / (yMax - yMin) * plotH;
    const toMathX = (cx: number) => xMin + (cx - MARGIN.left) / plotW * (xMax - xMin);
    const toMathY = (cy: number) => yMax - (cy - MARGIN.top) / plotH * (yMax - yMin);

    // ── 1. Fond ──
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Grille + Graduations ──
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    // Déterminer si les courbes sont trigonométriques
    const isTrig = state.curves.some(c =>
        /\b(cos|sin|tan|cot)\b/i.test(c.expression) ||
        /sinus|cosinus|tangent|trigono|sinuso/i.test(c.name)
    );

    // Position de l'axe X (y=0) et Y (x=0) en pixels canvas
    const xAxisOnScreen = yMin <= 0 && yMax >= 0;
    const yAxisOnScreen = xMin <= 0 && xMax >= 0;
    const cyAxis = xAxisOnScreen ? toCanvasY(0) : H - MARGIN.bottom; // y=0 en pixels
    const cxAxis = yAxisOnScreen ? toCanvasX(0) : MARGIN.left;       // x=0 en pixels

    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle = TEXT_COLOR;

    // ── Grille et graduations X ──
    if (isTrig) {
        // Graduations en multiples de π
        const PI = Math.PI;
        const range = xMax - xMin;
        let piStep: number;
        if (range <= 2 * PI) piStep = PI / 4;
        else if (range <= 4 * PI + 0.1) piStep = PI / 2;
        else if (range <= 8 * PI) piStep = PI;
        else piStep = 2 * PI;

        const startM = Math.ceil(xMin / piStep);
        const endM = Math.floor(xMax / piStep);

        ctx.textAlign = 'center';
        for (let m = startM; m <= endM; m++) {
            const xv = m * piStep;
            const cx = toCanvasX(xv);

            // Ligne de grille
            ctx.strokeStyle = GRID_COLOR;
            ctx.beginPath();
            ctx.moveTo(cx, MARGIN.top);
            ctx.lineTo(cx, H - MARGIN.bottom);
            ctx.stroke();

            // Label : formater en π
            const piMultiplier = m * (piStep / PI);
            const label = formatPiLabel(piMultiplier);
            if (label !== '0') {
                // Positionner le label SUR l'axe x (à y=0)
                ctx.fillStyle = TEXT_COLOR;
                ctx.font = 'italic 11px Inter, system-ui, sans-serif';
                ctx.fillText(label, cx, cyAxis + 18);
            }
        }
        // Label O à l'origine
        if (xAxisOnScreen && yAxisOnScreen) {
            ctx.fillStyle = 'rgba(226,232,240,0.5)';
            ctx.font = 'italic 12px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('O', cxAxis - 14, cyAxis + 16);
        }
    } else {
        // Graduations normales (entiers)
        const xStep = niceStep(xMax - xMin, 8);
        ctx.textAlign = 'center';

        for (let xv = Math.ceil(xMin / xStep) * xStep; xv <= xMax; xv += xStep) {
            const cx = toCanvasX(xv);

            // Ligne de grille
            ctx.strokeStyle = GRID_COLOR;
            ctx.beginPath();
            ctx.moveTo(cx, MARGIN.top);
            ctx.lineTo(cx, H - MARGIN.bottom);
            ctx.stroke();

            // Label SUR l'axe x (à y=0), pas en bas
            if (Math.abs(xv) > 1e-10) {
                ctx.fillStyle = TEXT_COLOR;
                ctx.font = '11px Inter, system-ui, sans-serif';
                ctx.fillText(formatNum(xv), cx, cyAxis + 18);
            }
        }
        // Label O à l'origine
        if (xAxisOnScreen && yAxisOnScreen) {
            ctx.fillStyle = 'rgba(226,232,240,0.5)';
            ctx.font = 'italic 12px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('O', cxAxis - 14, cyAxis + 16);
        }
    }

    // ── Grille et graduations Y ──
    const yStep = niceStep(yMax - yMin, 6);
    ctx.textAlign = 'right';

    for (let yv = Math.ceil(yMin / yStep) * yStep; yv <= yMax; yv += yStep) {
        const cy = toCanvasY(yv);

        // Ligne de grille
        ctx.strokeStyle = GRID_COLOR;
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, cy);
        ctx.lineTo(W - MARGIN.right, cy);
        ctx.stroke();

        // Label SUR l'axe y (à x=0), pas à gauche
        if (Math.abs(yv) > 1e-10) {
            ctx.fillStyle = TEXT_COLOR;
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.fillText(formatNum(yv), cxAxis - 8, cy + 4);
        }
    }

    // ── 3. Axes ──
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 1.5;

    // Axe X (y=0)
    if (yMin <= 0 && yMax >= 0) {
        const cy0 = toCanvasY(0);
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, cy0);
        ctx.lineTo(W - MARGIN.right, cy0);
        ctx.stroke();
    }

    // Axe Y (x=0)
    if (xMin <= 0 && xMax >= 0) {
        const cx0 = toCanvasX(0);
        ctx.beginPath();
        ctx.moveTo(cx0, MARGIN.top);
        ctx.lineTo(cx0, H - MARGIN.bottom);
        ctx.stroke();
    }

    // ── 4. Zones de positions relatives ──
    for (const pr of state.positionsRelatives) {
        const [left, right] = pr.interval;
        const cxLeft = Math.max(toCanvasX(left), MARGIN.left);
        const cxRight = Math.min(toCanvasX(right), W - MARGIN.right);

        if (state.curves.length >= 2 && evaluators[0] && evaluators[1]) {
            const color = pr.fAbove ? GREEN_ZONE : PINK_ZONE;
            ctx.fillStyle = color;
            ctx.beginPath();

            const steps = 200;
            const dx = (right - left) / steps;

            // Tracer le contour f puis g en sens inverse pour fill
            for (let i = 0; i <= steps; i++) {
                const xv = left + i * dx;
                const yv = evaluators[0](xv);
                if (yv === null) continue;
                const cx = toCanvasX(xv), cy = toCanvasY(yv);
                if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
            }
            for (let i = steps; i >= 0; i--) {
                const xv = left + i * dx;
                const yv = evaluators[1](xv);
                if (yv === null) continue;
                ctx.lineTo(toCanvasX(xv), toCanvasY(yv));
            }
            ctx.closePath();
            ctx.fill();

            // ── Bande colorée sur l'axe des x ──
            if (yMin <= 0 && yMax >= 0) {
                const cy0 = toCanvasY(0);
                const lineColor = pr.fAbove ? GREEN_LINE : PINK_LINE;
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 5;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(cxLeft, cy0);
                ctx.lineTo(cxRight, cy0);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    // ── 4b. Asymptotes verticales (lignes pointillées rouges) ──
    if (allAsymptotes.length > 0) {
        ctx.strokeStyle = '#ef4444'; // Rouge vif
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 5]);
        ctx.globalAlpha = 0.8;

        for (const asymX of allAsymptotes) {
            if (asymX >= xMin && asymX <= xMax) {
                const cx = toCanvasX(asymX);
                ctx.beginPath();
                ctx.moveTo(cx, MARGIN.top);
                ctx.lineTo(cx, H - MARGIN.bottom);
                ctx.stroke();

                // Label de l'asymptote
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#ef4444';
                ctx.font = 'italic 11px Inter, system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`x = ${formatNum(asymX)}`, cx + 5, MARGIN.top + 15);
                ctx.restore();
            }
        }

        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    // ── 5. Courbes (avec coupure aux asymptotes) ──
    ctx.lineWidth = 2.5;
    for (let ci = 0; ci < state.curves.length; ci++) {
        const curve = state.curves[ci];
        const evaluator = evaluators[ci];
        if (!evaluator) continue;

        ctx.strokeStyle = curve.color;
        ctx.beginPath();
        let started = false;
        let prevYv: number | null = null;

        const N = 2000; // Résolution augmentée pour un rendu lisse
        for (let i = 0; i <= N; i++) {
            const xv = curve.interval[0] + (curve.interval[1] - curve.interval[0]) * i / N;
            const yv = evaluator(xv);

            // Vérifier si on est proche d'une asymptote
            const nearAsymptote = allAsymptotes.some(a => Math.abs(xv - a) < (curve.interval[1] - curve.interval[0]) / N * 2);

            if (yv === null || yv < yMin - yRange * 2 || yv > yMax + yRange * 2 || nearAsymptote) {
                if (started) {
                    ctx.stroke(); // Terminer le segment en cours
                    ctx.beginPath();
                }
                started = false;
                prevYv = null;
                continue;
            }

            // Détecter un saut vertical trop important (anti-traversée d'asymptote)
            if (prevYv !== null && Math.abs(yv - prevYv) > yRange * 0.8) {
                ctx.stroke();
                ctx.beginPath();
                started = false;
            }

            const cx = toCanvasX(xv), cy = toCanvasY(yv);
            if (!started) { ctx.moveTo(cx, cy); started = true; }
            else ctx.lineTo(cx, cy);

            prevYv = yv;
        }
        ctx.stroke();
    }

    // ── 6. Tangente ──
    if (state.tangent) {
        const t = state.tangent;
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        const txMin = t.interval[0], txMax = t.interval[1];
        ctx.moveTo(toCanvasX(txMin), toCanvasY(t.y0 + t.slope * (txMin - t.x0)));
        ctx.lineTo(toCanvasX(txMax), toCanvasY(t.y0 + t.slope * (txMax - t.x0)));
        ctx.stroke();
        ctx.setLineDash([]);

        // Point de tangence
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(toCanvasX(t.x0), toCanvasY(t.y0), 6, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(t.equation, toCanvasX(t.x0) + 12, toCanvasY(t.y0) - 10);
    }

    // ── 7. Intersections + flèches vers axe ──
    for (const pt of state.intersections) {
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);
        const cy0 = yMin <= 0 && yMax >= 0 ? toCanvasY(0) : H - MARGIN.bottom;

        // Flèche pointillée vers l'axe des x
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pointe de flèche
        const arrowSize = 7;
        const dir = cy0 > cy ? 1 : -1;
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(cx, cy0);
        ctx.lineTo(cx - arrowSize, cy0 - arrowSize * dir);
        ctx.lineTo(cx + arrowSize, cy0 - arrowSize * dir);
        ctx.closePath();
        ctx.fill();

        // Croix au point d'intersection
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 3;
        const s = 8;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
        ctx.stroke();

        // Label du point
        ctx.fillStyle = GOLD;
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pt.label, cx, cy - 14);

        // Losange + label de l'abscisse sur l'axe
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(cx, cy0 - 5);
        ctx.lineTo(cx + 5, cy0);
        ctx.lineTo(cx, cy0 + 5);
        ctx.lineTo(cx - 5, cy0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = GOLD;
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.fillText(`x=${formatNum(pt.x)}`, cx, cy0 + 18);
    }

    // ── 8. Curseur interactif ──
    if (mouseX !== null && mouseX >= xMin && mouseX <= xMax && evaluators.length > 0) {
        // Trouver la courbe la plus proche
        let bestY: number | null = null;
        let bestColor = COLORS[0];
        let bestName = '';

        for (let ci = 0; ci < evaluators.length; ci++) {
            const yv = evaluators[ci](mouseX);
            if (yv !== null) {
                if (bestY === null) {
                    bestY = yv;
                    bestColor = state.curves[ci]?.color || COLORS[ci];
                    bestName = state.curves[ci]?.name || '';
                }
            }
        }

        if (bestY !== null) {
            const cx = toCanvasX(mouseX);
            const cy = toCanvasY(bestY);

            // Lignes de projection
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(cx, MARGIN.top); ctx.lineTo(cx, H - MARGIN.bottom);
            ctx.moveTo(MARGIN.left, cy); ctx.lineTo(W - MARGIN.right, cy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Point
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Info-bulle
            const text = `x = ${formatNum(mouseX)}   y = ${formatNum(bestY)}`;
            ctx.font = 'bold 12px Inter, system-ui, sans-serif';
            const tw = ctx.measureText(text).width;
            const bx = Math.min(cx + 15, W - tw - 30);
            const by = Math.max(cy - 35, MARGIN.top + 5);

            ctx.fillStyle = 'rgba(15,23,42,0.9)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            roundRect(ctx, bx, by, tw + 16, 24, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.fillText(text, bx + 8, by + 16);
        }
    }

    // ── 9. Titre ──
    if (state.title) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.title, W / 2, 28);
    }

    // ── 10. Légende ──
    if (state.curves.length > 0) {
        const legendX = W - MARGIN.right - 10;
        let legendY = MARGIN.top + 10;
        ctx.textAlign = 'right';
        ctx.font = '12px Inter, system-ui, sans-serif';

        for (const curve of state.curves) {
            ctx.fillStyle = curve.color;
            ctx.fillRect(legendX - ctx.measureText(curve.name).width - 18, legendY - 4, 12, 12);
            ctx.fillStyle = TEXT_COLOR;
            ctx.fillText(curve.name, legendX, legendY + 6);
            legendY += 20;
        }

        // Légende positions relatives
        if (state.positionsRelatives.length > 0 && state.curves.length >= 2) {
            legendY += 5;
            ctx.fillStyle = GREEN_LINE;
            ctx.fillRect(legendX - ctx.measureText('f > g').width - 18, legendY - 4, 12, 12);
            ctx.fillStyle = TEXT_COLOR;
            ctx.fillText(`${state.curves[0].name.split('=')[0]}> ${state.curves[1].name.split('=')[0]}`, legendX, legendY + 6);
            legendY += 20;

            ctx.fillStyle = PINK_LINE;
            ctx.fillRect(legendX - ctx.measureText('f < g').width - 18, legendY - 4, 12, 12);
            ctx.fillStyle = TEXT_COLOR;
            ctx.fillText(`${state.curves[0].name.split('=')[0]}< ${state.curves[1].name.split('=')[0]}`, legendX, legendY + 6);
        }
    }
}

// ── Utilitaires de dessin ──

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function niceStep(range: number, targetTicks: number): number {
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step: number;
    if (norm <= 1.5) step = 1;
    else if (norm <= 3.5) step = 2;
    else if (norm <= 7.5) step = 5;
    else step = 10;
    return step * mag;
}

// ═════════════════════════════════════════════════════════════
// COMPOSANT PAGE
// ═════════════════════════════════════════════════════════════

const EMPTY_STATE: GraphState = {
    curves: [],
    intersections: [],
    positionsRelatives: [],
    tangent: null,
    title: '',
};

export default function GraphPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [state, setState] = useState<GraphState>(EMPTY_STATE);
    const [mouseX, setMouseX] = useState<number | null>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 1000, h: 620 });

    // ── Traitement d'un état reçu : calcul auto intersections + zones ──
    const processIncomingState = useCallback((incoming: GraphState): GraphState => {
        const newState = { ...incoming };

        // Si le signal __COMPUTE__ est reçu, calculer les intersections
        if (newState.curves.length >= 2 && (newState.intersections as any) === '__COMPUTE__') {
            const evalF = createEvaluator(newState.curves[0].expression);
            const evalG = createEvaluator(newState.curves[1].expression);

            if (evalF && evalG) {
                const interval: [number, number] = [
                    Math.max(newState.curves[0].interval[0], newState.curves[1].interval[0]),
                    Math.min(newState.curves[0].interval[1], newState.curves[1].interval[1]),
                ];
                const intersections = findIntersections(evalF, evalG, interval);
                const positionsRelatives = computePositionsRelatives(evalF, evalG, intersections, interval);
                newState.intersections = intersections;
                newState.positionsRelatives = positionsRelatives;

                // Renvoyer les résultats au chat
                try {
                    const ch = new BroadcastChannel(CHANNEL_NAME);
                    ch.postMessage({
                        type: 'GRAPH_RESULTS',
                        intersections,
                        positionsRelatives,
                        curvesCount: newState.curves.length,
                    });
                    ch.close();
                } catch { /* ignore */ }
            } else {
                newState.intersections = [];
                newState.positionsRelatives = [];
            }
        }

        // Auto-calculer les positions relatives si on a 2+ courbes sans intersections calculées
        if (newState.curves.length >= 2
            && Array.isArray(newState.intersections)
            && newState.intersections.length > 0
            && newState.positionsRelatives.length === 0
        ) {
            const evalF = createEvaluator(newState.curves[0].expression);
            const evalG = createEvaluator(newState.curves[1].expression);
            if (evalF && evalG) {
                const interval: [number, number] = [
                    Math.max(newState.curves[0].interval[0], newState.curves[1].interval[0]),
                    Math.min(newState.curves[0].interval[1], newState.curves[1].interval[1]),
                ];
                newState.positionsRelatives = computePositionsRelatives(evalF, evalG, newState.intersections, interval);
            }
        }

        // Sauvegarder
        try {
            localStorage.setItem('graphState', JSON.stringify(newState));
        } catch { /* ignore */ }

        return newState;
    }, []);

    // ── Écouter le BroadcastChannel pour les mises à jour ──
    useEffect(() => {
        // Charger l'état initial depuis localStorage
        try {
            const stored = localStorage.getItem('graphState');
            if (stored) {
                const parsed = JSON.parse(stored);
                setState(processIncomingState(parsed));
            }
        } catch { /* ignore */ }

        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event) => {
            if (event.data && event.data.type === 'UPDATE_GRAPH') {
                setState(processIncomingState(event.data.state));
            }
        };

        // Recharger le graphState quand la page reprend le focus
        const onFocus = () => {
            try {
                const stored = localStorage.getItem('graphState');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setState(processIncomingState(parsed));
                }
            } catch { /* ignore */ }
        };
        window.addEventListener('focus', onFocus);

        return () => {
            channel.close();
            window.removeEventListener('focus', onFocus);
        };
    }, [processIncomingState]);

    // ── Resize ──
    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ w: window.innerWidth, h: window.innerHeight });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Dessiner le graphique ──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize.w * dpr;
        canvas.height = canvasSize.h * dpr;
        canvas.style.width = `${canvasSize.w}px`;
        canvas.style.height = `${canvasSize.h}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        drawGraph(ctx, canvasSize.w, canvasSize.h, state, mouseX);
    }, [state, mouseX, canvasSize]);

    // ── Gestion souris ──
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || state.curves.length === 0) return;

        const plotW = canvasSize.w - MARGIN.left - MARGIN.right;
        const px = e.clientX - rect.left;

        if (px < MARGIN.left || px > canvasSize.w - MARGIN.right) {
            setMouseX(null);
            return;
        }

        let xMin = -10, xMax = 10;
        if (state.curves.length > 0) {
            xMin = Math.min(...state.curves.map(c => c.interval[0]));
            xMax = Math.max(...state.curves.map(c => c.interval[1]));
        }

        const mathX = xMin + (px - MARGIN.left) / plotW * (xMax - xMin);
        setMouseX(mathX);
    }, [state, canvasSize]);

    const handleMouseLeave = useCallback(() => setMouseX(null), []);

    return (
        <div style={{
            background: BG_COLOR, width: '100vw', height: '100vh',
            overflow: 'hidden', cursor: 'crosshair',
        }}>
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ display: 'block' }}
            />
        </div>
    );
}
