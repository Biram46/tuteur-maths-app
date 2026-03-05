/**
 * COUCHE 3 — MOTEUR TABLEAU DE VARIATIONS
 * =========================================
 * Génère automatiquement un tableau de variations pour une fonction f(x).
 *
 * Algorithme :
 * 1. Calculer f'(x) symboliquement via mathjs
 * 2. Trouver les zéros de f'(x) (extremums)
 * 3. Calculer f(x) aux extremums
 * 4. Construire le tableau sign: f'(x) + variation: f(x)
 * 5. Respecter les règles pédagogiques du niveau (1ère ≠ Terminale)
 */

import type { TableSpec, TableRow, SignRow, VariationRow } from '../math-spec-types';
import type { NiveauLycee } from '../niveaux';
import {
    evalAt, computeDerivative, findZeros, findDiscontinuities,
    signOnInterval, buildXValues, formatForTable, round4
} from './expression-parser';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface VariationTableInput {
    expression: string;       // f(x) ex: "x^3 - 3*x"
    niveau: NiveauLycee;
    derivativeExpr?: string;  // f'(x) fournie si déjà calculée
    searchDomain?: [number, number];
    title?: string;
}

export interface VariationTableResult {
    success: boolean;
    tableSpec?: TableSpec;
    aaaBlock?: string;
    derivativeExpr?: string;
    extrema?: { x: number; y: number; type: 'max' | 'min' }[];
    error?: string;
}

// ─────────────────────────────────────────────────────────────
// RÈGLES PÉDAGOGIQUES PAR NIVEAU
// ─────────────────────────────────────────────────────────────

interface NiveauRules {
    showLimitsAtInfinity: boolean;     // Mettre les valeurs limites à ±∞
    includeDerivativeLine: boolean;    // Inclure la ligne sign: f'(x)
    allowLimits: boolean;              // Utiliser les limites
}

function getRulesForNiveau(niveau: NiveauLycee): NiveauRules {
    switch (niveau) {
        case 'seconde':
        case 'seconde_sthr':
            return { showLimitsAtInfinity: false, includeDerivativeLine: false, allowLimits: false };

        case 'premiere_commune':
        case 'premiere_techno':
            return { showLimitsAtInfinity: false, includeDerivativeLine: true, allowLimits: false };

        case 'premiere_spe':
            // 1ère spé : f'(x) oui, mais PAS de valeurs à ±∞ (pas de limites)
            return { showLimitsAtInfinity: false, includeDerivativeLine: true, allowLimits: false };

        case 'terminale_spe':
        case 'terminale_expert':
        case 'terminale_techno':
        case 'terminale_comp':
            // Terminale : tout est autorisé
            return { showLimitsAtInfinity: true, includeDerivativeLine: true, allowLimits: true };

        default:
            return { showLimitsAtInfinity: false, includeDerivativeLine: true, allowLimits: false };
    }
}

// ─────────────────────────────────────────────────────────────
// GÉNÉRATION DU TABLEAU DE VARIATIONS
// ─────────────────────────────────────────────────────────────

