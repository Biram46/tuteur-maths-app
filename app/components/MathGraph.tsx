'use client';

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import * as d3 from 'd3';
import { evalAt } from '@/lib/math-engine/expression-parser';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Moteur de Graphique Mathématique Professionnel "Quantum Graph"
 * Responsive : s'adapte à toutes les tailles d'écran (mobile inclus)
 * Supporte le tracé de courbes à partir d'expressions mathématiques
 * 
 * 🎓 PÉDAGOGIE :
 *   - Graduations en multiples de π pour les fonctions trigonométriques
 *   - Domaine Y auto-adaptatif basé sur le min/max réel de la fonction
 */
export interface GraphPoint {
    x: number;
    y: number;
    type?: 'closed' | 'open';
}

export interface GraphEntity {
    type: 'point' | 'vector' | 'segment';
    x1: number;
    y1: number;
    x2?: number;
    y2?: number;
    name?: string;
    color?: string;
}

export interface MathGraphProps {
    points?: GraphPoint[];
    entities?: GraphEntity[];
    functions?: { fn: string; color: string; domain?: [number, number] }[];
    domain?: { x: [number, number]; y: [number, number] };
    title?: string;
    hideAxes?: boolean;
    asymptotes?: number[];
    boxplots?: { min: number, q1: number, median: number, q3: number, max: number, label: string, color?: string }[];
    barcharts?: { coords: { x: number, y: number }[], color?: string }[];
    piecharts?: { data: { label: string, value: number, color?: string }[] }[];
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────

/**
 * Évalue en toute sécurité une expression pour x donné.
 * Utilise le même moteur d'évaluation que le back-end (expression-parser).
 */
function safeEval(expr: string, xVal: number): number | null {
    return evalAt(expr, xVal);
}

/**
 * Détecte les asymptotes verticales automatiquement (dénominateur = 0 ou saut infini).
 */
function findVerticalAsymptotes(expr: string, xMin: number, xMax: number, numSamples: number = 1000): number[] {
    const asyms: number[] = [];
    const step = (xMax - xMin) / numSamples;
    let prevY: number | null = null;
    let prevX = xMin;

    for (let i = 0; i <= numSamples; i++) {
        const xv = xMin + i * step;
        const yv = safeEval(expr, xv);

        if (i > 0) {
            if ((prevY !== null && yv === null) || (prevY === null && yv !== null)) {
                let lo = prevX, hi = xv;
                for (let j = 0; j < 30; j++) {
                    const mid = (lo + hi) / 2;
                    const mVal = safeEval(expr, mid);
                    if ((prevY !== null && mVal !== null)) lo = mid; else hi = mid;
                }
                const asym = Math.round(((lo + hi) / 2) * 1000) / 1000;
                if (!asyms.some(a => Math.abs(a - asym) < 0.05)) asyms.push(asym);
            } else if (prevY !== null && yv !== null && Math.sign(prevY) !== Math.sign(yv)) {
                const ratio = Math.abs(yv - prevY) / step;
                if (ratio > 500) { // pente gigantesque = probablement asymptote
                    const asym = Math.round(((prevX + xv) / 2) * 1000) / 1000;
                    if (!asyms.some(a => Math.abs(a - asym) < 0.05)) asyms.push(asym);
                }
            }
        }
        prevX = xv;
        prevY = yv;
    }
    return asyms;
}

/**
 * Détecte si une expression ou un titre concerne les fonctions trigonométriques.
 * Vérifie tant les noms de fonctions (cos, sin, tan) que les mots français
 * (cosinus, sinus, sinusoïdale, tangente, trigonométrique, etc.)
 */
function isTrigonometric(text: string): boolean {
    const low = text.toLowerCase();
    return /\b(cos|sin|tan|cotan|cot)\b/.test(low) ||
        /sinus|cosinus|tangent|trigono|sinuso/i.test(low);
}

/**
 * Génère les tick values en multiples de π pour l'axe x trigonométrique.
 * Retourne un tableau de { value: number, label: string }.
 */
function generatePiTicks(xMin: number, xMax: number, isMobile: boolean): { value: number; label: string }[] {
    const range = xMax - xMin;
    const PI = Math.PI;

    // Choisir le pas en fonction de la largeur du domaine
    let step: number;
    if (range <= 2 * PI) {
        step = PI / 4;      // π/4 pour les petits intervalles
    } else if (range <= 4 * PI) {
        step = PI / 2;      // π/2 pour les intervalles moyens
    } else if (range <= 8 * PI) {
        step = PI;           // π pour les grands intervalles
    } else {
        step = 2 * PI;      // 2π pour les très grands intervalles
    }

    // Sur mobile, on espace davantage
    if (isMobile && step < PI / 2) {
        step = PI / 2;
    }

    const ticks: { value: number; label: string }[] = [];
    // Trouver le premier multiple de step >= xMin
    const startMultiple = Math.ceil(xMin / step);
    const endMultiple = Math.floor(xMax / step);

    for (let m = startMultiple; m <= endMultiple; m++) {
        const value = m * step;
        // Ne pas dépasser les bornes
        if (value < xMin - 0.01 || value > xMax + 0.01) continue;

        const label = formatPiLabel(m, step);
        ticks.push({ value, label });
    }

    return ticks;
}

/**
 * Formate un label en notation π.
 * m = la valeur du multiple, step = le pas utilisé.
 */
function formatPiLabel(m: number, step: number): string {
    const PI = Math.PI;
    // Calculer le numérateur en termes de π
    // value = m * step ; step = PI * (n/d) → value = m * n/d * PI

    // Déterminer step en fraction de PI
    const ratio = step / PI; // ex: 0.25 pour PI/4, 0.5 pour PI/2, 1 pour PI

    // Le numérateur final en termes de π
    const piMultiplier = m * ratio; // ex: si m=3 et step=PI/4 → 3*0.25 = 0.75 = 3/4

    if (Math.abs(piMultiplier) < 1e-10) return '0';

    // Convertir en fraction
    const { num, den } = toFraction(piMultiplier);

    if (den === 1) {
        if (num === 1) return 'π';
        if (num === -1) return '−π';
        return `${num}π`;
    }

    const sign = num < 0 ? '−' : '';
    const absNum = Math.abs(num);

    if (absNum === 1) {
        return `${sign}π/${den}`;
    }
    return `${sign}${absNum}π/${den}`;
}

/**
 * Convertit un nombre décimal en fraction simplifiée (numérateur/dénominateur).
 */
function toFraction(decimal: number): { num: number; den: number } {
    const tolerance = 1e-6;
    const sign = decimal < 0 ? -1 : 1;
    let abs = Math.abs(decimal);

    // Essayer les dénominateurs courants (1, 2, 3, 4, 6, 8, 12)
    const denominators = [1, 2, 3, 4, 6, 8, 12];
    for (const d of denominators) {
        const n = Math.round(abs * d);
        if (Math.abs(abs - n / d) < tolerance) {
            const gcd = gcdFn(n, d);
            return { num: sign * (n / gcd), den: d / gcd };
        }
    }

    // Fallback: arrondir
    return { num: sign * Math.round(abs * 4), den: 4 };
}

function gcdFn(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

/**
 * Auto-calcule le domaine Y à partir des valeurs réelles de la/les fonctions.
 * Ajoute une marge pédagogique pour bien voir les extremums.
 */
function autoComputeYDomain(
    fns: { fn: string; domain?: [number, number] }[],
    xDomain: [number, number],
    asymptotes: number[]
): [number, number] {
    const allValues: number[] = [];
    const [xMin, xMax] = xDomain;
    const numSamples = 500;
    const step = (xMax - xMin) / numSamples;

    for (const { fn, domain: fnDomain } of fns) {
        const fxMin = fnDomain ? fnDomain[0] : xMin;
        const fxMax = fnDomain ? fnDomain[1] : xMax;

        for (let i = 0; i <= numSamples; i++) {
            const xVal = fxMin + i * ((fxMax - fxMin) / numSamples);
            // Exclure les points proches des asymptotes
            if (asymptotes.some(a => Math.abs(xVal - a) < step * 2)) continue;

            const yVal = safeEval(fn, xVal);
            if (yVal !== null) {
                allValues.push(yVal);
            }
        }
    }

    if (allValues.length === 0) return [-4, 4];

    // Utiliser l'algorithme IQR pour exclure les outliers
    allValues.sort((a, b) => a - b);
    const q5Idx = Math.floor(allValues.length * 0.02);
    const q95Idx = Math.floor(allValues.length * 0.98);
    const robustMin = allValues[q5Idx];
    const robustMax = allValues[q95Idx];

    // Marge pédagogique (25% au-dessus et en dessous du min/max)
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
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function MathGraph({
    points = [],
    entities = [],
    functions = [],
    domain: domainProp = { x: [-5, 5], y: [-4, 4] },
    title,
    hideAxes = false,
    asymptotes = [],
    boxplots = [],
    barcharts = [],
    piecharts = []
}: MathGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
    const componentId = useId().replace(/:/g, '');

    // Déterminer si on est en contexte trigonométrique
    // Vérifier dans les fonctions ET dans le titre (car l'IA met souvent le nom de la fonction dans le titre)
    const hasTrigFunctions =
        functions.some(f => isTrigonometric(f.fn)) ||
        (title ? isTrigonometric(title) : false);

    // Auto-adapter les domaines
    const domain = (() => {
        let xDomain = domainProp.x;
        let yDomain = domainProp.y;

        // Auto-calculer les asymptotes pour toutes les expressions si non fournies
        let computedAsymptotes = [...asymptotes];
        if (functions.length > 0) {
            functions.forEach(f => {
                const fnAsyms = findVerticalAsymptotes(f.fn, xDomain[0], xDomain[1]);
                for (const a of fnAsyms) {
                    if (!computedAsymptotes.includes(a)) computedAsymptotes.push(a);
                }
            });
        }
        
        // Pour les fonctions trigo : forcer le domaine X en multiples de π
        if (hasTrigFunctions) {
            const PI = Math.PI;
            const xRange = xDomain[1] - xDomain[0];
            // Si le domaine actuel ressemble au défaut ou est mal adapté, passer en 2π
            if (xRange < 2 * PI || (xDomain[0] === -5 && xDomain[1] === 5) ||
                (Math.abs(xDomain[0]) < 10 && Math.abs(xDomain[1]) < 10)) {
                xDomain = [-2 * PI, 2 * PI];
            }
        }

        // Auto-calculer le domaine Y quand on a des fonctions (expressions)
        if (functions.length > 0) {
            const autoY = autoComputeYDomain(functions, xDomain, computedAsymptotes);
            yDomain = autoY;
        }
        else if (barcharts && barcharts.length > 0) {
            let maxY = 0;
            barcharts.forEach(b => {
                b.coords.forEach(pt => { if (pt.y > maxY) maxY = pt.y; });
            });
            yDomain = [0, Math.ceil(maxY * 1.2)];
        }
        else if (boxplots && boxplots.length > 0) {
            yDomain = [0, boxplots.length + 1];
        }
        // Même sans fonctions, adapter le Y aux points si on en a assez
        else if (points.length > 2) {
            const yValues = points.map(p => p.y);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);
            const margin = Math.max((maxY - minY) * 0.25, 0.5);
            yDomain = [Math.floor(minY - margin), Math.ceil(maxY + margin)];
            // S'assurer que 0 est visible
            if (yDomain[0] > 0) yDomain[0] = 0;
            if (yDomain[1] < 0) yDomain[1] = 0;
        }

        return { x: xDomain as [number, number], y: yDomain as [number, number], asyms: computedAsymptotes };
    })();

    // Responsive : observer la taille du conteneur
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const w = Math.max(280, Math.min(600, containerWidth - 48));
                const h = Math.round(w * 0.667);
                setDimensions({ width: w, height: h });
            }
        };

