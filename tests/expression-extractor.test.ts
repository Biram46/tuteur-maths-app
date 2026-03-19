/**
 * Tests — Extraction d'expressions mathématiques depuis les phrases naturelles
 *
 * CONTEXTE :
 *   L'utilisateur saisit des phrases comme "donne moi le tableau de signes de (-2x+4)(x-3)(x^2+1)".
 *   Le routeur doit en extraire UNIQUEMENT "(-2x+4)(x-3)(x^2+1)", pas "signes de (-2x+4)...".
 *
 * BUG #2026-03-16 :
 *   Le fallback `deMatch` capturait "signes de (-2x+4)..." car le pattern
 *   `(?:de|du)\s+(?:[fghk]...)?(.+)` était trop permissif (f(x) optionnel).
 *   Résultat : "signes de (-2x+4)(x-3)(x^2+1)" était envoyé à SymPy → erreur API.
 *
 *   FIX : [fghk]\s*(x) rendu OBLIGATOIRE dans le fallback. Ajout d'un fallback 3
 *         qui cherche le dernier "de " suivi d'une expression mathématique.
 *
 * ⚠️ RÈGLE : NE PAS appeler npm test sur cette machine (no-browser-no-tests).
 *    Ce fichier est destiné à être exécuté via vitest sur CI uniquement.
 */
import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : reproduce the extraction logic from useMathRouter.ts
// On duplique ici la logique pour la tester de manière isolée.
// Si la logique change dans useMathRouter.ts, mettre ce helper à jour.
// ─────────────────────────────────────────────────────────────────────────────

