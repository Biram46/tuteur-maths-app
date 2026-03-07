/**
 * COUCHE 3 — MOTEUR GRAPHIQUE
 * ============================
 * Génère les données pour tracer une courbe de f(x).
 * Retourne un bloc @@@ graph compatible avec MathGraph.tsx
 */

import { evalAt, findZeros, findDiscontinuities, round4, formatForTable } from './expression-parser';

export interface GraphInput {
    expression: string;
    domain?: [number, number, number, number]; // [xmin, xmax, ymin, ymax]
    extraPoints?: { x: number; y: number; label?: string }[];
    title?: string;
    numPoints?: number;
}

export interface GraphResult {
    success: boolean;
    aaaBlock?: string;
    graphData?: {
        expression: string;
        domain: [number, number, number, number];
        keyPoints: { x: number; y: number; label: string }[];
    };
    error?: string;
}

/**
 * Génère les données graphiques pour f(x).
 */
export function generateGraphData(input: GraphInput): GraphResult {
    const {
        expression,
        domain,
        extraPoints = [],
        title,
        numPoints = 200,
    } = input;

    try {
        // Domaine automatique si non fourni
        const [xMin, xMax] = domain ? [domain[0], domain[1]] : autoDetectDomain(expression);
        let [, , yMin, yMax] = domain ?? [xMin, xMax, -10, 10];

        // Détecter les discontinuités (asymptotes verticales)
        const discontinuities = findDiscontinuities(expression, xMin, xMax);

        // Calculer quelques points clés (zéros, extremums…)
        const zeros = findZeros(expression, xMin, xMax);
        const keyPoints: { x: number; y: number; label: string }[] = [];

        for (const z of zeros) {
            keyPoints.push({ x: z, y: 0, label: `(${formatForTable(z)} ; 0)` });
        }

        // Origine si dans le domaine
        if (xMin <= 0 && xMax >= 0) {
            const y0 = evalAt(expression, 0);
            if (y0 !== null && !zeros.includes(0)) {
                keyPoints.push({ x: 0, y: round4(y0), label: `(0 ; ${formatForTable(round4(y0))})` });
            }
        }

        // Points supplémentaires fournis
        for (const ep of extraPoints) {
            keyPoints.push({ x: ep.x, y: ep.y, label: ep.label ?? `(${formatForTable(ep.x)} ; ${formatForTable(ep.y)})` });
        }

        // Calculer yMin/yMax avec algorithme IQR intelligent (exclut les outliers)
        if (!domain) {
            const allValues: number[] = [];
            const smartN = 800;
            const step = (xMax - xMin) / smartN;
            for (let i = 0; i <= smartN; i++) {
                const x = xMin + i * step;
                // Exclure les points proches des discontinuités
                if (discontinuities.some(d => Math.abs(x - d) < 0.15)) continue;
                const y = evalAt(expression, x);
                if (y !== null && isFinite(y)) {
                    allValues.push(y);
                }
            }

            if (allValues.length > 0) {
                allValues.sort((a, b) => a - b);
                const q1Idx = Math.floor(allValues.length * 0.05);
                const q3Idx = Math.floor(allValues.length * 0.95);
                const q1 = allValues[q1Idx];
                const q3 = allValues[q3Idx];
                const iqr = q3 - q1;
                yMin = Math.floor(Math.min(q1 - 1.5 * iqr, -3));
                yMax = Math.ceil(Math.max(q3 + 1.5 * iqr, 3));
            } else {
                yMin = -10;
                yMax = 10;
            }
        }

        const effectiveDomain: [number, number, number, number] = [xMin, xMax, yMin, yMax];

        // Construire le bloc @@@
        const lines: string[] = ['graph'];
        lines.push(`function: ${expression}`);
        lines.push(`domain: ${effectiveDomain.join(',')}`);
        // Ajouter les asymptotes verticales
        if (discontinuities.length > 0) {
            lines.push(`asymptotes: ${discontinuities.join(',')}`);
        }
        if (keyPoints.length > 0) {
            keyPoints.forEach(p => lines.push(`${p.x},${p.y}`));
        }
        if (title) lines.push(`title: ${title}`);

        const aaaBlock = `@@@\n${lines.join(' |\n')} |\n@@@`;

        return {
            success: true,
            aaaBlock,
            graphData: { expression, domain: effectiveDomain, keyPoints },
        };
    } catch (err: any) {
        return { success: false, error: err.message ?? String(err) };
    }
}

/**
 * Détecte automatiquement un domaine de visualisation raisonnable
 * en cherchant les features intéressantes de la fonction.
 * 🎓 Pour les fonctions trigonométriques, utilise des multiples de π.
 */
function autoDetectDomain(expression: string): [number, number] {
    const low = expression.toLowerCase();
    const isTrig = /\b(cos|sin|tan|cotan|cot)\b/.test(low);

    // Pour les fonctions trigo : domaine en multiples de π
    if (isTrig) {
        const PI = Math.PI;
        return [-2 * PI, 2 * PI]; // [-2π, 2π] = 2 périodes complètes
    }

    // Chercher des discontinuités dans un grand domaine
    const disc = findDiscontinuities(expression, -50, 50);
    const zeros = findZeros(expression, -20, 20);

    if (disc.length === 0 && zeros.length === 0) return [-10, 10];

    const allPoints = [...disc, ...zeros];
    const margin = Math.max(3, (Math.max(...allPoints) - Math.min(...allPoints)) * 0.5);

    const xMin = Math.floor(Math.min(...allPoints) - margin);
    const xMax = Math.ceil(Math.max(...allPoints) + margin);

    return [Math.max(xMin, -30), Math.min(xMax, 30)];
}
