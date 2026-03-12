/**
 * Tests — lib/niveau-utils.ts
 * Couverture : detectNiveauFromMessage, resolveNiveau
 */
import { describe, it, expect, vi } from 'vitest';
import { detectNiveauFromMessage, resolveNiveau } from '@/lib/niveau-utils';

describe('detectNiveauFromMessage', () => {
    // ── Terminale ──────────────────────────────────────────
    it('détecte "terminale" → terminale_spe', () => {
        expect(detectNiveauFromMessage('Je suis en terminale')).toBe('terminale_spe');
    });

    it('détecte "Tle" → terminale_spe (insensible à la casse)', () => {
        expect(detectNiveauFromMessage('Exercice de Tle spé')).toBe('terminale_spe');
    });

    it('détecte "terminale maths expert" → terminale_expert', () => {
        expect(detectNiveauFromMessage('terminale maths expert')).toBe('terminale_expert');
    });

    it('détecte "terminale expert" → terminale_expert', () => {
        expect(detectNiveauFromMessage('Elle est en Terminale Expert')).toBe('terminale_expert');
    });

    it('détecte "terminale comp" → terminale_comp', () => {
        expect(detectNiveauFromMessage('niveau terminale complémentaire')).toBe('terminale_comp');
    });

    it('détecte "terminale techno" → terminale_techno', () => {
        expect(detectNiveauFromMessage('exercice de terminale STI2D')).toBe('terminale_techno');
    });

    it('détecte "terminale STMG" → terminale_techno', () => {
        expect(detectNiveauFromMessage('Terminale STMG')).toBe('terminale_techno');
    });

    // ── Première ───────────────────────────────────────────
    it('détecte "première" → premiere_commune', () => {
        expect(detectNiveauFromMessage('exercice de première')).toBe('premiere_commune');
    });

    it('détecte "1ère" → premiere_commune', () => {
        expect(detectNiveauFromMessage('niveau 1ère')).toBe('premiere_commune');
    });

    it('détecte "première spé" → premiere_spe', () => {
        expect(detectNiveauFromMessage('Je suis en première spé maths')).toBe('premiere_spe');
    });

    it('détecte "première techno" → premiere_techno', () => {
        expect(detectNiveauFromMessage('Première STI2D')).toBe('premiere_techno');
    });

    it('détecte "première STMG" → premiere_techno', () => {
        expect(detectNiveauFromMessage('Première STMG')).toBe('premiere_techno');
    });

    // ── Seconde ────────────────────────────────────────────
    it('détecte "seconde" → seconde', () => {
        expect(detectNiveauFromMessage('exercice de seconde')).toBe('seconde');
    });

    it('détecte "2nde" → seconde', () => {
        expect(detectNiveauFromMessage('niveau 2nde')).toBe('seconde');
    });

    it('détecte "2de" → seconde', () => {
        expect(detectNiveauFromMessage('classe de 2de')).toBe('seconde');
    });

    it('détecte "seconde STHR" → seconde_sthr', () => {
        expect(detectNiveauFromMessage('seconde STHR')).toBe('seconde_sthr');
    });

    // ── Sans niveau ────────────────────────────────────────
    it('retourne null si aucun niveau détecté', () => {
        expect(detectNiveauFromMessage("Je ne sais pas ma classe")).toBeNull();
    });

    it('retourne null pour une chaîne vide', () => {
        expect(detectNiveauFromMessage('')).toBeNull();
    });
});

describe('resolveNiveau', () => {
    it('priorise le niveau du sélecteur UI (selectedNiveau)', () => {
        const result = resolveNiveau('en terminale', 'seconde');
        expect(result).toBe('seconde'); // UI override
    });

    it('auto-détecte le niveau si selectedNiveau est null', () => {
        const result = resolveNiveau('Je suis en seconde', null);
        expect(result).toBe('seconde');
    });

    it('appelle onDetected avec le niveau détecté', () => {
        const spy = vi.fn();
        resolveNiveau('Je suis en terminale', null, spy);
        expect(spy).toHaveBeenCalledWith('terminale_spe');
    });

    it("n'appelle PAS onDetected si selectedNiveau est fourni", () => {
        const spy = vi.fn();
        resolveNiveau('Je suis en terminale', 'seconde', spy);
        expect(spy).not.toHaveBeenCalled();
    });

    it('retourne "premiere_spe" par défaut si rien n\'est détecté', () => {
        const result = resolveNiveau('bonjour', null);
        expect(result).toBe('premiere_spe');
    });

    it('retourne "premiere_spe" par défaut même sans onDetected', () => {
        const result = resolveNiveau('bonjour', null, undefined);
        expect(result).toBe('premiere_spe');
    });
});
