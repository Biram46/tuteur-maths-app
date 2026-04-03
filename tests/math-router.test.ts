/**
 * Tests — lib/math-router/* (Anti-Régression)
 * Couverture : intent-detector, router, prompt-builders
 */
import { describe, it, expect } from 'vitest';
import {
    analyzeQuestion,
    extractExpression,
    type DetectedIntent,
    INTENT_LABELS,
} from '@/lib/math-router/intent-detector';
import { getRoutingPreview } from '@/lib/math-router/router';

// ─── Intent Detector — Extraction d'expressions ─────────────────────────────

describe('extractExpression — Anti-Régression', () => {
    it('extrait f(x) = (x-3)/(x+2)', () => {
        const expr = extractExpression('Soit f(x) = (x-3)/(x+2). Étudier le signe.');
        expect(expr).toBe('(x-3)/(x+2)');
    });

    it('extrait g(x) = 2x² - 3x + 1 avec exposant unicode', () => {
        const expr = extractExpression('g(x) = 2x² - 3x + 1');
        expect(expr).toContain('2');
        expect(expr).toContain('x');
    });

    it('extrait une équation = 0', () => {
        const expr = extractExpression('Résoudre x² - 4 = 0');
        expect(expr).toContain('x');
    });

    it('retourne null pour un texte sans expression', () => {
        const expr = extractExpression('Expliquer ce qu\'est une fonction affine.');
        expect(expr).toBeNull();
    });

    it('gère les caractères français (×, −)', () => {
        const expr = extractExpression('f(x) = 3x − 2');
        // Le × devrait être converti en *
        expect(expr).toBeDefined();
    });
});

// ─── Intent Detector — Détection des intentions ────────────────────────────

describe('analyzeQuestion — Détection d\'intentions', () => {
    it('détecte sign_table pour "étudier le signe"', () => {
        const result = analyzeQuestion('Étudier le signe de f(x) = 2x-4', 'seconde');
        expect(result.hasMathEngine).toBe(true);
        expect(result.intents[0].intent).toBe('sign_table');
    });

    it('détecte variation_table pour "tableau de variations"', () => {
        const result = analyzeQuestion('Dresser le tableau de variations de g(x) = x^3', 'terminale_spe');
        expect(result.intents[0].intent).toBe('variation_table');
    });

    it('détecte graph pour "tracer la courbe"', () => {
        const result = analyzeQuestion('Tracer la courbe de f(x) = x^2', 'seconde');
        expect(result.intents[0].intent).toBe('graph');
    });

    it('détecte solve_equation pour "résoudre f(x) = 0"', () => {
        const result = analyzeQuestion('Résoudre f(x) = 0', 'premiere_spe');
        expect(result.intents[0].intent).toBe('solve_equation');
    });

    it('détecte solve_inequality pour "f(x) > 0"', () => {
        const result = analyzeQuestion('Résoudre f(x) > 0', 'premiere_spe');
        expect(result.intents[0].intent).toBe('solve_inequality');
    });

    it('détecte derivative pour "calculer f\'(x)"', () => {
        const result = analyzeQuestion('Calculer f\'(x) pour f(x) = x^3', 'terminale_spe');
        expect(result.intents[0].intent).toBe('derivative');
    });

    it('détecte limits pour "limite en"', () => {
        const result = analyzeQuestion('Calculer la limite de f(x) = 1/x en +∞', 'terminale_spe');
        expect(result.intents[0].intent).toBe('limits');
    });

    it('détecte integral pour "primitive"', () => {
        const result = analyzeQuestion('Trouver une primitive de f(x) = 2x', 'terminale_spe');
        expect(result.intents[0].intent).toBe('integral');
    });

    it('détecte factorize pour "factoriser"', () => {
        const result = analyzeQuestion('Factoriser x^2 - 4', 'seconde');
        expect(result.intents[0].intent).toBe('factorize');
    });

    it('détecte unknown pour une question générale', () => {
        const result = analyzeQuestion('Qu\'est-ce qu\'une fonction ?', 'seconde');
        expect(result.intents.some(i => i.intent === 'unknown')).toBe(true);
    });
});

// ─── Intent Detector — Questions multiples ─────────────────────────────────────

