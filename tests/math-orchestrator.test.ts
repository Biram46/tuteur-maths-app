/**
 * Tests — lib/math-orchestrator.ts
 * Couverture : classifyFunction, selectMethod, buildPedagogicalContext
 */
import { describe, it, expect } from 'vitest';
import {
    classifyFunction,
    selectMethod,
    buildPedagogicalContext,
} from '@/lib/math-orchestrator';

// ─── classifyFunction ─────────────────────────────────────────────────────────

describe('classifyFunction — Fonctions de référence', () => {
    it('x² → reference_x2', () => {
        expect(classifyFunction('x^2')).toBe('reference_x2');
    });

    it('-x² → reference_x2', () => {
        expect(classifyFunction('-x^2')).toBe('reference_x2');
    });

    it('x³ → reference_cube', () => {
        expect(classifyFunction('x^3')).toBe('reference_cube');
    });

    it('1/x → reference_inv', () => {
        expect(classifyFunction('1/x')).toBe('reference_inv');
    });

    it('sqrt(x) → reference_sqrt', () => {
        expect(classifyFunction('sqrt(x)')).toBe('reference_sqrt');
    });
});

describe('classifyFunction — Fonctions affines', () => {
    it('2x + 3 → affine', () => {
        expect(classifyFunction('2x+3')).toBe('affine');
    });

    it('-3x + 1 → affine', () => {
        expect(classifyFunction('-3x+1')).toBe('affine');
    });

    it('x → affine', () => {
        expect(classifyFunction('x')).toBe('affine');
    });

    it('5 (constante) → affine', () => {
        expect(classifyFunction('5')).toBe('affine');
    });
});

describe('classifyFunction — Polynômes du 2nd degré', () => {
    it('x^2 + 2x + 1 → degree2', () => {
        expect(classifyFunction('x^2+2*x+1')).toBe('degree2');
    });

    it('2x^2 - 3x + 5 → degree2', () => {
        expect(classifyFunction('2*x^2-3*x+5')).toBe('degree2');
    });

    it('-x^2 + 4 → degree2', () => {
        expect(classifyFunction('-x^2+4')).toBe('degree2');
    });
});

describe('classifyFunction — Fonctions transcendantes', () => {
    it('exp(x) → transcendental', () => {
        expect(classifyFunction('exp(x)')).toBe('transcendental');
    });

    it('log(x) → transcendental', () => {
        expect(classifyFunction('log(x)')).toBe('transcendental');
    });

    it('e^x → transcendental', () => {
        expect(classifyFunction('e^x')).toBe('transcendental');
    });

    it('sin(x) → transcendental', () => {
        expect(classifyFunction('sin(x)')).toBe('transcendental');
    });
});

describe('classifyFunction — Fractions rationnelles', () => {
    it('(x+1)/(x-2) → rational', () => {
        expect(classifyFunction('(x+1)/(x-2)')).toBe('rational');
    });

    it('x/(x^2-1) → rational', () => {
        expect(classifyFunction('x/(x^2-1)')).toBe('rational');
    });
});

describe('classifyFunction — Polynômes degré ≥ 3', () => {
    it('x^3 - 2x + 1 → general (pas reference_cube car terme linéaire)', () => {
        expect(classifyFunction('x^3-2*x+1')).toBe('general');
    });

    it('x^4 → general', () => {
        expect(classifyFunction('x^4')).toBe('general');
    });
});

// ─── selectMethod × niveau ────────────────────────────────────────────────────

