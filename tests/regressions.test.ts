/**
 * Tests — Robustesse du moteur mathématique (bugs historiques)
 *
 * Cette suite de tests documente les bugs critiques qui ont été corrigés
 * et garantit qu'ils ne régressent pas.
 *
 * Chaque test indique la référence au bug dans debugging_history.md
 */
import { describe, it, expect } from 'vitest';
import {
    sanitizeExpression,
    evalAt,
    findZeros,
    signOnInterval,
} from '@/lib/math-engine/expression-parser';
import { fixLatexContent } from '@/lib/latex-fixer';

// ─── Bug #8.3 : "co*s bug" — cos(x) ne doit pas être splitté ────────────────

describe('Régression #8.3 — cos(x) Splitting Bug', () => {
    it('cos(x) : sanitize ne produit pas co*s(x)', () => {
        const result = sanitizeExpression('cos(x)');
        expect(result).not.toContain('co*s');
    });

    it('cos(x) est évaluable (evalAt ne retourne pas null)', () => {
        expect(evalAt('cos(x)', 0)).toBeCloseTo(1);       // cos(0) = 1
        expect(evalAt('cos(x)', Math.PI)).toBeCloseTo(-1); // cos(π) = -1
    });

    it('sin(x) : idem — pas de si*n(x)', () => {
        const result = sanitizeExpression('sin(x)');
        expect(result).not.toContain('si*n');
        expect(evalAt('sin(x)', 0)).toBeCloseTo(0);
    });

    it('tan(x) : idem — pas de ta*n(x)', () => {
        const result = sanitizeExpression('tan(x)');
        expect(result).not.toContain('ta*n');
    });

    it('sqrt(x) : idem — pas de sqr*t(x)', () => {
        const result = sanitizeExpression('sqrt(x)');
        expect(result).not.toContain('sqr*t');
        expect(evalAt('sqrt(x)', 4)).toBeCloseTo(2);
    });
});

// ─── Bug #7.4 : "Infinite Arrow" — findZeros ne s'emballe pas ───────────────

describe('Régression #7.4 — Anti-Freeze : findZeros', () => {
    it('retourne moins de 20 zéros pour toute expression (cap MAX_ZEROS)', () => {
        const expressions = [
            'x^2 - 4',
            '(x-1)*(x+1)*(x-2)',
            'sin(x)',
            'x^3 - 3*x',
            '2*x + 1',
        ];
        for (const expr of expressions) {
            const zeros = findZeros(expr);
            expect(zeros.length).toBeLessThan(20);
        }
    });

    it('retourne [] pour bruit numérique (dérivée quasi-nulle)', () => {
        // Si f'(x) ≈ 0 partout, findZeros doit retourner [] et non des centaines de faux zéros
        // On simule avec une constante quasi-nulle
        const zeros = findZeros('1e-12');
        expect(zeros.length).toBe(0);
    });

    it('les zéros trouvés sont triés en ordre croissant', () => {
        const zeros = findZeros('(x+3)*(x-1)*(x-5)');
        for (let i = 1; i < zeros.length; i++) {
            expect(zeros[i]).toBeGreaterThan(zeros[i - 1]);
        }
    });

    it('zéros dédupliqués : pas deux zéros à moins de 0.05 d\'écart', () => {
        const zeros = findZeros('x^2');
        // x=0 est un zéro double, il ne doit apparaître qu'une fois
        for (let i = 1; i < zeros.length; i++) {
            expect(Math.abs(zeros[i] - zeros[i - 1])).toBeGreaterThan(0.04);
        }
    });
});

// ─── Bug #7.3 : Signe incorrect sur fractions rationnelles ──────────────────

describe('Régression #7.3 — Signe des fonctions rationnelles', () => {
    it('(2x-1)/(x-3) est positif sur (3, +∞)', () => {
        // f(4) = (8-1)/(4-3) = 7/1 = 7 > 0
        expect(signOnInterval('(2*x-1)/(x-3)', 3, '+inf')).toBe('+');
    });

    it('(2x-1)/(x-3) est négatif sur (1/2, 3)', () => {
        // f(1) = (2-1)/(1-3) = 1/(-2) = -0.5 < 0
        expect(signOnInterval('(2*x-1)/(x-3)', 0.5, 3)).toBe('-');
    });

    it('x/(x+1) est négatif sur (-1, 0)', () => {
        // f(-0.5) = -0.5/0.5 = -1 < 0
        expect(signOnInterval('x/(x+1)', -1, 0)).toBe('-');
    });

    it('x/(x+1) est positif sur (0, +∞)', () => {
        // f(1) = 1/2 > 0
        expect(signOnInterval('x/(x+1)', 0, '+inf')).toBe('+');
    });
});

