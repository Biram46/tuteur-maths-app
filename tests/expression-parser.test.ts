/**
 * Tests — lib/math-engine/expression-parser.ts
 * Couverture : sanitizeExpression, evalAt, findZeros, formatForTable, signOnInterval
 */
import { describe, it, expect } from 'vitest';
import {
    sanitizeExpression,
    evalAt,
    findZeros,
    formatForTable,
    signOnInterval,
    computeDerivative,
    buildXValues,
} from '@/lib/math-engine/expression-parser';

// ─── sanitizeExpression ───────────────────────────────────────────────────────

describe('sanitizeExpression', () => {
    it('convertit la multiplication implicite 2x → 2*x', () => {
        expect(sanitizeExpression('2x')).toBe('2*x');
    });

    it('convertit 3x^2 → 3*x^2', () => {
        expect(sanitizeExpression('3x^2')).toBe('3*x^2');
    });

    it('convertit ln( → log( pour mathjs', () => {
        expect(sanitizeExpression('ln(x)')).toBe('log(x)');
    });

    it('ne casse PAS cos(x) en co*s(x) — bug historique', () => {
        const result = sanitizeExpression('cos(x)');
        expect(result).not.toContain('co*s');
        expect(result).toContain('cos');
    });

    it('ne casse PAS sin(x)', () => {
        const result = sanitizeExpression('sin(x)');
        expect(result).not.toContain('si*n');
        expect(result).toContain('sin');
    });

    it('ne casse PAS sqrt(x)', () => {
        const result = sanitizeExpression('sqrt(x)');
        expect(result).not.toContain('sqr*t');
        expect(result).toContain('sqrt');
    });

    it('convertit la notation Unicode ² → ^2', () => {
        expect(sanitizeExpression('x²')).toBe('x^2');
    });

    it('convertit ³ → ^3', () => {
        expect(sanitizeExpression('x³')).toBe('x^3');
    });

    it('convertit eˣ → e^(x)', () => {
        expect(sanitizeExpression('eˣ')).toContain('e^(x)');
    });

    it('convertit √(x+1) → sqrt(x+1)', () => {
        expect(sanitizeExpression('√(x+1)')).toBe('sqrt(x+1)');
    });

    it('convertit la virgule décimale française → point', () => {
        expect(sanitizeExpression('2,5*x')).toBe('2.5*x');
    });

    it('convertit \\frac{a}{b} → (a)/(b)', () => {
        expect(sanitizeExpression('\\frac{x+1}{x-1}')).toContain('(x+1)/(x-1)');
    });

    it('convertit )( → )*( pour la multiplication implicite', () => {
        expect(sanitizeExpression('(x+1)(x-1)')).toBe('(x+1)*(x-1)');
    });
});

// ─── evalAt ──────────────────────────────────────────────────────────────────

describe('evalAt', () => {
    it('évalue x^2 en x=3 → 9', () => {
        expect(evalAt('x^2', 3)).toBeCloseTo(9);
    });

    it('évalue 2*x+1 en x=2 → 5', () => {
        expect(evalAt('2*x+1', 2)).toBeCloseTo(5);
    });

    it('retourne null pour 1/(x) en x=0', () => {
        expect(evalAt('1/(x)', 0)).toBeNull();
    });

    it('évalue log(x) en x=1 → 0 (ln(1)=0)', () => {
        expect(evalAt('log(x)', 1)).toBeCloseTo(0);
    });

    it('retourne null pour log(x) en x=-1 (hors domaine)', () => {
        expect(evalAt('log(x)', -1)).toBeNull();
    });

    it('évalue sqrt(x) en x=4 → 2', () => {
        expect(evalAt('sqrt(x)', 4)).toBeCloseTo(2);
    });

    it('retourne null pour sqrt(x) en x=-1 (hors domaine)', () => {
        expect(evalAt('sqrt(x)', -1)).toBeNull();
    });
});

// ─── findZeros ───────────────────────────────────────────────────────────────

describe('findZeros', () => {
    it('trouve le zéro de x en 0', () => {
        const zeros = findZeros('x');
        expect(zeros).toHaveLength(1);
        expect(zeros[0]).toBeCloseTo(0, 2);
    });

    it('trouve les zéros de x^2-4 en ±2', () => {
        const zeros = findZeros('x^2-4');
        expect(zeros).toHaveLength(2);
        expect(zeros[0]).toBeCloseTo(-2, 1);
        expect(zeros[1]).toBeCloseTo(2, 1);
    });

    it('trouve les zéros de (x-1)*(x+3) en -3 et 1', () => {
        const zeros = findZeros('(x-1)*(x+3)');
        expect(zeros).toHaveLength(2);
        expect(zeros[0]).toBeCloseTo(-3, 1);
        expect(zeros[1]).toBeCloseTo(1, 1);
    });

    it('trouve le zéro de 2*x+6 en -3', () => {
        const zeros = findZeros('2*x+6');
        expect(zeros).toHaveLength(1);
        expect(zeros[0]).toBeCloseTo(-3, 1);
    });

    it('retourne [] pour une constante (pas de zéro)', () => {
        const zeros = findZeros('5');
        expect(zeros).toHaveLength(0);
    });

    it('antifreeze : retourne [] si bruit numérique (f(x) ≈ 0 partout)', () => {
        // On simule une constante quasi-nulle — MAX_ZEROS serait atteint
        // On teste l'invariant : findZeros ne doit pas retourner 20+ zéros
        const zeros = findZeros('0.000000001*x');
        expect(zeros.length).toBeLessThan(20);
    });

    it('retourne les zéros triés par ordre croissant', () => {
        const zeros = findZeros('(x-3)*(x+1)*(x-1)');
        expect(zeros).toEqual([...zeros].sort((a, b) => a - b));
    });
});