describe('selectMethod — Barrière niveau Seconde', () => {
    it('affine en Seconde → sign_of_a (autorisé)', () => {
        const { method, blocked } = selectMethod('affine', 'seconde');
        expect(method).toBe('sign_of_a');
        expect(blocked).toBe(false);
    });

    it('reference_x2 en Seconde → reference_properties (autorisé)', () => {
        const { method, blocked } = selectMethod('reference_x2', 'seconde');
        expect(method).toBe('reference_properties');
        expect(blocked).toBe(false);
    });

    it('degree2 en Seconde → BLOQUÉ (hors programme BO 2025)', () => {
        const { method, blocked } = selectMethod('degree2', 'seconde');
        expect(method).toBe('forbidden_degree');
        expect(blocked).toBe(true);
        expect(selectMethod('degree2', 'seconde').blockReason).toContain('⛔');
    });

    it('rational en Seconde → BLOQUÉ', () => {
        const { blocked } = selectMethod('rational', 'seconde');
        expect(blocked).toBe(true);
    });

    it('transcendental en Seconde → BLOQUÉ', () => {
        const { blocked } = selectMethod('transcendental', 'seconde');
        expect(blocked).toBe(true);
    });

    it('general en Seconde → BLOQUÉ', () => {
        const { blocked } = selectMethod('general', 'seconde');
        expect(blocked).toBe(true);
    });
});

describe('selectMethod — Première Spécialité', () => {
    it('affine en Première Spé → sign_of_a', () => {
        const { method } = selectMethod('affine', 'premiere_spe');
        expect(method).toBe('sign_of_a');
    });

    it('degree2 en Première Spé → canonical_form (JAMAIS la dérivée)', () => {
        const { method, blocked } = selectMethod('degree2', 'premiere_spe');
        expect(method).toBe('canonical_form');
        expect(blocked).toBe(false);
    });

    it('rational en Première Spé → derivative_sign', () => {
        const { method } = selectMethod('rational', 'premiere_spe');
        expect(method).toBe('derivative_sign');
    });

    it('transcendental en Première Spé → BLOQUÉ', () => {
        const { blocked } = selectMethod('transcendental', 'premiere_spe');
        expect(blocked).toBe(true);
    });
});

describe('selectMethod — Terminale Spécialité', () => {
    it('degree2 en Terminale → canonical_form', () => {
        const { method } = selectMethod('degree2', 'terminale_spe');
        expect(method).toBe('canonical_form');
    });

    it('transcendental en Terminale → derivative_sign', () => {
        const { method, blocked } = selectMethod('transcendental', 'terminale_spe');
        expect(method).toBe('derivative_sign');
        expect(blocked).toBe(false);
    });

    it('rational en Terminale → derivative_sign', () => {
        const { method } = selectMethod('rational', 'terminale_spe');
        expect(method).toBe('derivative_sign');
    });

    it('general en Terminale → derivative_sign', () => {
        const { method } = selectMethod('general', 'terminale_spe');
        expect(method).toBe('derivative_sign');
    });
});

describe('selectMethod — Règles invariantes (toutes les fonctions de référence)', () => {
    const refClasses = ['reference_x2', 'reference_inv', 'reference_sqrt', 'reference_cube'] as const;
    const niveaux = ['seconde', 'premiere_spe', 'terminale_spe'] as const;

    for (const ref of refClasses) {
        for (const niveau of niveaux) {
            it(`${ref} en ${niveau} → reference_properties (toujours autorisé)`, () => {
                const { method, blocked } = selectMethod(ref, niveau);
                expect(method).toBe('reference_properties');
                expect(blocked).toBe(false);
            });
        }
    }
});

// ─── buildPedagogicalContext ──────────────────────────────────────────────────

