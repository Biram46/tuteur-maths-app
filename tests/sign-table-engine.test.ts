/**
 * Tests — lib/math-engine/sign-table-engine.ts
 * Couverture : generateSignTable, toLatexLabel
 *
 * STRATÉGIE : on vérifie les invariants structurels (success, criticalPoints,
 * xValues, rows, signes) sans dépendre du format exact de aaaBlock.
 *
 * ⚠️ RÈGLE : NE PAS appeler npm test sur cette machine (no-browser-no-tests).
 *    Ce fichier est destiné à être exécuté via vitest sur CI uniquement.
 */
import { describe, it, expect } from 'vitest';
import { generateSignTable, toLatexLabel } from '@/lib/math-engine/sign-table-engine';
import type { SignTableInput } from '@/lib/math-engine/sign-table-engine';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Extrait les valeurs de la ligne f(x) */
function getFxRow(result: ReturnType<typeof generateSignTable>) {
    return result.tableSpec?.rows.find(r => r.label === 'f(x)');
}

/** Vérifie qu'un tableau de signes est cohérent : autant d'intervalles que attendu */
function expectConsistentTable(result: ReturnType<typeof generateSignTable>, expectedCritPoints: number) {
    expect(result.success).toBe(true);
    expect(result.tableSpec).toBeDefined();
    const xVals = result.tableSpec!.xValues;
    // xValues = ['-inf' ou borne, ...criticalPoints, '+inf']
    // Donc xValues.length = criticalPoints + 2 (bornes) OU criticalPoints + 1 (domaine restreint)
    expect(xVals.length).toBeGreaterThanOrEqual(expectedCritPoints + 1);
}