// ─── Bug #11 / #21 : LaTeX Streaming — délimiteurs IA ───────────────────────

describe('Régression #11 — Streaming LaTeX', () => {
    it('fixLatexContent convertit \\( \\) en temps réel', () => {
        // Simule un chunk partiel de streaming IA
        const chunk = 'La solution est \\(x = \\frac{-b}{2a}\\) selon le discriminant';
        const result = fixLatexContent(chunk);
        expect(result.content).toContain('$x = \\frac{-b}{2a}$');
        expect(result.content).not.toContain('\\(');
        expect(result.content).not.toContain('\\)');
    });

    it('fixLatexContent convertit \\[ \\] (display math)', () => {
        const chunk = 'Voici : \\[\\Delta = b^2 - 4ac\\]';
        const result = fixLatexContent(chunk);
        expect(result.content).toContain('$$\\Delta = b^2 - 4ac$$');
    });

    it('ne casse pas les $ déjà présents', () => {
        const chunk = 'Déjà correct : $x^2 + 1 = 0$';
        const result = fixLatexContent(chunk);
        expect(result.content).toBe('Déjà correct : $x^2 + 1 = 0$');
    });

    it('fixe les doubles backslashes produits par certains LLM', () => {
        const chunk = '$\\\\frac{1}{2}$';
        const result = fixLatexContent(chunk);
        expect(result.content).toContain('\\frac{1}{2}');
        expect(result.content).not.toContain('\\\\frac');
    });
});

// ─── Bug #4.1 — Routing isMultiExpr faux positifs ───────────────────────────

describe('Régression #4.1 — isMultiExpr regex', () => {
    // Le regex actuel dans useMathRouter.ts est :
    // /(?:^|[\n;])\s*\d+\s*[).]\s+[\s\S]*(?:\n|;)\s*\d+\s*[).]\s+/
    // On vérifie qu'une expression avec des parenthèses numérotées
    // ne déclenche PAS un faux positif dans les cas simples.

    const isMultiExpr = (text: string) =>
        /(?:^|[\n;])\s*\d+\s*[).]\s+[\s\S]*(?:\n|;)\s*\d+\s*[).]\s+/.test(text);

    it('(3x+2)(7x-1) sur une seule ligne n\'est PAS multi-questions', () => {
        // L'expression sur une seule ligne ne doit pas déclencher isMultiExpr
        expect(isMultiExpr('Tableau de signes de (3x+2)(7x-1)/(2x-1)')).toBe(false);
    });

    it('exercise numéroté sur plusieurs lignes EST multi-questions', () => {
        const multiQ = '1) Étudier le signe de f\n2) Résoudre f(x) >= 0';
        expect(isMultiExpr(multiQ)).toBe(true);
    });

    it('questions numérotées avec point EST multi-questions', () => {
        const multiQ = '1. Calculer f\'(x)\n2. Dresser le tableau de variations';
        expect(isMultiExpr(multiQ)).toBe(true);
    });
});

// ─── Stabilité numérique : évaluation aux bornes infinies ───────────────────

describe('Stabilité numérique — bornes infinies', () => {
    it('signOnInterval utilise ±100 plutôt que ±1e6 (fractions rationnelles)', () => {
        // Pour (2x-1)/(x-3), à x=1e6, f'→0 et le signe devient détectable
        // Avec la correction ±100, le signe est correct
        const sign = signOnInterval('(2*x-1)/(x-3)', 3, '+inf');
        expect(sign).toBe('+'); // > 0 sur (3, +∞)
        expect(sign).not.toBeNull();
    });

    it('evalAt retourne null pour une division par 0 (pas un crash)', () => {
        expect(() => evalAt('1/x', 0)).not.toThrow();
        expect(evalAt('1/x', 0)).toBeNull();
    });

    it('evalAt retourne null pour sqrt(-1) (pas un crash)', () => {
        expect(() => evalAt('sqrt(x)', -1)).not.toThrow();
        expect(evalAt('sqrt(x)', -1)).toBeNull();
    });

    it('evalAt retourne null pour log(0) (pas un crash)', () => {
        expect(() => evalAt('log(x)', 0)).not.toThrow();
        // log(0) = -∞, pas fini → null
        expect(evalAt('log(x)', 0)).toBeNull();
    });
});
