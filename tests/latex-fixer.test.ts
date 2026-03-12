/**
 * Tests — lib/latex-fixer.ts
 * Couverture : fixLatexContent, needsLatexFix
 */
import { describe, it, expect } from 'vitest';
import { fixLatexContent, needsLatexFix } from '@/lib/latex-fixer';

describe('fixLatexContent — conversion des délimiteurs', () => {
    it('convertit \\( ... \\) → $ ... $', () => {
        const result = fixLatexContent('Voici \\(x^2\\) une formule');
        expect(result.content).toBe('Voici $x^2$ une formule');
    });

    it('convertit \\[ ... \\] → $$ ... $$', () => {
        const result = fixLatexContent('Equation : \\[x^2 + 1\\]');
        expect(result.content).toContain('$$x^2 + 1$$');
    });

    it('laisse $ ... $ inchangé (déjà au bon format)', () => {
        const result = fixLatexContent('Formule $x^2$ déjà ok');
        expect(result.content).toContain('$x^2$');
    });

    it('laisse le texte sans LaTeX inchangé', () => {
        const result = fixLatexContent('Simple texte sans formule');
        expect(result.content).toBe('Simple texte sans formule');
    });
});

describe('fixLatexContent — normalisation Unicode', () => {
    it('remplace le tiret long Unicode − par -', () => {
        const result = fixLatexContent('a \u2212 b');
        expect(result.content).toBe('a - b');
    });

    it('remplace l\'espace insécable par un espace normal', () => {
        const result = fixLatexContent('a\u00A0b');
        expect(result.content).toBe('a b');
    });
});

describe('fixLatexContent — correction des commandes LaTeX', () => {
    it('corrige \\vec u → \\vec{u} (accolades manquantes)', () => {
        const result = fixLatexContent('$\\vec u + \\vec AB$');
        expect(result.content).toContain('\\vec{u}');
    });

    it('corrige \\\\frac → \\frac (double backslash)', () => {
        const result = fixLatexContent('$\\\\frac{1}{2}$');
        expect(result.content).toContain('\\frac{1}{2}');
        expect(result.content).not.toContain('\\\\frac');
    });

    it('ne touche PAS aux \\frac déjà corrects', () => {
        const result = fixLatexContent('$\\frac{1}{2}$');
        expect(result.content).toContain('\\frac{1}{2}');
    });
});

describe('fixLatexContent — opérateurs de comparaison DANS les blocs math', () => {
    it('convertit <= en \\leq DANS un $...$ (pas en texte brut)', () => {
        const result = fixLatexContent('$x <= 0$');
        expect(result.content).toContain('\\leq');
    });

    it('NE convertit PAS <= en texte brut (hors bloc math)', () => {
        const result = fixLatexContent('Si x <= 0 alors...');
        // Pas de $, donc pas de transformation
        expect(result.content).toContain('<=');
        expect(result.content).not.toContain('\\leq');
    });

    it('convertit != en \\neq DANS un bloc math', () => {
        const result = fixLatexContent('$x != 0$');
        expect(result.content).toContain('\\neq');
    });
});

describe('fixLatexContent — auto-encapsulation des environnements', () => {
    it('encapsule \\begin{aligned} sans délimiteurs → bloc LaTeX préservé', () => {
        const result = fixLatexContent('\\begin{aligned} x &= 1 \\end{aligned}');
        // Le bloc doit être préservé (pas supprimé)
        expect(result.content).toContain('\\begin{aligned}');
        // Des dollar signs doivent être présents (encapsulation display math)
        expect(result.content).toMatch(/\$/);
    });
});

describe('needsLatexFix', () => {
    it('détecte \\( comme nécessitant une correction', () => {
        expect(needsLatexFix('Voici \\(x^2\\)')).toBe(true);
    });

    it('détecte \\[ comme nécessitant une correction', () => {
        expect(needsLatexFix('Voici \\[x^2\\]')).toBe(true);
    });

    it('détecte begin{array} comme nécessitant une correction', () => {
        expect(needsLatexFix('begin{array} ... end{array}')).toBe(true);
    });

    it('retourne false pour du contenu déjà correct', () => {
        expect(needsLatexFix('Texte normal $x^2$ et rien d\'autre')).toBe(false);
    });
});