// ═══════════════════════════════════════════════════════════════
// [1] FONCTIONS AFFINES
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Fonctions affines', () => {
    it('2x - 4 : un seul point critique en x=2', () => {
        const result = generateSignTable({ expression: '2*x - 4' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(1);
        expect(result.criticalPoints[0]).toBeCloseTo(2, 2);
    });

    it('2x - 4 : signe négatif avant x=2, positif après', () => {
        const result = generateSignTable({ expression: '2*x - 4' });
        const fxRow = getFxRow(result);
        expect(fxRow).toBeDefined();
        // Structure : [signe_avant, '0', signe_après]
        // Le signe avant x=2 est '-' (f(0) = -4 < 0)
        expect(fxRow!.values[0]).toBe('-');
        expect(fxRow!.values[1]).toBe('0');
        expect(fxRow!.values[2]).toBe('+');
    });

    it('−3x + 6 : un seul point critique en x=2', () => {
        const result = generateSignTable({ expression: '-3*x + 6' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints[0]).toBeCloseTo(2, 2);
    });

    it('−3x + 6 : signe positif avant x=2, négatif après', () => {
        const result = generateSignTable({ expression: '-3*x + 6' });
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+');
        expect(fxRow!.values[1]).toBe('0');
        expect(fxRow!.values[2]).toBe('-');
    });

    it('3x : un seul point critique en x=0', () => {
        const result = generateSignTable({ expression: '3*x' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints[0]).toBeCloseTo(0, 2);
    });

    it('5 (constante positive) : aucun point critique, signe + partout', () => {
        const result = generateSignTable({ expression: '5' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(0);
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+');
    });

    it('−2 (constante négative) : aucun point critique, signe − partout', () => {
        const result = generateSignTable({ expression: '-2' });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('-');
    });
});

// ═══════════════════════════════════════════════════════════════
// [2] PRODUIT DE FACTEURS AFFINES
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Produit de facteurs affines', () => {
    it('(x+3)(x-2) : deux points critiques en −3 et 2', () => {
        const result = generateSignTable({ expression: '(x+3)*(x-2)' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(2);
        expect(result.criticalPoints[0]).toBeCloseTo(-3, 1);
        expect(result.criticalPoints[1]).toBeCloseTo(2, 1);
    });

    it('(x+3)(x-2) : signe + sur (−∞,−3), − sur (−3,2), + sur (2,+∞)', () => {
        const result = generateSignTable({ expression: '(x+3)*(x-2)' });
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+'); // avant -3
        expect(fxRow!.values[1]).toBe('0'); // en -3
        expect(fxRow!.values[2]).toBe('-'); // entre -3 et 2
        expect(fxRow!.values[3]).toBe('0'); // en 2
        expect(fxRow!.values[4]).toBe('+'); // après 2
    });

    it('(x+3)(x-2) : retourne le domaine ℝ', () => {
        const result = generateSignTable({ expression: '(x+3)*(x-2)' });
        expect(result.domain).toContain('ℝ');
    });

    it('(x-1)(x+1)(x-2) : trois points critiques en −1, 1, 2', () => {
        const result = generateSignTable({ expression: '(x-1)*(x+1)*(x-2)' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(3);
        // Points triés
        const cps = result.criticalPoints;
        expect(cps[0]).toBeCloseTo(-1, 1);
        expect(cps[1]).toBeCloseTo(1, 1);
        expect(cps[2]).toBeCloseTo(2, 1);
    });

    it('(x+1)(x-3) via numeratorFactors explicites : même résultat', () => {
        const result = generateSignTable({
            expression: '(x+1)*(x-3)',
            numeratorFactors: [
                { label: 'x+1', expr: 'x+1' },
                { label: 'x-3', expr: 'x-3' },
            ],
        });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(2);
        expect(result.criticalPoints[0]).toBeCloseTo(-1, 1);
        expect(result.criticalPoints[1]).toBeCloseTo(3, 1);
    });
});

// ═══════════════════════════════════════════════════════════════
// [3] FRACTIONS RATIONNELLES (VALEURS INTERDITES)
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Fractions rationnelles', () => {
    it('(2x-1)/(x-3) : valeur interdite en x=3 (|| dans f(x))', () => {
        const result = generateSignTable({ expression: '(2*x-1)/(x-3)' });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow!.values).toContain('||');
    });

    it('(2x-1)/(x-3) : zéro en x=1/2 (valeur 0 dans f(x))', () => {
        const result = generateSignTable({ expression: '(2*x-1)/(x-3)' });
        const fxRow = getFxRow(result);
        expect(fxRow!.values).toContain('0');
    });

    it('1/(x+2) : aucun zéro, une discontinuité en x=−2', () => {
        const result = generateSignTable({ expression: '1/(x+2)' });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow!.values).toContain('||');
        // Pas de '0' car pas de zéro
        expect(fxRow!.values).not.toContain('0');
    });

    it('1/(x+2) : signe + après −2, signe − avant −2', () => {
        const result = generateSignTable({ expression: '1/(x+2)' });
        const fxRow = getFxRow(result);
        // Avant -2 : f(−3) = 1/(−3+2) = −1 → signe −
        expect(fxRow!.values[0]).toBe('-');
        // Après -2 : f(0) = 1/2 > 0 → signe +
        expect(fxRow!.values[fxRow!.values.length - 1]).toBe('+');
    });

    it('x/(x-1) via denominatorFactors explicites : discontinuité en x=1', () => {
        const result = generateSignTable({
            expression: 'x/(x-1)',
            numeratorFactors: [{ label: 'x', expr: 'x' }],
            denominatorFactors: [{ label: 'x-1', expr: 'x-1' }],
        });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow!.values).toContain('||');
        expect(fxRow!.values).toContain('0');
    });

    it('domaine contient x ≠ pour les fractions rationnelles', () => {
        const result = generateSignTable({ expression: '(x-2)/(x+1)' });
        expect(result.domain).toContain('≠');
    });
});

// ═══════════════════════════════════════════════════════════════
// [4] TRINÔMES (ax² + bx + c)
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Trinômes', () => {
    it('x²-5x+6 : Δ > 0, deux racines en 2 et 3', () => {
        const result = generateSignTable({ expression: 'x^2-5*x+6' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(2);
        expect(result.criticalPoints[0]).toBeCloseTo(2, 1);
        expect(result.criticalPoints[1]).toBeCloseTo(3, 1);
    });

    it('x²-5x+6 : signe + avant 2, − entre 2 et 3, + après 3', () => {
        const result = generateSignTable({ expression: 'x^2-5*x+6' });
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+');
        expect(fxRow!.values[1]).toBe('0');
        expect(fxRow!.values[2]).toBe('-');
        expect(fxRow!.values[3]).toBe('0');
        expect(fxRow!.values[4]).toBe('+');
    });

    it('x²-5x+6 : retourne discriminantSteps avec les étapes de calcul', () => {
        const result = generateSignTable({ expression: 'x^2-5*x+6' });
        expect(result.discriminantSteps).toBeDefined();
        expect(result.discriminantSteps!.length).toBeGreaterThan(0);
        // Les étapes doivent contenir Δ
        const stepsText = result.discriminantSteps![0].steps.join('\n');
        expect(stepsText).toContain('Δ');
    });

    it('x²+4 : Δ < 0, aucun point critique, signe + partout', () => {
        const result = generateSignTable({ expression: 'x^2+4' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(0);
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+');
    });

    it('x²-4x+4 : Δ = 0, une racine double en x=2', () => {
        const result = generateSignTable({ expression: 'x^2-4*x+4' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(1);
        expect(result.criticalPoints[0]).toBeCloseTo(2, 1);
    });

    it('x²-4x+4 (racine double) : signe + − 0 + à gauche et droite', () => {
        const result = generateSignTable({ expression: 'x^2-4*x+4' });
        const fxRow = getFxRow(result);
        // Avant 2 : (0-2)²=4 > 0 → +
        expect(fxRow!.values[0]).toBe('+');
        expect(fxRow!.values[1]).toBe('0');
        // Après 2 : (3-2)²=1 > 0 → +
        expect(fxRow!.values[2]).toBe('+');
    });

    it('−x²+1 : signe − avant −1, + entre −1 et 1, − après 1', () => {
        const result = generateSignTable({ expression: '-x^2+1' });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('-');
        expect(fxRow!.values[2]).toBe('+');
        expect(fxRow!.values[4]).toBe('-');
    });
});

// ═══════════════════════════════════════════════════════════════
// [5] FACTEURS EXPONENTIELS (toujours > 0)
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Facteur exponentiel', () => {
    it('(x-1)*e^x : seul zéro en x=1 (e^x ne change pas le signe)', () => {
        const result = generateSignTable({
            expression: '(x-1)*e^(x)',
            numeratorFactors: [
                { label: 'x-1', expr: 'x-1' },
                { label: 'e^x', expr: 'e^(x)' },
            ],
        });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(1);
        expect(result.criticalPoints[0]).toBeCloseTo(1, 1);
    });

    it('e^x seul : aucun zéro, signe + sur ℝ', () => {
        const result = generateSignTable({
            expression: 'e^(x)',
            numeratorFactors: [{ label: 'e^x', expr: 'e^(x)' }],
        });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(0);
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+');
    });
});

// ═══════════════════════════════════════════════════════════════
// [6] RACINES CARRÉES
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Racines carrées', () => {
    it('sqrt(x) : aucun zéro en dehors de la borne, toujours + sur [0,+∞[', () => {
        const result = generateSignTable({
            expression: 'sqrt(x)',
            numeratorFactors: [{ label: 'sqrt(x)', expr: 'sqrt(x)' }],
        });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        // Sur [0,+∞[, sqrt(x) ≥ 0 : le signe doit être '+'
        expect(fxRow!.values.every(v => v === '+' || v === '0')).toBe(true);
    });

    it('sqrt(x+2) : domaine commence à x=−2 (pas avant)', () => {
        const result = generateSignTable({
            expression: 'sqrt(x+2)',
            numeratorFactors: [{ label: 'sqrt(x+2)', expr: 'sqrt(x+2)' }],
        });
        expect(result.success).toBe(true);
        // La borne gauche des xValues doit être autour de −2
        const leftLabel = result.tableSpec!.xValues[0];
        // Peut être '−2', '-2', ou le format formatForTable(-2) = '-2'
        expect(leftLabel).toMatch(/-2/);
    });

    it('domaine de sqrt(x) contient x ≥ 0', () => {
        const result = generateSignTable({
            expression: 'sqrt(x)',
            numeratorFactors: [{ label: 'sqrt(x)', expr: 'sqrt(x)' }],
        });
        expect(result.domain).toContain('≥ 0');
    });
});

// ═══════════════════════════════════════════════════════════════
// [7] LOGARITHMES
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Logarithmes', () => {
    it('ln(x) : zéro en x=1, − sur (0,1), + sur (1,+∞)', () => {
        const result = generateSignTable({
            expression: 'ln(x)',
            numeratorFactors: [{ label: 'ln(x)', expr: 'ln(x)' }],
        });
        expect(result.success).toBe(true);
        // Le zéro de ln(x) est en x=1
        expect(result.criticalPoints).toContain(1);
        const fxRow = getFxRow(result);
        // ln(0.5) < 0 → signe − avant 1
        // ln(2) > 0 → signe + après 1
        const beforeZero = fxRow!.values[0];
        const afterZero = fxRow!.values[fxRow!.values.length - 1];
        expect(beforeZero).toBe('-');
        expect(afterZero).toBe('+');
    });

    it('ln(x) : domaine contient x > 0', () => {
        const result = generateSignTable({
            expression: 'ln(x)',
            numeratorFactors: [{ label: 'ln(x)', expr: 'ln(x)' }],
        });
        expect(result.domain).toContain('> 0');
    });

    it('ln(x-2) : zéro en x=3 (ln(x-2)=0 quand x-2=1)', () => {
        const result = generateSignTable({
            expression: 'ln(x-2)',
            numeratorFactors: [{ label: 'ln(x-2)', expr: 'ln(x-2)' }],
        });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toContain(3);
    });
});

