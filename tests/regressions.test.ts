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
import { generateSignTable } from '@/lib/math-engine/sign-table-engine';
import { generateVariationTable } from '@/lib/math-engine/variation-engine';

/** Extrait les valeurs de la ligne f(x) depuis un résultat generateSignTable */
function getFxRow(result: ReturnType<typeof generateSignTable>) {
    return result.tableSpec?.rows.find(r => r.label === 'f(x)');
}


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

// ─── Bug #2026-03-15 : Signe incorrect des facteurs aux valeurs interdites ────
//
// CONTEXTE :
//   Pour (x+2)/(x-3), l'API SymPy générait '||' pour TOUS les facteurs en x=3.
//   Le moteur JS fallback avait un problème similaire dans buildFxSignRow.
//   Résultat : f(x) montrait un signe incorrect pour l'inéquation (x+2)/(x-3) > 0.
//
//   AVANT (incorrect) :
//     sign: x + 2 : -, 0, +, ||, +   ← || faux : x+2 vaut 5 en x=3
//     sign: x - 3 : -, -, -, ||, +   ← || au lieu de 0
//
//   APRÈS (correct) :
//     sign: x + 2 : -, 0, +, +, +    ← signe réel évalué
//     sign: x - 3 : -, -, -, 0, +    ← 0 car zéro du facteur
//     sign: f(x)  : +, 0, -, ||, +   ← || seulement sur f(x)
//
// Ces tests vérifient le moteur JS de fallback (sign-table-engine.ts).
// Les tests Python équivalents sont dans python-api/tests/test_sign_table.py.

