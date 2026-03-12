/**
 * Tests — lib/geo-engine/parser.ts
 * Couverture : parseGeoScene — objets, repère, calculs exacts
 */
import { describe, it, expect } from 'vitest';
import { parseGeoScene } from '@/lib/geo-engine/parser';

// ─── Parsing des points ───────────────────────────────────────────────────────

describe('parseGeoScene — Points', () => {
    it('parse un point simple avec coordonnées entières', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0');
        const pt = scene.objects.find(o => o.kind === 'point' && (o as any).id === 'A');
        expect(pt).toBeDefined();
        expect((pt as any).x).toBe(0);
        expect((pt as any).y).toBe(0);
    });

    it('parse un point avec coordonnées négatives', () => {
        const scene = parseGeoScene('geo\npoint: B, -3, 4');
        const pt = scene.objects.find(o => o.kind === 'point' && (o as any).id === 'B');
        expect((pt as any).x).toBe(-3);
        expect((pt as any).y).toBe(4);
    });

    it('parse format "points: A(2,3), B(5,1)" (pluriel avec parenthèses)', () => {
        const scene = parseGeoScene('geo\npoints: A(2,3), B(5,1), C(1,-2)');
        expect(scene.objects.filter(o => o.kind === 'point')).toHaveLength(3);
    });

    it('ignore les points auxiliaires (id commençant par _)', () => {
        const scene = parseGeoScene(
            'geo\npoint: A, 0, 0\npoint: B, 4, 0\nperpendiculaire: A, B'
        );
        const auxPts = scene.objects.filter(o => o.kind === 'point' && (o as any).id.startsWith('_'));
        // Les points auxiliaires EXISTENT mais sont stylisés 'none' pour le rendu
        auxPts.forEach(p => {
            expect((p as any).style).toBe('none');
        });
    });
});

// ─── Repère ──────────────────────────────────────────────────────────────────

describe('parseGeoScene — Repère (Bug #2 régression)', () => {
    it('repere: none par défaut (pas de directive)', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0');
        // Défaut DOIT être "none" — l'IA décide du repère, pas le code
        expect(scene.repere).toBe('none');
    });

    it('repere: none si directive explicite "repere: none"', () => {
        const scene = parseGeoScene('geo\nrepere: none\npoint: A, 1, 2');
        expect(scene.repere).toBe('none');
    });

    it('repere: orthonormal si directive "repere: orthonormal"', () => {
        const scene = parseGeoScene('geo\nrepere: orthonormal\npoint: A, 0, 0');
        expect(scene.repere).toBe('orthonormal');
    });

    it('repere: orthonormal si directive "repère: orthonormal" (accent)', () => {
        const scene = parseGeoScene('geo\nrepère: orthonormal\npoint: O, 0, 0');
        expect(scene.repere).toBe('orthonormal');
    });

    it('repere: orthogonal si directive "repere: orthogonal"', () => {
        const scene = parseGeoScene('geo\nrepere: orthogonal\npoint: A, 2, 3');
        expect(scene.repere).toBe('orthogonal');
    });

    it('présence de coordonnées numériques SEULE ne force PAS le repère (Bug #2)', () => {
        // Triangle sans repère demandé : les coords sont juste là pour le placement
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 4, 0\npoint: C, 2, 3');
        // LE parseur ne doit PAS forcer repere: orthonormal
        expect(scene.repere).toBe('none');
    });
});

// ─── Segments ────────────────────────────────────────────────────────────────

describe('parseGeoScene — Segments', () => {
    it('parse "segment: AB" → from=A, to=B', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 4, 0\nsegment: AB');
        const seg = scene.objects.find(o => o.kind === 'segment');
        expect(seg).toBeDefined();
        expect((seg as any).from).toBe('A');
        expect((seg as any).to).toBe('B');
    });

    it('parse "segments: [AB], [BC], [CA]" → 3 segments', () => {
        const scene = parseGeoScene('geo\npoint: A,0,0\npoint: B,4,0\npoint: C,2,3\nsegments: [AB], [BC], [CA]');
        expect(scene.objects.filter(o => o.kind === 'segment')).toHaveLength(3);
    });

    it('parse "triangle: A, B, C" → 3 segments automatiques', () => {
        const scene = parseGeoScene('geo\npoint: A,0,0\npoint: B,4,0\npoint: C,2,3\ntriangle: A, B, C');
        expect(scene.objects.filter(o => o.kind === 'segment')).toHaveLength(3);
    });
});