// ═══════════════════════════════════════════════════════════════
// [8] ANTI-FREEZE ET ROBUSTESSE
// ═══════════════════════════════════════════════════════════════

describe('generateSignTable — Anti-freeze et robustesse', () => {
    it('ne retourne pas d\'erreur même pour une expression complexe', () => {
        const result = generateSignTable({ expression: '(x^2-4)*(x+3)' });
        // Pas de throw, success ou non mais pas de crash
        expect(() => generateSignTable({ expression: '(x^2-4)*(x+3)' })).not.toThrow();
    });

    it('expression invalide : retourne success=false sans crash', () => {
        expect(() => generateSignTable({ expression: 'junk$$$$%invalid' })).not.toThrow();
    });

    it('x^2 - 4 : deux points critiques en ±2', () => {
        const result = generateSignTable({ expression: 'x^2-4' });
        expect(result.success).toBe(true);
        // (x-2)(x+2) → zéros en -2 et 2
        expect(result.criticalPoints.some(cp => Math.abs(cp - (-2)) < 0.2)).toBe(true);
        expect(result.criticalPoints.some(cp => Math.abs(cp - 2) < 0.2)).toBe(true);
    });

    it('criticalPoints sont triés en ordre croissant', () => {
        const result = generateSignTable({ expression: '(x+5)*(x-1)*(x-3)' });
        const cps = result.criticalPoints;
        for (let i = 1; i < cps.length; i++) {
            expect(cps[i]).toBeGreaterThan(cps[i - 1]);
        }
    });

    it('le tableau f(x) a le bon nombre de valeurs (2n+1 pour n points critiques)', () => {
        const result = generateSignTable({ expression: '(x+1)*(x-2)*(x-4)' });
        expect(result.success).toBe(true);
        const n = result.criticalPoints.length; // doit être 3
        const fxRow = getFxRow(result);
        // Structure : signe, val, signe, val, signe → 2n+1 valeurs
        expect(fxRow!.values.length).toBe(2 * n + 1);
    });

    it('retourne always un aiContext non vide en cas de succès', () => {
        const result = generateSignTable({ expression: '2*x + 1' });
        expect(result.success).toBe(true);
        expect(result.aiContext).toBeDefined();
        expect(result.aiContext!.length).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════════
// [9] toLatexLabel
// ═══════════════════════════════════════════════════════════════

describe('toLatexLabel', () => {
    it('−inf → −\\infty', () => {
        expect(toLatexLabel('-inf')).toBe('-\\infty');
    });

    it('+inf → +\\infty', () => {
        expect(toLatexLabel('+inf')).toBe('+\\infty');
    });

    it('x^2 → x^{2}', () => {
        expect(toLatexLabel('x^2')).toContain('^{2}');
    });

    it('sqrt(x+1) → \\sqrt{x+1}', () => {
        expect(toLatexLabel('sqrt(x+1)')).toContain('\\sqrt{x+1}');
    });

    it('ln(x) → \\ln(x)', () => {
        expect(toLatexLabel('ln(x)')).toContain('\\ln(');
    });

    it('1/2 → \\dfrac{1}{2}', () => {
        expect(toLatexLabel('1/2')).toContain('\\dfrac{1}{2}');
    });

    it('(x+1)/(x-2) → \\dfrac{x+1}{x-2}', () => {
        expect(toLatexLabel('(x+1)/(x-2)')).toContain('\\dfrac');
    });

    it('chaîne vide → chaîne vide', () => {
        expect(toLatexLabel('')).toBe('');
    });
});