function extractMathExpression(inputCleaned: string): string {
    let expr = '';

    // Étape 0 : si = présent, tout ce qui suit
    const eqMatch = inputCleaned.match(/=\s*(.+)/);
    if (eqMatch) return eqMatch[1].trim();

    // Étape 1 : retirer tout ce qui précède "signes/variations de"
    let extract = inputCleaned.replace(
        /.*(?:signes?|variations?|l'expression|la fonction|l'étude)\s+(?:de|du|d'un|d'une)\s+(?:trinôme\s+|polynôme\s+|produit\s+|quotient\s+)?/i,
        ''
    );

    // Étape 2 : fallback avec f(x) OBLIGATOIRE
    if (extract === inputCleaned) {
        const deMatch = inputCleaned.match(/(?:de|du)\s+(?:[fghk]\s*\(\s*x\s*\)\s*=?\s*)(.+)/i);
        if (deMatch) extract = deMatch[1].trim();
    }

    // Étape 3 : fallback sur mots français → chercher après dernier "de "
    const hasFrenchWords = /\b(?:signes?|tableau|donne|moi|calcule?|résous|étudier?|l[ae]|les?|mon|trouve|dresse|faire|donner|montrer|pour|avec|selon)\b/i.test(extract);
    if (hasFrenchWords || extract === inputCleaned) {
        const lastDeMatch = inputCleaned.match(/(?:^|\s)de\s+((?:[-(]|\d)[\s\S]+)$/i);
        if (lastDeMatch && lastDeMatch[1].includes('x')) {
            extract = lastDeMatch[1].trim();
        }
    }

    expr = extract.replace(/^(?:(?:[fghk]\s*\(\s*x\s*\)|y)\s*=?\s*)/i, '').trim();
    return expr;
}

/** Vérifie que l'expression extraite ne contient PAS de mots français */
function hasNoFrenchWords(expr: string): boolean {
    return !/\b(?:signes?|tableau|donne|moi|calcule?|étudier?|trouve|dresse)\b/i.test(expr);
}

// ═══════════════════════════════════════════════════════════════
// [1] BUG #2026-03-16 — Extraction correcte sans "signes de"
// ═══════════════════════════════════════════════════════════════

describe('Bug #2026-03-16 — Extraction expression depuis phrase naturelle', () => {
    it('ne capture PAS "signes de" dans l\'expression extraite', () => {
        const expr = extractMathExpression('donne moi le tableau de signes de (-2x+4)(x-3)(x^2+1)');
        expect(expr).not.toMatch(/signes?\s+de/i);
    });

    it('extrait exactement "(-2x+4)(x-3)(x^2+1)"', () => {
        const expr = extractMathExpression('donne moi le tableau de signes de (-2x+4)(x-3)(x^2+1)');
        expect(expr).toContain('(-2x+4)');
        expect(expr).toContain('(x-3)');
        expect(expr).toContain('(x^2+1)');
    });

    it('extrait "(-2x+4)(x-3)(x^2+1)" — sans texte résiduel', () => {
        const expr = extractMathExpression('donne moi le tableau de signes de (-2x+4)(x-3)(x^2+1)');
        expect(hasNoFrenchWords(expr)).toBe(true);
    });

    it('phrase avec "signe de" (sans s) : extrait correctement', () => {
        const expr = extractMathExpression('donne le tableau de signe de (x+2)(x-3)');
        expect(expr).not.toMatch(/signe\s+de/i);
        expect(expr).toContain('(x+2)');
        expect(expr).toContain('(x-3)');
    });

    it('phrase minimaliste "signes de f(x) = ..." : utilise le chemin =', () => {
        const expr = extractMathExpression('signes de f(x) = (x+1)/(x-2)');
        expect(expr).toContain('(x+1)/(x-2)');
        expect(expr).not.toMatch(/signes?\s+de/i);
    });
});

// ═══════════════════════════════════════════════════════════════
// [2] Cas standards — extraction correcte
// ═══════════════════════════════════════════════════════════════

describe('Extraction standard d\'expressions mathématiques', () => {
    it('"tableau de signes de (x+2)/(x-3)" → "(x+2)/(x-3)"', () => {
        const expr = extractMathExpression('tableau de signes de (x+2)/(x-3)');
        expect(expr).toMatch(/\(x\+2\)\/\(x-3\)/);
        expect(hasNoFrenchWords(expr)).toBe(true);
    });

    it('"étudier le signe de 2x-4" → "2x-4"', () => {
        const expr = extractMathExpression('étudier le signe de 2x-4');
        expect(expr).toContain('2x-4');
        expect(hasNoFrenchWords(expr)).toBe(true);
    });

    it('"signes de x^2-5x+6" → "x^2-5x+6"', () => {
        const expr = extractMathExpression('signes de x^2-5x+6');
        expect(expr).toContain('x^2-5x+6');
        expect(hasNoFrenchWords(expr)).toBe(true);
    });

    it('"tableau de signes de (x-1)(x+3)(x-5)" → 3 facteurs présents', () => {
        const expr = extractMathExpression('tableau de signes de (x-1)(x+3)(x-5)');
        expect(expr).toContain('(x-1)');
        expect(expr).toContain('(x+3)');
        expect(expr).toContain('(x-5)');
        expect(hasNoFrenchWords(expr)).toBe(true);
    });

    it('"signes de f(x) = x^2-4" → extrait "x^2-4" (via chemin =)', () => {
        const expr = extractMathExpression('signes de f(x) = x^2-4');
        expect(expr).toContain('x^2-4');
    });

    it('"signe de g(x) = -3x+6" → extrait "-3x+6" (via chemin =)', () => {
        const expr = extractMathExpression('signe de g(x) = -3x+6');
        expect(expr).toContain('-3x+6');
    });
});

// ═══════════════════════════════════════════════════════════════
// [3] Cas avec la notation f(x) obligatoire dans le fallback
// ═══════════════════════════════════════════════════════════════

describe('Fallback avec f(x) obligatoire', () => {
    it('"signe de f(x) = (2x-1)/(x+3)" → "(2x-1)/(x+3)"', () => {
        const expr = extractMathExpression('signe de f(x) = (2x-1)/(x+3)');
        expect(expr).toContain('(2x-1)/(x+3)');
    });

    it('"variations de g(x) = x^3-3x" → "x^3-3x"', () => {
        const expr = extractMathExpression('variations de g(x) = x^3-3x');
        expect(expr).toContain('x^3-3x');
    });
});

// ═══════════════════════════════════════════════════════════════
// [4] Cas qui ne doivent PAS déclencher d'envoi à SymPy
// ═══════════════════════════════════════════════════════════════

describe('Expressions invalides — ne doivent pas contenir de texte français résiduel', () => {
    it('une phrase sans expression math → extrait soit vide soit sans x', () => {
        const expr = extractMathExpression('bonjour comment ça va');
        // Soit expr est vide, soit ne contient pas x → ne sera pas envoyé à SymPy
        const wouldBeSentToSympy = expr && expr.includes('x') && expr.length > 1;
        expect(wouldBeSentToSympy).toBeFalsy();
    });

    it('"résous x+2=5" → extrait "5" ou reste côté =', () => {
        const expr = extractMathExpression('résous x+2=5');
        // Le chemin = capture "5" → pas une expression sign_table valide
        // mais au moins pas de texte français
        expect(hasNoFrenchWords(expr)).toBe(true);
    });
});