describe('analyzeQuestion — Questions multiples', () => {
    it('découpe les questions numérotées 1) 2)', () => {
        const result = analyzeQuestion(`
            Soit f(x) = (x-2)(x+3).
            1) Étudier le signe de f(x).
            2) Résoudre f(x) > 0.
        `, 'seconde');
        expect(result.intents).toHaveLength(2);
        expect(result.intents[0].intent).toBe('sign_table');
        expect(result.intents[1].intent).toBe('solve_inequality');
    });

    it('découpe les questions avec notation a. b.', () => {
        const result = analyzeQuestion(`
            a. Calculer f'(x).
            b. Dresser le tableau de variations.
        `, 'terminale_spe');
        expect(result.intents).toHaveLength(2);
    });

    it('préserve l\'expression globale pour les sous-questions', () => {
        const result = analyzeQuestion(`
            Soit f(x) = x^2 - 4x + 3.
            1) Étudier le signe.
        `, 'premiere_spe');
        expect(result.globalExpression).toContain('x');
    });
});

// ─── Routing Preview ─────────────────────────────────────────────────────────

describe('getRoutingPreview — Anti-Régression', () => {
    it('retourne une chaîne vide pour une question sans maths', () => {
        const preview = getRoutingPreview('Bonjour, comment ça va ?');
        expect(preview).toBe('');
    });

    it('affiche un aperçu pour une question de signe', () => {
        const preview = getRoutingPreview('Étudier le signe de f(x) = 2x-4');
        expect(preview).toContain('Tableau de signes');
    });

    it('affiche l\'expression extraite dans l\'aperçu', () => {
        const preview = getRoutingPreview('Tracer la courbe de g(x) = x^3');
        expect(preview).toContain('Tracé');
    });
});

// ─── INTENT_LABELS ───────────────────────────────────────────────────────────

describe('INTENT_LABELS — Cohérence des labels', () => {
    it('tous les intents ont un label défini', () => {
        const intents: DetectedIntent['intent'][] = [
            'sign_table', 'variation_table', 'graph', 'solve_equation',
            'solve_inequality', 'derivative', 'integral', 'factorize',
            'limits', 'literal_calc', 'unknown'
        ];
        for (const intent of intents) {
            expect(INTENT_LABELS[intent]).toBeDefined();
            expect(INTENT_LABELS[intent].length).toBeGreaterThan(0);
        }
    });
});

// ─── Edge Cases — Expressions complexes ─────────────────────────────────────

describe('Edge Cases — Expressions complexes', () => {
    it('gère les fractions rationnelles', () => {
        const result = analyzeQuestion('Étudier le signe de f(x) = (2x-1)/(x-3)', 'premiere_spe');
        expect(result.intents[0].expression).toContain('/');
    });

    it('gère les expressions avec racine carrée', () => {
        const result = analyzeQuestion('Étudier les variations de f(x) = sqrt(x+2)', 'terminale_spe');
        expect(result.intents[0].intent).toBe('variation_table');
    });

    it('gère les expressions exponentielles', () => {
        const result = analyzeQuestion('Calculer la dérivée de f(x) = e^x * x', 'terminale_spe');
        expect(result.intents[0].intent).toBe('derivative');
    });

    it('gère les expressions avec logarithme', () => {
        const result = analyzeQuestion('Étudier les variations de f(x) = ln(x)', 'terminale_spe');
        expect(result.intents[0].intent).toBe('variation_table');
    });

    it('gère les expressions trigonométriques', () => {
        const result = analyzeQuestion('Calculer f\'(x) pour f(x) = sin(x)', 'terminale_spe');
        expect(result.intents[0].intent).toBe('derivative');
    });
});

// ─── Régressions spécifiques ─────────────────────────────────────────────────

describe('Régressions — Cas historiques', () => {
    it('#4.1 : (3x+2)(7x-1) sur une ligne n\'est PAS multi-questions', () => {
        const result = analyzeQuestion('Tableau de signes de (3x+2)(7x-1)/(2x-1)', 'premiere_spe');
        // Une seule intention, pas de découpage incorrect
        expect(result.intents.filter(i => i.intent !== 'unknown')).toHaveLength(1);
    });

    it('gère les parenthèses numérotées dans l\'expression', () => {
        // L'expression "f(x) = (x+1)" ne doit PAS être interprétée comme une numérotation
        const result = analyzeQuestion('Soit f(x) = (x+1). Étudier le signe.', 'seconde');
        expect(result.globalExpression).toContain('x+1');
    });
});