        updateDimensions();

        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
            observer = new ResizeObserver(updateDimensions);
            observer.observe(containerRef.current);
        } else {
            window.addEventListener('resize', updateDimensions);
        }

        return () => {
            if (observer) observer.disconnect();
            else window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // IntersectionObserver pour le lazy rendering
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // ═══════════════════════════════════════════════════════════
    // RENDU D3
    // ═══════════════════════════════════════════════════════════
    const renderGraph = useCallback(() => {
        if (!svgRef.current || (!isVisible && animationKey === 0)) return;

        const isMobile = dimensions.width < 400;
        const margin = {
            top: isMobile ? 30 : 40,
            right: isMobile ? 20 : 30,
            bottom: isMobile ? 35 : 45,
            left: isMobile ? 35 : 45
        };
        const width = dimensions.width - margin.left - margin.right;
        const height = dimensions.height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const defs = svg.append('defs');

        // Marqueurs pour les flèches
        const arrowAxisId = `arrow-axis-${componentId}`;
        const arrowVectorId = `arrow-vector-${componentId}`;
        const arrowSumId = `arrow-sum-${componentId}`;

        defs.append('marker')
            .attr('id', arrowAxisId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'rgba(255,255,255,0.4)');

        defs.append('marker')
            .attr('id', arrowVectorId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#f43f5e');

        defs.append('marker')
            .attr('id', arrowSumId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#34d399');

        // Clip path
        const clipId = `clip-${componentId}`;
        defs.append('clipPath')
            .attr('id', clipId)
            .append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', width).attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear().domain(domain.x).range([0, width]);
        const yScale = d3.scaleLinear().domain(domain.y).range([height, 0]);

        const fontSize = isMobile ? '8px' : '10px';
        const trigFontSize = isMobile ? '7px' : '9px';

        // Position des axes (clampée au domaine visible)
        const xAxisY = Math.max(domain.y[0], Math.min(domain.y[1], 0));
        const yAxisX = Math.max(domain.x[0], Math.min(domain.x[1], 0));

        // ─────────────────── GRADUATIONS π OU NORMALES ───────────────────
        const piTicks = hasTrigFunctions ? generatePiTicks(domain.x[0], domain.x[1], isMobile) : [];
        const usesPiTicks = piTicks.length > 0;
        const hasPie = piecharts && piecharts.length > 0;
        const autoHideAxes = hideAxes || hasPie;

        if (!autoHideAxes) {
            // ── GRILLES ──
            if (usesPiTicks) {
                // Grilles verticales alignées sur les multiples de π
                piTicks.forEach(tick => {
                    g.append('line')
                        .attr('x1', xScale(tick.value)).attr('y1', 0)
                        .attr('x2', xScale(tick.value)).attr('y2', height)
                        .attr('stroke', 'rgba(255,255,255,0.06)')
                        .attr('stroke-dasharray', '2,2');
                });
            } else {
                const tickCount = isMobile ? 6 : 10;
                const gridX = g.append('g').attr('class', 'grid-x')
                    .attr('transform', `translate(0,${height})`)
                    .call(
                        d3.axisBottom(xScale).ticks(tickCount).tickSize(-height).tickFormat(() => "")
                    );
                gridX.select('.domain').remove();
                gridX.selectAll('text').remove(); // Supprimer les text fantômes
                gridX.selectAll('line')
                    .attr('stroke', 'rgba(255,255,255,0.06)')
                    .attr('stroke-dasharray', '2,2');
            }

            // Grilles horizontales (toujours normales)
            const yTickCount = isMobile ? 5 : 8;
            const gridY = g.append('g').attr('class', 'grid-y')
                .call(
                    d3.axisLeft(yScale).ticks(yTickCount).tickSize(-width).tickFormat(() => "")
                );
            gridY.select('.domain').remove();
            gridY.selectAll('text').remove(); // Supprimer les text fantômes
            gridY.selectAll('line')
                .attr('stroke', 'rgba(255,255,255,0.06)')
                .attr('stroke-dasharray', '2,2');

            // ── AXES PRINCIPAUX ──
            const axisColor = 'rgba(255,255,255,0.4)';

            // Axe X horizontal
            g.append('line')
                .attr('x1', 0).attr('y1', yScale(xAxisY))
                .attr('x2', width + 10).attr('y2', yScale(xAxisY))
                .attr('stroke', axisColor).attr('stroke-width', 2)
                .attr('marker-end', `url(#${arrowAxisId})`);

            // Axe Y vertical
            g.append('line')
                .attr('x1', xScale(yAxisX)).attr('y1', height)
                .attr('x2', xScale(yAxisX)).attr('y2', -10)
                .attr('stroke', axisColor).attr('stroke-width', 2)
                .attr('marker-end', `url(#${arrowAxisId})`);

            // ── GRADUATIONS AXE X ──
            if (usesPiTicks) {
                // Graduations en multiples de π
                piTicks.forEach(tick => {
                    const px = xScale(tick.value);
                    const py = yScale(xAxisY);

                    // Petit trait de graduation
                    g.append('line')
                        .attr('x1', px).attr('y1', py)
                        .attr('x2', px).attr('y2', py + 5)
                        .attr('stroke', 'rgba(255,255,255,0.3)');

                    // Label (en dessous du trait)
                    if (tick.label !== '0') {
                        g.append('text')
                            .attr('x', px)
                            .attr('y', py + 16)
                            .attr('text-anchor', 'middle')
                            .attr('fill', 'rgba(255,255,255,0.75)')
                            .style('font-size', trigFontSize)
                            .style('font-style', 'italic')
                            .text(tick.label);
                    }
                });
            } else {
                // Graduations normales (entiers)
                const tickCount = isMobile ? 6 : 10;
                const xAxisGroup = g.append('g')
                    .attr('transform', `translate(0,${yScale(xAxisY)})`)
                    .call(
                        d3.axisBottom(xScale)
                            .ticks(tickCount)
                            .tickSize(5)
                            .tickFormat((d) => {
                                const val = d as number;
                                if (Math.abs(val) < 1e-10) return '';
                                return Number.isInteger(val) ? String(val) : val.toFixed(1);
                            })
                    );
                xAxisGroup.select('.domain').remove();
                xAxisGroup.selectAll('line').attr('stroke', 'rgba(255,255,255,0.3)'); xAxisGroup.selectAll('text')
                    .style('fill', 'rgba(255,255,255,0.7)')
                    .style('font-size', fontSize);
            }

            // ── GRADUATIONS AXE Y ──
            const yAxisGroup = g.append('g')
                .attr('transform', `translate(${xScale(yAxisX)},0)`)
                .call(
                    d3.axisLeft(yScale)
                        .ticks(yTickCount)
                        .tickSize(5)
                        .tickFormat((d) => {
                            const val = d as number;
                            if (Math.abs(val) < 1e-10) return '';
                            return Number.isInteger(val) ? String(val) : val.toFixed(1);
                        })
                );
            yAxisGroup.select('.domain').remove();
            yAxisGroup.selectAll('line').attr('stroke', 'rgba(255,255,255,0.3)');
            yAxisGroup.selectAll('text')
                .style('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', fontSize)
                .attr('dx', '-0.5em');

            // ── LABEL "O" à l'origine ──
            if (domain.x[0] <= 0 && domain.x[1] >= 0 && domain.y[0] <= 0 && domain.y[1] >= 0) {
                g.append('text')
                    .attr('x', xScale(0) - 12)
                    .attr('y', yScale(0) + 16)
                    .attr('fill', 'rgba(255,255,255,0.5)')
                    .style('font-size', fontSize)
                    .style('font-style', 'italic')
                    .text('O');
            }
        }

        // ── COURBES DE FONCTIONS ──
        if (functions && functions.length > 0) {
            const functionGroup = g.append('g').attr('clip-path', `url(#${clipId})`);

            functions.forEach(({ fn, color, domain: fnDomain }) => {
                const xMin = fnDomain ? fnDomain[0] : domain.x[0];
                const xMax = fnDomain ? fnDomain[1] : domain.x[1];
                const numPoints = 500;
                const step = (xMax - xMin) / numPoints;

                const segments: { x: number; y: number }[][] = [];
                let currentSegment: { x: number; y: number }[] = [];

                for (let i = 0; i <= numPoints; i++) {
                    const xVal = xMin + i * step;

                    // Vérifier si on est proche d'une asymptote
                    const nearAsymptote = domain.asyms.some(a => Math.abs(xVal - a) < step * 3);
                    if (nearAsymptote) {
                        if (currentSegment.length > 0) {
                            segments.push(currentSegment);
                            currentSegment = [];
                        }
                        continue;
                    }

                    const yVal = safeEval(fn, xVal);
                    if (yVal !== null && yVal >= domain.y[0] - 5 && yVal <= domain.y[1] + 5) {
                        // Vérifier la continuité
                        if (currentSegment.length > 0) {
                            const prevY = currentSegment[currentSegment.length - 1].y;
                            const jump = Math.abs(yVal - prevY);
                            const range = domain.y[1] - domain.y[0];
                            if (jump > range * 0.8) {
                                segments.push(currentSegment);
                                currentSegment = [];
                            }
                        }
                        currentSegment.push({ x: xVal, y: yVal });
                    } else {
                        if (currentSegment.length > 0) {
                            segments.push(currentSegment);
                            currentSegment = [];
                        }
                    }
                }
                if (currentSegment.length > 0) segments.push(currentSegment);

                // Tracer
                const lineGen = d3.line<{ x: number; y: number }>()
                    .x(d => xScale(d.x))
                    .y(d => yScale(d.y))
                    .curve(d3.curveMonotoneX);

                segments.forEach(seg => {
                    if (seg.length < 2) return;
                    functionGroup.append('path')
                        .datum(seg)
                        .attr('fill', 'none')
                        .attr('stroke', color)
                        .attr('stroke-width', isMobile ? 2 : 2.5)
                        .attr('d', lineGen)
                        .attr('opacity', 0)
                        .transition()
                        .duration(800)
                        .attr('opacity', 1);
                });
            });

            // Asymptotes verticales (combinaison des prop asymptotes et des auto-détectées)
            domain.asyms.forEach(a => {
                if (a >= domain.x[0] && a <= domain.x[1]) {
                    g.append('line')
                        .attr('x1', xScale(a)).attr('y1', 0)
                        .attr('x2', xScale(a)).attr('y2', height)
                        .attr('stroke', '#ef4444')
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '6,4')
                        .attr('opacity', 0.6);
                }
            });
        }

        // ── POINTS (ancien système — courbe par points) ──
        if (points && points.length > 1 && functions.length === 0) {
            const lineGenerator = d3.line<GraphPoint>().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveMonotoneX);
            g.append('path').datum(points).attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', isMobile ? 2 : 2.5).attr('d', lineGenerator);
        }

        // ── ENTITÉS (points nommés, vecteurs, segments) ──
        let currentDelay = 0;
        entities.forEach((entity) => {
            const isSum = entity.name === 'w' || entity.name?.toLowerCase().includes('sum');
            const color = entity.color || (isSum ? '#34d399' : (entity.type === 'vector' ? '#f43f5e' : '#fbbf24'));

            const entityGroup = g.append('g').style('opacity', 0);
            entityGroup.transition().delay(currentDelay).duration(400).style('opacity', 1);

            if (entity.type === 'point') {
                const pointR = isMobile ? 4 : 5;
                entityGroup.append('circle').attr('cx', xScale(entity.x1)).attr('cy', yScale(entity.y1)).attr('r', pointR).attr('fill', color).attr('stroke', 'white');
                if (entity.name) entityGroup.append('text').attr('x', xScale(entity.x1) + 12).attr('y', yScale(entity.y1) - 12).attr('fill', color).attr('font-weight', 'bold').style('font-size', isMobile ? '12px' : '14px').text(entity.name);
                currentDelay += 600;
            } else if (entity.x2 !== undefined && entity.y2 !== undefined) {
                const line = entityGroup.append('line')
                    .attr('x1', xScale(entity.x1)).attr('y1', yScale(entity.y1))
                    .attr('x2', xScale(entity.x1)).attr('y2', yScale(entity.y1))
                    .attr('stroke', color).attr('stroke-width', isMobile ? 2.5 : 3)
                    .attr('marker-end', `url(#${isSum ? arrowSumId : arrowVectorId})`);

                line.transition().delay(currentDelay).duration(1200)
                    .attr('x2', xScale(entity.x2)).attr('y2', yScale(entity.y2));

                if (entity.name) {
                    const mx = (entity.x1 + entity.x2) / 2;
                    const my = (entity.y1 + entity.y2) / 2;
                    const nameTag = entityGroup.append('g')
                        .attr('transform', `translate(${xScale(mx)},${yScale(my) - 20})`)
                        .style('opacity', 0);

                    nameTag.transition().delay(currentDelay + 800).duration(400).style('opacity', 1);
                    nameTag.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('fill', color)
                        .attr('font-weight', 'bold')
                        .attr('font-style', 'italic')
                        .style('font-size', isMobile ? '14px' : '16px')
                        .text(entity.name);

                    if (entity.type === 'vector' && entity.name) {
                        nameTag.append('path')
                            .attr('d', 'M-8,-14 L8,-14 M4,-17 L8,-14 L4,-11')
                            .attr('stroke', color)
                            .attr('stroke-width', 1.5)
                            .attr('fill', 'none');
                    }
                }
                currentDelay += 1500;
            }
        });

        // ── POINTS CLÉS sur les courbes de fonctions ──
        if (functions && functions.length > 0 && points && points.length > 0) {
            points.forEach(pt => {
                g.append('circle')
                    .attr('cx', xScale(pt.x))
                    .attr('cy', yScale(pt.y))
                    .attr('r', isMobile ? 3 : 4)
                    .attr('fill', '#fbbf24')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .attr('opacity', 0)
                    .transition()
                    .delay(600)
                    .duration(400)
                    .attr('opacity', 1);
            });
        }

        // ── BARCHARTS ──
        if (barcharts && barcharts.length > 0) {
            const chartGroup = g.append('g').attr('clip-path', `url(#${clipId})`);
            barcharts.forEach(bar => {
                const color = bar.color || '#3b82f6';
                const dx = xScale(1) - xScale(0);
                const bw = Math.abs(dx * 0.6);
                bar.coords.forEach(pt => {
                    const py = yScale(pt.y);
                    const p0 = yScale(0);
                    const bh = Math.max(0, p0 - py);
                    chartGroup.append('rect')
                        .attr('x', xScale(pt.x) - bw/2)
                        .attr('y', py)
                        .attr('width', bw)
                        .attr('height', bh)
                        .attr('fill', color)
                        .attr('opacity', 0)
                        .attr('rx', 2)
                        .transition()
                        .delay(400)
                        .duration(800)
                        .attr('opacity', 0.8);
                });
            });
        }

        // ── BOXPLOTS ──
        if (boxplots && boxplots.length > 0 && !hasPie) {
            const boxGroup = g.append('g').attr('clip-path', `url(#${clipId})`);
            boxplots.forEach((box, i) => {
                const yPos = boxplots.length === 1 ? (domain.y[0] + domain.y[1])/2 : domain.y[0] + (i + 1) * (domain.y[1] - domain.y[0]) / (boxplots.length + 1);
                const sy = yScale(yPos);
                const dh = 15; // half height
                const color = box.color || '#10b981';

                const grp = boxGroup.append('g').style('opacity', 0);
                grp.transition().delay(i * 300).duration(800).style('opacity', 1);

                // Ligne de moustache
                grp.append('line').attr('x1', xScale(box.min)).attr('x2', xScale(box.max)).attr('y1', sy).attr('y2', sy).attr('stroke', color).attr('stroke-width', 2);
                
                // Moustaches bouts
                grp.append('line').attr('x1', xScale(box.min)).attr('x2', xScale(box.min)).attr('y1', sy-dh/2).attr('y2', sy+dh/2).attr('stroke', color).attr('stroke-width', 2);
                grp.append('line').attr('x1', xScale(box.max)).attr('x2', xScale(box.max)).attr('y1', sy-dh/2).attr('y2', sy+dh/2).attr('stroke', color).attr('stroke-width', 2);
                
                // Boîte
                grp.append('rect')
                    .attr('x', xScale(box.q1)).attr('y', sy-dh)
                    .attr('width', xScale(box.q3) - xScale(box.q1)).attr('height', dh*2)
                    .attr('fill', color).attr('fill-opacity', 0.3)
                    .attr('stroke', color).attr('stroke-width', 2);
                    
                // Médiane
                grp.append('line').attr('x1', xScale(box.median)).attr('x2', xScale(box.median)).attr('y1', sy-dh).attr('y2', sy+dh).attr('stroke', color).attr('stroke-width', 3);
                
                // Label au-dessus de la boîte, centré sur la médiane
                grp.append('text').attr('x', xScale(box.median)).attr('y', sy - dh - 8)
                    .attr('fill', 'white').style('font-size', '13px').attr('text-anchor', 'middle').text(box.label);
            });
        }

        // ── PIECHARTS (Camemberts) ──
        if (hasPie) {
            const pieGroup = g.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);
            const radius = Math.min(width, height) / 2 * 0.8;
            
            const pieGen = d3.pie<any>().value(d => d.value).sort(null);
            const arcGen = d3.arc<any>().innerRadius(0).outerRadius(radius);
            const labelArcGen = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius * 0.6);
            
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

            piecharts.forEach((pie, pieIdx) => {
                const pieData = pieGen(pie.data);
                
                const arcs = pieGroup.selectAll('.arc')
                    .data(pieData)
                    .enter().append('g')
                    .attr('class', 'arc');
                    
                arcs.append('path')
                    .attr('d', arcGen)
                    .attr('fill', (d, i) => d.data.color || colorScale(i.toString()))
                    .attr('stroke', 'white')
                    .attr('stroke-width', '2px')
                    .attr('opacity', 0)
                    .transition()
                    .delay((d, i) => i * 200)
                    .duration(500)
                    .attr('opacity', 0.9);
                    
                arcs.append('text')
                    .attr('transform', d => `translate(${labelArcGen.centroid(d)})`)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .style('font-size', isMobile ? '10px' : '12px')
                    .style('font-weight', 'bold')
                    .text(d => d.data.label)
                    .attr('opacity', 0)
                    .transition()
                    .delay((d, i) => i * 200 + 400)
                    .duration(500)
                    .attr('opacity', 1);
            });
        }

        // ── TITRE ──
        // (Rendu en HTML au lieu du SVG pour gérer le LaTeX/KaTeX proprement)
    }, [points, entities, functions, domain, title, isVisible, animationKey, componentId, dimensions, hideAxes, asymptotes, hasTrigFunctions, boxplots, barcharts, piecharts]);

    useEffect(() => {
        renderGraph();
    }, [renderGraph]);

    return (
        <div ref={containerRef} className="my-8 w-full flex flex-col items-center">
            <div className="relative p-4 sm:p-6 bg-slate-900 border border-white/10 rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl group w-full max-w-[648px]">
                {/* Titre superposé pour LaTeX */}
                {title && (
                    <div style={{
                        position: 'absolute', top: 16, width: '100%', left: 0,
                        textAlign: 'center', pointerEvents: 'none', zIndex: 30,
                        color: 'white', fontSize: dimensions.width < 400 ? 13 : 16, fontWeight: 'bold',
                        textShadow: '0px 0px 4px #020617'
                    }}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
                            components={{ p: ({ ...props }) => <p style={{ margin: 0 }} {...props} /> }}>
                            {title.includes('$') || title.includes('\\') 
                                ? `$$${title.replace(/\\$/g, '').replace(/(\blog\()|(\bsqrt\()|(\bpi\b)/g, (m) => m === 'log(' ? '\\ln(' : m === 'sqrt(' ? '\\sqrt{' : '\\pi ')}$$` 
                                : title.replace(/\blog\(/g, 'ln(').replace(/\bsqrt\(/g, '√(').replace(/\bpi\b/g, 'π')}
                        </ReactMarkdown>
                    </div>
                )}
                <div className="absolute top-3 right-4 sm:top-4 sm:right-6 flex items-center gap-3 z-40">
                    <button
                        onClick={() => { setAnimationKey(k => k + 1); setIsVisible(true); }}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-cyan-400 transition-all border border-white/5"
                        title="Rejouer l'animation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                    <span className={`w-2 h-2 rounded-full ${isVisible ? 'bg-cyan-500 animate-pulse' : 'bg-slate-500'}`}></span>
                </div>
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                    width="100%"
                    height="auto"
                    className="rounded-xl overflow-visible"
                    style={{ maxWidth: `${dimensions.width}px` }}
                />
            </div>
            <p className="mt-4 text-[10px] text-slate-500 italic text-center">Représentation dynamique pas à pas • Bouton Rejouer en haut à droite</p>
        </div>
    );
}