// ─── Cercles ─────────────────────────────────────────────────────────────────

describe('parseGeoScene — Cercles', () => {
    it('parse "circle: O, 3" → radiusValue=3', () => {
        const scene = parseGeoScene('geo\npoint: O, 0, 0\ncircle: O, 3');
        const circ = scene.objects.find(o => o.kind === 'circle');
        expect(circ).toBeDefined();
        expect((circ as any).center).toBe('O');
        expect((circ as any).radiusValue).toBe(3);
    });

    it('parse "cercle: O, 4" (français) → radiusValue=4', () => {
        const scene = parseGeoScene('geo\npoint: O, 0, 0\ncercle: O, 4');
        const circ = scene.objects.find(o => o.kind === 'circle');
        expect((circ as any).radiusValue).toBe(4);
    });

    it('parse "circle: O, A" (passant par A) → radiusPoint=A', () => {
        const scene = parseGeoScene('geo\npoint: O, 0, 0\npoint: A, 3, 0\ncircle: O, A');
        const circ = scene.objects.find(o => o.kind === 'circle');
        expect((circ as any).radiusPoint).toBe('A');
        expect((circ as any).radiusValue).toBeUndefined();
    });

    it('crée le point centre implicitement si absent (Bug cercle sans point: O)', () => {
        // "circle: O, 4" sans "point: O, 0, 0" → O doit être créé à (0,0)
        const scene = parseGeoScene('geo\ncircle: O, 4');
        const circ = scene.objects.find(o => o.kind === 'circle') as any;
        const centerPt = scene.objects.find(o => o.kind === 'point' && (o as any).id === 'O') as any;
        expect(circ).toBeDefined();
        expect(circ.radiusValue).toBe(4);
        expect(centerPt).toBeDefined();
        expect(centerPt.x).toBe(0);
        expect(centerPt.y).toBe(0);
    });
});

// ─── Vecteurs (Bug #4 régression) ────────────────────────────────────────────

describe('parseGeoScene — Vecteurs (Bug #4 : case dupliqué)', () => {
    it('parse "vecteur: AB" → UN SEUL objet vecteur (pas de doublon)', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 3, 4\nvecteur: AB');
        const vecs = scene.objects.filter(o => o.kind === 'vector');
        expect(vecs).toHaveLength(1);
        expect((vecs[0] as any).from).toBe('A');
        expect((vecs[0] as any).to).toBe('B');
    });

    it('parse "vector: AB" → label \\vec{AB} par défaut', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 3, 4\nvector: AB');
        const vec = scene.objects.find(o => o.kind === 'vector') as any;
        expect(vec?.label).toContain('vec');
    });

    it('parse "vec: A, B, u" → label "u" personnalisé', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 3, 4\nvec: A, B, u');
        const vec = scene.objects.find(o => o.kind === 'vector') as any;
        expect(vec?.label).toBe('u');
    });
});

// ─── Calculs exacts ──────────────────────────────────────────────────────────