export function generateVariationTable(input: VariationTableInput): VariationTableResult {
    const { expression, niveau, searchDomain = [-20, 20] } = input;
    const rules = getRulesForNiveau(niveau);

    try {
        // ── 1. Calculer f'(x) ──
        const derivExpr = input.derivativeExpr ?? computeDerivative(expression);
        if (!derivExpr) {
            return { success: false, error: `Impossible de calculer f'(x) pour : ${expression}`, extrema: [] };
        }

        // ── 2. Zéros de f'(x) = extremums ──
        const derivZeros = findZeros(derivExpr, searchDomain[0], searchDomain[1]);

        // ── 3. Valeurs interdites de f (pour la ligne variation) ──
        const discontinuities = findDiscontinuities(expression, searchDomain[0], searchDomain[1]);

        // ── 4. Points critiques ——
        const allCritical = [...new Set([...derivZeros, ...discontinuities])].sort((a, b) => a - b);
        const xValues = buildXValues(allCritical);

        // ── 5. Intervalles ──
        const intervalBounds = buildIntervalBounds(allCritical);

        // ── 6. Ligne sign: f'(x) ──
        const rows: TableRow[] = [];

        if (rules.includeDerivativeLine) {
            const derivRow = buildDerivSignRow(derivExpr, allCritical, intervalBounds, derivZeros, discontinuities);
            rows.push(derivRow);
        }

        // ── 7. Ligne variation: f(x) ──
        const extrema: { x: number; y: number; type: 'max' | 'min' }[] = [];
        const varRow = buildVariationRow(
            expression, derivExpr, allCritical, intervalBounds,
            derivZeros, discontinuities, rules, extrema
        );
        rows.push(varRow);

        const tableSpec: TableSpec = {
            xValues,
            rows,
            title: input.title ?? `Tableau de variations de f(x) = ${expression}`,
        };

        return {
            success: true,
            tableSpec,
            aaaBlock: tableSpecToAAA(tableSpec),
            derivativeExpr: derivExpr,
            extrema,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.message ?? String(err),
            extrema: [],
        };
    }
}

// ─────────────────────────────────────────────────────────────
// CONSTRUCTION DES LIGNES
// ─────────────────────────────────────────────────────────────

function buildIntervalBounds(criticalPoints: number[]): [number | '-inf', number | '+inf'][] {
    const bounds: [number | '-inf', number | '+inf'][] = [];
    if (criticalPoints.length === 0) return [['-inf', '+inf']];

    bounds.push(['-inf', criticalPoints[0]]);
    for (let i = 0; i < criticalPoints.length - 1; i++) {
        bounds.push([criticalPoints[i], criticalPoints[i + 1]]);
    }
    bounds.push([criticalPoints[criticalPoints.length - 1], '+inf']);
    return bounds;
}

/**
 * Ligne sign: f'(x)
 * Format: +/-, 0 ou ||, +/-, 0 ou ||, ..., +/-
 */
function buildDerivSignRow(
    derivExpr: string,
    allCritical: number[],
    intervalBounds: [number | '-inf', number | '+inf'][],
    derivZeros: number[],
    discontinuities: number[]
): SignRow {
    const values: string[] = [];

    for (let i = 0; i < intervalBounds.length; i++) {
        const [from, to] = intervalBounds[i];
        const sign = signOnInterval(derivExpr, from, to);
        values.push(sign ?? '+');

        if (i < allCritical.length) {
            const cp = allCritical[i];
            const isDiscontinuity = discontinuities.some(d => Math.abs(d - cp) < 1e-6);
            const isDerivZero = derivZeros.some(z => Math.abs(z - cp) < 1e-6);

            if (isDiscontinuity) values.push('||');
            else if (isDerivZero) values.push('0');
            else values.push(signOnInterval(derivExpr, cp - 1e-8, cp + 1e-8) ?? '+');
        }
    }

    return { label: "f'(x)", type: 'sign', values };
}

/**
 * Ligne variation: f(x)
 *
 * En Terminale : valeurs à ±∞ incluses → format étendu
 * En 1ère Spé : flèches uniquement (pas de valeurs à ±∞), valeurs aux extremums
 * En Seconde : flèches uniquement, pas de dérivée
 */