describe('buildPedagogicalContext — Structure de la réponse', () => {
    it('retourne un objet avec analysis et promptInjection', () => {
        const ctx = buildPedagogicalContext('x^2+2*x+1', 'premiere_spe');
        expect(ctx.analysis).toBeDefined();
        expect(ctx.promptInjection).toBeDefined();
        expect(typeof ctx.promptInjection).toBe('string');
    });

    it('identifie correctement degree2 pour x^2+2x+1', () => {
        const ctx = buildPedagogicalContext('x^2+2*x+1', 'premiere_spe');
        expect(ctx.analysis.classe).toBe('degree2');
        expect(ctx.analysis.method).toBe('canonical_form');
    });

    it('le promptInjection contient l\'en-tête orchestrateur', () => {
        const ctx = buildPedagogicalContext('2*x+3', 'premiere_spe');
        expect(ctx.promptInjection).toContain('ORCHESTRATEUR PÉDAGOGIQUE');
    });

    it('le promptInjection contient le niveau formaté', () => {
        const ctx = buildPedagogicalContext('x^2', 'seconde');
        expect(ctx.promptInjection).toContain('Seconde');
    });

    it('le promptInjection pour affine contient le protocole sign_of_a', () => {
        const ctx = buildPedagogicalContext('3*x+1', 'premiere_spe');
        expect(ctx.analysis.method).toBe('sign_of_a');
        // Le prompt contient les règles de la méthode sign_of_a
        expect(ctx.promptInjection).toContain('croissante');
        expect(ctx.promptInjection).toContain('coefficient');
    });

    it('le promptInjection pour degree2 bloqué (seconde) indique BLOQUÉ', () => {
        const ctx = buildPedagogicalContext('x^2+2*x+1', 'seconde');
        expect(ctx.analysis.blocked).toBe(true);
        expect(ctx.promptInjection).toContain('⛔');
    });
});

describe('buildPedagogicalContext — Barrière des limites', () => {
    it('Seconde : une affine est autorisée et le niveau est bien seconde', () => {
        const ctx = buildPedagogicalContext('2*x+1', 'seconde');
        expect(ctx.analysis.niveau).toBe('seconde');
        expect(ctx.analysis.classe).toBe('affine');
        expect(ctx.analysis.blocked).toBe(false);
        // La barrière des limites est dans le prompt (pour les méthodes non-bloquées)
        expect(ctx.promptInjection).toContain('BARRI');
    });

    it('Première Spé : le prompt mentionne l\'interdiction des limites', () => {
        const ctx = buildPedagogicalContext('x^3-x', 'premiere_spe');
        expect(ctx.promptInjection).toContain('INTERDICTION ABSOLUE');
    });

    it('Terminale Sci : pas de barrière (limites autorisées)', () => {
        const ctx = buildPedagogicalContext('x^3-x', 'terminale_spe');
        // Pas de message "BLOQUÉ" pour les limites en Terminale Sci
        expect(ctx.analysis.niveau).toBe('terminale_spe');
        expect(ctx.analysis.blocked).toBe(false);
    });
});

describe('buildPedagogicalContext — Enrichissement avec données SymPy', () => {
    it('intègre les données SymPy si fournies', () => {
        const mockSympy = {
            factors: [{ label: 'x - 2', type: 'numerator' }],
            discriminantSteps: [{ factor: 'x²+x+1', steps: ['Δ = 1 - 4 = -3 < 0'] }],
            numZeros: ['2'],
        };
        const ctx = buildPedagogicalContext('x^3-x', 'terminale_spe', mockSympy);
        expect(ctx.sympyData).toBeDefined();
        expect(ctx.sympyData?.factors).toHaveLength(1);
        expect(ctx.promptInjection).toContain('SymPy EXACTES');
    });

    it('les limites SymPy sont filtrées selon le niveau (Première Spé → null)', () => {
        const mockSympy = {
            limits: { atPlusInf: '+\\infty', atMinusInf: '-\\infty' },
        };
        const ctx = buildPedagogicalContext('x^2', 'premiere_spe', mockSympy);
        // En Première Spé, les limites doivent être filtrées (pas transmises)
        expect(ctx.sympyData?.limits).toBeUndefined();
    });

    it('les limites SymPy sont présentes en Terminale Spé', () => {
        const mockSympy = {
            limits: { atPlusInf: '+\\infty', atMinusInf: '-\\infty' },
        };
        const ctx = buildPedagogicalContext('x^2', 'terminale_spe', mockSympy);
        expect(ctx.sympyData?.limits).toBeDefined();
    });
});