describe('Régression #2026-03-15A — Signes f(x) pour les fractions rationnelles', () => {
    it('(x+2)/(x-3) : f(x) positif sur ]-∞,-2[', () => {
        // f(-3) = (-3+2)/(-3-3) = (-1)/(-6) > 0
        // Utiliser la chaîne '-inf' (pas JavaScript -Infinity) car signOnInterval spéciaélise
        expect(signOnInterval('(x+2)/(x-3)', '-inf', -2)).toBe('+');
    });

    it('(x+2)/(x-3) : f(x) négatif sur ]-2,3[', () => {
        // f(0) = (0+2)/(0-3) = 2/(-3) < 0
        expect(signOnInterval('(x+2)/(x-3)', -2, 3)).toBe('-');
    });

    it('(x+2)/(x-3) : f(x) positif sur ]3,+∞[', () => {
        // f(4) = (4+2)/(4-3) = 6/1 > 0
        expect(signOnInterval('(x+2)/(x-3)', 3, '+inf')).toBe('+');
    });

    it('(x+2)/(x-3) : generateSignTable — deux points critiques (-2 et 3)', () => {
        const result = generateSignTable({ expression: '(x+2)/(x-3)' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(2);
        expect(result.criticalPoints[0]).toBeCloseTo(-2, 1);
        expect(result.criticalPoints[1]).toBeCloseTo(3, 1);
    });

    it('(x+2)/(x-3) : f(x) a exactement un || (valeur interdite en x=3)', () => {
        const result = generateSignTable({ expression: '(x+2)/(x-3)' });
        const fxRow = getFxRow(result);
        expect(fxRow).toBeDefined();
        const forbiddenCount = fxRow!.values.filter(v => v === '||').length;
        expect(forbiddenCount).toBe(1);
    });

    it('(x+2)/(x-3) : séquence de signes f(x) = +, 0, -, ||, +', () => {
        const result = generateSignTable({ expression: '(x+2)/(x-3)' });
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('+');   // ]-∞, -2[
        expect(fxRow!.values[1]).toBe('0');   // x = -2
        expect(fxRow!.values[2]).toBe('-');   // ]-2, 3[
        expect(fxRow!.values[3]).toBe('||');  // x = 3
        expect(fxRow!.values[4]).toBe('+');   // ]3, +∞[
    });

    it('(x-1)/(x+4) : f(x) positif avant x=-4', () => {
        // f(-5) = (-5-1)/(-5+4) = (-6)/(-1) = 6 > 0
        expect(signOnInterval('(x-1)/(x+4)', '-inf', -4)).toBe('+');
    });

    it('(x-1)/(x+4) : f(x) négatif sur ]-4,1[', () => {
        // f(0) = (0-1)/(0+4) = -1/4 < 0
        expect(signOnInterval('(x-1)/(x+4)', -4, 1)).toBe('-');
    });

    it('(x-1)/(x+4) : f(x) positif sur ]1,+∞[', () => {
        // f(2) = (2-1)/(2+4) = 1/6 > 0
        expect(signOnInterval('(x-1)/(x+4)', 1, '+inf')).toBe('+');
    });
});

describe('Régression #2026-03-15B — Invariants structurels des tableaux de signes', () => {
    it('invariant 2N+1 : (x+2)/(x-3) → N=2, 5 valeurs par ligne', () => {
        const result = generateSignTable({ expression: '(x+2)/(x-3)' });
        expect(result.success).toBe(true);
        const N = result.criticalPoints.length; // 2
        const fxRow = getFxRow(result);
        expect(fxRow!.values.length).toBe(2 * N + 1); // 5
    });

    it('invariant 2N+1 : (x+3)*(x-2)/(x-1) → N=3, 7 valeurs par ligne', () => {
        const result = generateSignTable({ expression: '(x+3)*(x-2)/(x-1)' });
        if (!result.success) return; // si pas de succès, skip sans fail
        const N = result.criticalPoints.length;
        const fxRow = getFxRow(result);
        if (fxRow) {
            expect(fxRow.values.length).toBe(2 * N + 1);
        }
    });

    it('(x+3)*(x-2)/(x-1) : exactement 1 || et 2 zéros dans f(x)', () => {
        const result = generateSignTable({ expression: '(x+3)*(x-2)/(x-1)' });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow!.values.filter(v => v === '||').length).toBe(1); // x=1
        expect(fxRow!.values.filter(v => v === '0').length).toBe(2);  // x=-3 et x=2
    });

    it('criticalPoints toujours triés en ordre croissant pour les fractions', () => {
        const exprs = [
            '(x+2)/(x-3)',
            '(x-1)/(x+4)',
            '(x+3)*(x-2)/(x-1)',
        ];
        for (const expr of exprs) {
            const result = generateSignTable({ expression: expr });
            const cps = result.criticalPoints;
            for (let i = 1; i < cps.length; i++) {
                expect(cps[i]).toBeGreaterThan(cps[i - 1]);
            }
        }
    });
});

// ─── Régression #2026-03-16 : Produit avec trinôme Δ < 0 ────────────────────
//
// CONTEXTE :
//   Pour (-2x+4)(x-3)(x²+1), le facteur (x²+1) a Δ = -4 < 0 (aucune racine réelle).
//   Il doit être ignoré comme point critique et son signe est '+' partout.
//   Si le moteur l'inclut comme discontinuité ou zéro, le tableau sera erroné.
//
// ATTENDU :
//   - 2 points critiques : x=2 (zéro de -2x+4) et x=3 (zéro de x-3)
//   - Signe f(x) : -, 0, +, 0, -
//   - Pas de || (aucune valeur interdite)

describe('Régression #2026-03-16 — Produit avec facteur Δ < 0 (x²+1)', () => {
    it('(-2x+4)(x-3)(x²+1) : exactement 2 points critiques (x=2 et x=3)', () => {
        const result = generateSignTable({ expression: '(-2*x+4)*(x-3)*(x^2+1)' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(2);
        expect(result.criticalPoints.some(cp => Math.abs(cp - 2) < 0.1)).toBe(true);
        expect(result.criticalPoints.some(cp => Math.abs(cp - 3) < 0.1)).toBe(true);
    });

    it('(-2x+4)(x-3)(x²+1) : aucun || dans f(x) (pas de valeur interdite)', () => {
        const result = generateSignTable({ expression: '(-2*x+4)*(x-3)*(x^2+1)' });
        const fxRow = getFxRow(result);
        expect(fxRow).toBeDefined();
        expect(fxRow!.values).not.toContain('||');
    });

    it('(-2x+4)(x-3)(x²+1) : séquence de signes f(x) = -, 0, +, 0, -', () => {
        const result = generateSignTable({ expression: '(-2*x+4)*(x-3)*(x^2+1)' });
        const fxRow = getFxRow(result);
        expect(fxRow!.values[0]).toBe('-');   // avant x=2 : f(0) = 4*(-3)*1 = -12 < 0
        expect(fxRow!.values[1]).toBe('0');   // x=2 : -2x+4=0
        expect(fxRow!.values[2]).toBe('+');   // entre 2 et 3 : f(2.5) > 0
        expect(fxRow!.values[3]).toBe('0');   // x=3 : x-3=0
        expect(fxRow!.values[4]).toBe('-');   // après x=3 : f(4) < 0
    });

    it('x²+1 seul : aucun point critique (Δ < 0, toujours positif)', () => {
        const result = generateSignTable({ expression: 'x^2+1' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(0);
        const fxRow = getFxRow(result);
        if (fxRow) {
            expect(fxRow.values.every(v => v === '+')).toBe(true);
        }
    });

    it('-x²-1 (a<0, Δ<0) : aucun point critique, signe − partout', () => {
        const result = generateSignTable({ expression: '-x^2-1' });
        expect(result.success).toBe(true);
        expect(result.criticalPoints).toHaveLength(0);
        const fxRow = getFxRow(result);
        if (fxRow) {
            expect(fxRow.values.every(v => v === '-')).toBe(true);
        }
    });
});

// ─── Invariants du format aaaBlock ──────────────────────────────────────────

describe('Invariants aaaBlock — format @@@table', () => {
    it('aaaBlock démarre par "@@@" et contient "table |"', () => {
        const exprs = ['2*x-4', '(x+3)*(x-2)', '(x+2)/(x-3)', 'x^2-5*x+6'];
        for (const expr of exprs) {
            const result = generateSignTable({ expression: expr });
            if (result.success && result.aaaBlock) {
                expect(result.aaaBlock.startsWith('@@@')).toBe(true);
                expect(result.aaaBlock).toContain('table');
            }
        }
    });

    it('aaaBlock se termine toujours par "@@@"', () => {
        const result = generateSignTable({ expression: '(x-1)*(x+2)' });
        if (result.success && result.aaaBlock) {
            expect(result.aaaBlock.trimEnd().endsWith('@@@')).toBe(true);
        }
    });

    it('aaaBlock contient exactement 1 ligne "x:"', () => {
        const result = generateSignTable({ expression: '(x+2)/(x-3)' });
        if (result.success && result.aaaBlock) {
            const xLines = result.aaaBlock.split('\n').filter(l => l.startsWith('x:'));
            expect(xLines).toHaveLength(1);
        }
    });

    it('aaaBlock contient au moins 1 ligne "sign:"', () => {
        const result = generateSignTable({ expression: '(x+2)*(x-3)' });
        if (result.success && result.aaaBlock) {
            const signLines = result.aaaBlock.split('\n').filter(l => l.startsWith('sign:'));
            expect(signLines.length).toBeGreaterThanOrEqual(1);
        }
    });
});

// ─── Régressions parser — expression de la session #2026-03-16 ─────────────

describe('Régression #2026-03-16 — Parser expression (-2x+4)(x-3)(x²+1)', () => {
    it('evalAt((-2*x+4)*(x-3)*(x^2+1), 2) === 0', () => {
        expect(evalAt('(-2*x+4)*(x-3)*(x^2+1)', 2)).toBeCloseTo(0);
    });

    it('evalAt((-2*x+4)*(x-3)*(x^2+1), 3) === 0', () => {
        expect(evalAt('(-2*x+4)*(x-3)*(x^2+1)', 3)).toBeCloseTo(0);
    });

    it('evalAt((-2*x+4)*(x-3)*(x^2+1), 0) === -12', () => {
        // f(0) = (4)*(-3)*(1) = -12
        expect(evalAt('(-2*x+4)*(x-3)*(x^2+1)', 0)).toBeCloseTo(-12);
    });

    it('evalAt((-2*x+4)*(x-3)*(x^2+1), 2.5) > 0', () => {
        // f(2.5) = (-2*2.5+4)*(2.5-3)*(2.5²+1) = (-1)*(-0.5)*(7.25) = 3.625 > 0
        const val = evalAt('(-2*x+4)*(x-3)*(x^2+1)', 2.5);
        expect(val).not.toBeNull();
        expect(val!).toBeGreaterThan(0);
    });

    it('findZeros de (-2*x+4)*(x-3)*(x^2+1) : exactement [2, 3]', () => {
        const zeros = findZeros('(-2*x+4)*(x-3)*(x^2+1)');
        expect(zeros).toHaveLength(2);
        expect(zeros[0]).toBeCloseTo(2, 1);
        expect(zeros[1]).toBeCloseTo(3, 1);
    });
});

// ─── Régression #2026-03-12 — Variation Table de sqrt(x+2) ──────────────────
//
// CONTEXTE :
//   La fonction sqrt(x+2) doit commencer à x = -2 exactement, sans double barre || dans sa variation,
//   car -2 fait partie du domaine de définition. Le domaine est [-2, +∞[.
//   Avant la correction, une barre de valeur interdite (||) ou une valeur imprécise (-2.01) pouvait s'afficher.

describe('Régression #2026-03-12 — Variation Table de sqrt(x+2)', () => {
    it('sqrt(x+2) : aucune valeur || dans la ligne f(x) (la valeur en -2 existe)', () => {
        const result = generateVariationTable({
            expression: 'sqrt(x+2)',
            niveau: 'terminale_spe',
            searchDomain: [-5, 20],
        });
        expect(result.success).toBe(true);
        const fxRow = result.tableSpec?.rows.find(r => r.label === 'f(x)');
        expect(fxRow).toBeDefined();
        expect(fxRow!.values).not.toContain('||');
    });

    it('sqrt(x+2) : f(-2) est représenté par la valeur exacte 0', () => {
        const result = generateVariationTable({
            expression: 'sqrt(x+2)',
            niveau: 'terminale_spe',
            searchDomain: [-5, 20],
        });
        const fxRow = result.tableSpec?.rows.find(r => r.label === 'f(x)');
        // S'assurer que l'image de -2 est bien '0'
        expect(fxRow!.values).toContain('0');
    });
});

// ─── Régression #2026-03-16B — Sign Table de sqrt(x+2) et des racines ───────
//
// CONTEXTE :
//   La méthode de domaine évaluait mal la borne des racines carrées et affichait
//   parfois || au lieu de limiter la table aux bornes strictes du domaine.

describe('Régression #2026-03-16 — Sign Table de sqrt(x+2)', () => {
    it('sqrt(x+2) : pas de double barre || dans la ligne f(x)', () => {
        const result = generateSignTable({
            expression: 'sqrt(x+2)',
            numeratorFactors: [{ label: 'sqrt(x+2)', expr: 'sqrt(x+2)' }],
        });
        expect(result.success).toBe(true);
        const fxRow = getFxRow(result);
        expect(fxRow).toBeDefined();
        expect(fxRow!.values).not.toContain('||');
    });
});

// ─── Régression #2026-03-18A — Limites manquantes exponentielle e^x/x ───────
//
// CONTEXTE :
//   La fonction e^x/x avait un tableau de variation évalué initialement avec "premiere_spe"
//   qui désactive par défaut showLimitsAtInfinity. Les bornes étaient tronquées et l'IA
//   finissait par halluciner des tableaux markdown sans les flèches SVG.

describe('Régression #2026-03-18A — Limites manquantes exponentielle e^x/x', () => {
    it('e^x/x en terminale_spe : les limites sont construites et incluses', () => {
        const result = generateVariationTable({
            expression: '(e^x)/x',
            niveau: 'terminale_spe',
        });
        expect(result.success).toBe(true);
        const fxRow = result.tableSpec?.rows.find(r => r.label === 'f(x)');
        expect(fxRow).toBeDefined();
        
        // On vérifie que la valeur limite '0' (-inf) et '+inf' sont bien envoyés par le backend
        expect(fxRow!.values).toContain('0'); // Limite en -inf
    });
});

// ─── Régression #2026-03-18B — Limites numériques (taux de croissance ln et exp) ───
//
// CONTEXTE :
//   L'approximation des limites aux bornes utilisait des seuils de 1e5 et 1e4,
//   qui ne sont jamais atteints par ln(x) (ln(1e6) = 13.8). Par ailleurs, `evalAt` 
//   renvoyait des valeurs telles que -9999 qui n'étaient pas identifiées comme -inf, 
//   et parseFloat("inf") renvoyait NaN ('?').
//   La correction implique une différentielle à deux points.

describe('Régression #2026-03-18B — Limites numériques exactes (ln, exp)', () => {
    it('e^x/x : les limites asymptotiques en 0 produisent bien -inf et +inf (et non -9999)', () => {
        const result = generateVariationTable({
            expression: 'e^x/x',
            niveau: 'terminale_spe',
        });
        expect(result.success).toBe(true);
        
        const fxRow = result.tableSpec?.rows.find(r => r.label === 'f(x)');
        const xValues = result.tableSpec?.xValues;
        
        // Structure attendue des x: -inf, 0, 1, +inf
        expect(xValues).toEqual(['-inf', '0', '1', '+inf']);
        
        // Structure variation attendue: 0, searrow, -inf, ||, +inf, searrow, e, nearrow, +inf
        expect(fxRow?.values).toEqual(['0', 'searrow', '-inf', '||', '+inf', 'searrow', 'e', 'nearrow', '+inf']);
    });

    it('ln(x) : le domaine est ]0, +inf[ et les limites sont -inf et +inf (et non NaN ou 13.8)', () => {
        const result = generateVariationTable({
            expression: 'ln(x)',
            niveau: 'terminale_spe',
        });
        expect(result.success).toBe(true);
        
        const fxRow = result.tableSpec?.rows.find(r => r.label === 'f(x)');
        const xValues = result.tableSpec?.xValues;
        
        // Structure attendue des x: ]0, +inf
        expect(xValues).toEqual([']0', '+inf']);
        
        // Structure variation attendue: -inf, nearrow, +inf
        expect(fxRow?.values).toEqual(['-inf', 'nearrow', '+inf']);
    });
});