function buildVariationRow(
    expression: string,
    derivExpr: string,
    allCritical: number[],
    intervalBounds: [number | '-inf', number | '+inf'][],
    derivZeros: number[],
    discontinuities: number[],
    rules: NiveauRules,
    extrema: { x: number; y: number; type: 'max' | 'min' }[]
): VariationRow {
    const values: string[] = [];

    // Valeur à -∞ (Terminale uniquement)
    if (rules.showLimitsAtInfinity) {
        const limitMinus = computeLimitAtInfinity(expression, '-inf');
        values.push(limitMinus);
    }

    for (let i = 0; i < intervalBounds.length; i++) {
        const [from, to] = intervalBounds[i];

        // Flèche (direction de la variation)
        const signDeriv = signOnInterval(derivExpr, from, to);
        values.push(signDeriv === '+' ? 'nearrow' : signDeriv === '-' ? 'searrow' : 'nearrow');

        if (i < allCritical.length) {
            const cp = allCritical[i];
            const isDiscontinuity = discontinuities.some(d => Math.abs(d - cp) < 1e-6);

            if (isDiscontinuity) {
                // Valeur interdite : || et limites laterales en Terminale
                if (rules.showLimitsAtInfinity) {
                    const limitLeft = computeLateralLimit(expression, cp, 'left');
                    const limitRight = computeLateralLimit(expression, cp, 'right');
                    values.push(limitLeft, '||', limitRight);
                } else {
                    values.push('||');
                }
            } else {
                // Extremum : f(cp)
                const yCP = evalAt(expression, cp);
                if (yCP !== null) {
                    const yStr = formatForTable(round4(yCP));
                    values.push(yStr);

                    // Enregistrer l'extremum
                    const derivBefore = signOnInterval(derivExpr, from, cp);
                    const derivAfter = i < intervalBounds.length - 1
                        ? signOnInterval(derivExpr, cp, intervalBounds[i + 1][1])
                        : null;
                    if (derivBefore === '+' && derivAfter === '-') {
                        extrema.push({ x: cp, y: yCP, type: 'max' });
                    } else if (derivBefore === '-' && derivAfter === '+') {
                        extrema.push({ x: cp, y: yCP, type: 'min' });
                    }
                } else {
                    values.push('?');
                }
            }
        }
    }

    // Valeur à +∞ (Terminale uniquement)
    if (rules.showLimitsAtInfinity) {
        const limitPlus = computeLimitAtInfinity(expression, '+inf');
        values.push(limitPlus);
    }

    return { label: 'f(x)', type: 'variation', values };
}

// ─────────────────────────────────────────────────────────────
// CALCUL NUMÉRIQUE DES LIMITES
// ─────────────────────────────────────────────────────────────

/**
 * Approximation numérique de lim(x→±∞) f(x)
 */
function computeLimitAtInfinity(expr: string, direction: '-inf' | '+inf'): string {
    const x = direction === '-inf' ? -1e6 : 1e6;
    const y = evalAt(expr, x);

    if (y === null) return direction === '-inf' ? '-inf' : '+inf';
    if (Math.abs(y) > 1e5) return y > 0 ? '+inf' : '-inf';
    if (Math.abs(y) < 1e-4) return '0';

    return formatForTable(round4(y));
}

/**
 * Approximation numérique de lim(x→a⁻) ou lim(x→a⁺) f(x)
 */
function computeLateralLimit(expr: string, a: number, side: 'left' | 'right'): string {
    const epsilon = 1e-4;
    const x = side === 'left' ? a - epsilon : a + epsilon;
    const y = evalAt(expr, x);

    if (y === null) return side === 'left' ? '-inf' : '+inf';
    if (Math.abs(y) > 1e4) return y > 0 ? '+inf' : '-inf';

    return formatForTable(round4(y));
}

// ─────────────────────────────────────────────────────────────
// CONVERSION @@@
// ─────────────────────────────────────────────────────────────

function tableSpecToAAA(spec: TableSpec): string {
    const lines: string[] = ['table'];
    lines.push(`x: ${spec.xValues.join(', ')}`);

    for (const row of spec.rows) {
        const prefix = row.type === 'sign' ? 'sign' : 'variation';
        lines.push(`${prefix}: ${row.label} : ${row.values.join(', ')}`);
    }

    return `@@@\n${lines.join(' |\n')} |\n@@@`;
}