describe('parseGeoScene — Calculs (compute:)', () => {
    it('compute: distance AB → computed contient 1 résultat', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 3, 4\ncompute: distance AB');
        expect(scene.computed).toBeDefined();
        expect(scene.computed!.length).toBe(1);
        expect(scene.computed![0].label).toContain('AB');
    });

    it('compute: distance AB avec A(0,0) B(3,4) → AB=5 (carré parfait)', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 3, 4\ncompute: distance AB');
        // √(9+16) = √25 = 5
        expect(scene.computed![0].latex).toBe('5');
    });

    it('compute: perimetre ABC → computed contient le périmètre', () => {
        const scene = parseGeoScene(
            'geo\npoint: A, 0, 0\npoint: B, 3, 0\npoint: C, 0, 4\ncompute: perimetre ABC'
        );
        expect(scene.computed).toBeDefined();
        expect(scene.computed!.length).toBeGreaterThan(0);
        expect(scene.computed![0].label).toContain('P');
    });

    it('sans "compute:" → computed vide (pas de calcul automatique)', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 3, 0\npoint: C, 0, 4\nsegment: AB\nsegment: BC\nsegment: CA');
        // Le parseur ne calcule PAS automatiquement le périmètre sans directive
        expect(scene.computed?.length ?? 0).toBe(0);
    });

    it('compute: milieu AB → computed contient les coordonnées du milieu', () => {
        const scene = parseGeoScene('geo\npoint: A, 0, 0\npoint: B, 4, 2\ncompute: milieu AB');
        expect(scene.computed).toBeDefined();
        expect(scene.computed!.length).toBe(1);
        // Milieu de (0,0) et (4,2) = (2, 1)
        expect(scene.computed![0].approx).toContain('2.00');
    });
});

// ─── Domaine automatique ─────────────────────────────────────────────────────

describe('parseGeoScene — Domaine', () => {
    it('calcule automatiquement le domaine depuis les points', () => {
        const scene = parseGeoScene('geo\npoint: A, 1, 2\npoint: B, 5, 8');
        expect(scene.domain).toBeDefined();
        expect(scene.domain!.x[0]).toBeLessThan(1);
        expect(scene.domain!.x[1]).toBeGreaterThan(5);
    });

    it('domaine: -3, 7, -2, 6 → utilisé tel quel', () => {
        const scene = parseGeoScene('geo\ndomaine: -3, 7, -2, 6');
        expect(scene.domain).toEqual({ x: [-3, 7], y: [-2, 6] });
    });

    it('domaine auto tient compte des cercles (Bug cercle hors domain)', () => {
        // circle: O, 4 → domaine doit contenir [-4,4] x [-4,4] au minimum
        const scene = parseGeoScene('geo\ncircle: O, 4');
        expect(scene.domain).toBeDefined();
        // Le cercle va de -4 à +4 en x et y → le domaine doit dépasser ces bornes
        expect(scene.domain!.x[0]).toBeLessThanOrEqual(-4);
        expect(scene.domain!.x[1]).toBeGreaterThanOrEqual(4);
        expect(scene.domain!.y[0]).toBeLessThanOrEqual(-4);
        expect(scene.domain!.y[1]).toBeGreaterThanOrEqual(4);
    });

    it('domaine auto avec cercle non centré en O', () => {
        // circle: C, 3 avec C(2,1) → domaine doit englober [-1,5] x [-2,4]
        const scene = parseGeoScene('geo\npoint: C, 2, 1\ncircle: C, 3');
        expect(scene.domain!.x[0]).toBeLessThanOrEqual(-1);
        expect(scene.domain!.x[1]).toBeGreaterThanOrEqual(5);
        expect(scene.domain!.y[0]).toBeLessThanOrEqual(-2);
        expect(scene.domain!.y[1]).toBeGreaterThanOrEqual(4);
    });
});

// ─── Parallèles / Perpendiculaires ───────────────────────────────────────────

describe('parseGeoScene — Perpendiculaires et Parallèles', () => {
    it('perpendiculaire crée une droite + un point auxiliaire _perp_', () => {
        const scene = parseGeoScene(
            'geo\npoint: A, 0, 0\npoint: B, 4, 0\npoint: P, 2, 0\nperpendiculaire: P, AB'
        );
        const lines = scene.objects.filter(o => o.kind === 'line');
        expect(lines.length).toBeGreaterThanOrEqual(1);
        const auxPoints = scene.objects.filter(o => o.kind === 'point' && (o as any).id.startsWith('_'));
        expect(auxPoints.length).toBeGreaterThanOrEqual(1);
        // Le point auxiliaire doit avoir style 'none'
        expect((auxPoints[0] as any).style).toBe('none');
    });
});