// ─── formatForTable ──────────────────────────────────────────────────────────

describe('formatForTable', () => {
    it('formate un entier → string sans décimale', () => {
        expect(formatForTable(2)).toBe('2');
        expect(formatForTable(-5)).toBe('-5');
        expect(formatForTable(0)).toBe('0');
    });

    it('formate 0.5 → "1/2"', () => {
        expect(formatForTable(0.5)).toBe('1/2');
    });

    it('formate -0.5 → "-1/2"', () => {
        expect(formatForTable(-0.5)).toBe('-1/2');
    });

    it('formate 1/3 ≈ 0.3333 → "1/3"', () => {
        expect(formatForTable(1 / 3)).toBe('1/3');
    });

    it('formate 2/3 ≈ 0.6667 → "2/3"', () => {
        expect(formatForTable(2 / 3)).toBe('2/3');
    });

    it('détecte π', () => {
        expect(formatForTable(Math.PI)).toBe('π');
    });

    it('détecte -π', () => {
        expect(formatForTable(-Math.PI)).toBe('-π');
    });

    it('détecte π/2', () => {
        expect(formatForTable(Math.PI / 2)).toBe('π/2');
    });

    it('détecte e (constante de Neper)', () => {
        expect(formatForTable(Math.E)).toBe('e');
    });

    it('formate un nombre quelconque à 2 décimales', () => {
        expect(formatForTable(1.23456)).toBe('1.23');
    });
});

// ─── signOnInterval ───────────────────────────────────────────────────────────

describe('signOnInterval', () => {
    it('x est positif sur (0, +∞)', () => {
        expect(signOnInterval('x', 0, '+inf')).toBe('+');
    });

    it('x est négatif sur (-∞, 0)', () => {
        expect(signOnInterval('x', '-inf', 0)).toBe('-');
    });

    it('x^2+1 est toujours positif', () => {
        expect(signOnInterval('x^2+1', '-inf', '+inf')).toBe('+');
    });

    it('-(x^2+1) est toujours négatif', () => {
        expect(signOnInterval('-(x^2+1)', '-inf', '+inf')).toBe('-');
    });

    it('(x-1) est positif sur (1, +∞)', () => {
        expect(signOnInterval('(x-1)', 1, '+inf')).toBe('+');
    });

    it('(x-1) est négatif sur (-∞, 1)', () => {
        expect(signOnInterval('(x-1)', '-inf', 1)).toBe('-');
    });
});

// ─── computeDerivative ───────────────────────────────────────────────────────

describe('computeDerivative', () => {
    it('dérive x^2 → 2*x', () => {
        const d = computeDerivative('x^2');
        // Can be "2 * x" or "2*x" depending on mathjs simplify
        const evaluated = evalAt(d, 3);
        expect(evaluated).toBeCloseTo(6); // 2*3 = 6
    });

    it('dérive 3*x^2+2*x+1 → 6*x+2', () => {
        const d = computeDerivative('3*x^2+2*x+1');
        expect(evalAt(d, 0)).toBeCloseTo(2);   // 6*0+2 = 2
        expect(evalAt(d, 1)).toBeCloseTo(8);   // 6*1+2 = 8
    });

    it('dérive x^3 → quelque chose de cohérent (x=2 → 12)', () => {
        const d = computeDerivative('x^3');
        expect(evalAt(d, 2)).toBeCloseTo(12);  // 3*4 = 12
    });

    it('retourne une string non vide pour log(x)', () => {
        const d = computeDerivative('log(x)');
        expect(d.length).toBeGreaterThan(0);
    });
});

// ─── buildXValues ─────────────────────────────────────────────────────────────

describe('buildXValues', () => {
    it('encadre toujours par -inf et +inf', () => {
        const vals = buildXValues([-2, 0, 3]);
        expect(vals[0]).toBe('-inf');
        expect(vals[vals.length - 1]).toBe('+inf');
    });

    it('formate correctement les points critiques', () => {
        const vals = buildXValues([0.5, 2]);
        expect(vals).toContain('1/2');
        expect(vals).toContain('2');
    });

    it('fonctionne avec un tableau vide → juste -inf et +inf', () => {
        const vals = buildXValues([]);
        expect(vals).toEqual(['-inf', '+inf']);
    });
});
