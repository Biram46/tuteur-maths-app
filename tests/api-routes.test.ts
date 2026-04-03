/**
 * Tests — Routes API (Anti-Régression)
 * Couverture : math-engine, perplexity, math-router, convert
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Math Engine Route ─────────────────────────────────────────────────────

describe.skip('API /api/math-engine — Anti-Régression', () => {
    it.skip('retourne success=false pour une expression vide', async () => {
        const { POST } = await import('@/app/api/math-engine/route');
        const req = new NextRequest('http://localhost/api/math-engine', {
            method: 'POST',
            body: JSON.stringify({ type: 'sign_table', expression: '' }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(false);
    });

    it('génère un tableau de signes pour 2x-4', async () => {
        const { POST } = await import('@/app/api/math-engine/route');
        const req = new NextRequest('http://localhost/api/math-engine', {
            method: 'POST',
            body: JSON.stringify({ type: 'sign_table', expression: '2*x-4' }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.criticalPoints).toBeDefined();
        expect(data.criticalPoints).toContain(2);
    });

    it('génère un tableau de variations pour x^2', async () => {
        const { POST } = await import('@/app/api/math-engine/route');
        const req = new NextRequest('http://localhost/api/math-engine', {
            method: 'POST',
            body: JSON.stringify({ type: 'variation_table', expression: 'x^2' }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it('gère les expressions avec fractions rationnelles', async () => {
        const { POST } = await import('@/app/api/math-engine/route');
        const req = new NextRequest('http://localhost/api/math-engine', {
            method: 'POST',
            body: JSON.stringify({ type: 'sign_table', expression: '(x+2)/(x-3)' }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(true);
        // Vérifier que x=3 est une valeur interdite
        expect(data.criticalPoints).toContain(3);
        expect(data.criticalPoints).toContain(-2);
    });

    it('gère les expressions avec racine carrée', async () => {
        const { POST } = await import('@/app/api/math-engine/route');
        const req = new NextRequest('http://localhost/api/math-engine', {
            method: 'POST',
            body: JSON.stringify({ type: 'sign_table', expression: 'sqrt(x+2)' }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(true);
    });
});

// ─── Math Router Route ─────────────────────────────────────────────────────

describe.skip('API /api/math-router — Anti-Régression', () => {
    it('route correctement une demande de tableau de signes', async () => {
        const { POST } = await import('@/app/api/math-router/route');
        const req = new NextRequest('http://localhost/api/math-router', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Étudier le signe de f(x) = (x+2)(x-3)',
                niveau: 'seconde'
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        console.log("TEST ROUTER DEBUG:", data);
        expect(data.analysis).toBeDefined();
        expect(data.analysis.intents).toHaveLength(1);
        expect(data.analysis.intents[0].intent).toBe('sign_table');
    });

    it('route correctement une demande de tableau de variations', async () => {
        const { POST } = await import('@/app/api/math-router/route');
        const req = new NextRequest('http://localhost/api/math-router', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Dresser le tableau de variations de g(x) = x^3',
                niveau: 'terminale_spe'
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.analysis.intents[0].intent).toBe('variation_table');
    });

    it('extrait correctement l\'expression f(x) = ...', async () => {
        const { POST } = await import('@/app/api/math-router/route');
        const req = new NextRequest('http://localhost/api/math-router', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Soit f(x) = 2x^2 - 3x + 1. Étudier le signe.',
                niveau: 'premiere_spe'
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.analysis.globalExpression).toContain('2');
    });

    it('gère les questions multiples', async () => {
        const { POST } = await import('@/app/api/math-router/route');
        const req = new NextRequest('http://localhost/api/math-router', {
            method: 'POST',
            body: JSON.stringify({
                message: '1) Étudier le signe de f(x) = 2x-4\n2) Résoudre f(x) > 0',
                niveau: 'seconde'
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.analysis.intents.length).toBeGreaterThanOrEqual(2);
    });

    it('retourne hasMathEngine=false pour une question non-mathématique', async () => {
        const { POST } = await import('@/app/api/math-router/route');
        const req = new NextRequest('http://localhost/api/math-router', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Bonjour, comment allez-vous ?',
                niveau: 'seconde'
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.analysis.hasMathEngine).toBe(false);
    });
});

// ─── Convert Route ─────────────────────────────────────────────────────────

describe('API /api/convert — Anti-Régression', () => {
    it('rejette les requêtes sans contenu', async () => {
        const { POST } = await import('@/app/api/convert/route');
        const req = new NextRequest('http://localhost/api/convert', {
            method: 'POST',
            body: JSON.stringify({}),
        });
        const res = await POST(req);
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

// ─── Geo Compute Route ─────────────────────────────────────────────────────

describe.skip('API /api/geo-compute — Anti-Régression', () => {
    it('calcule la distance entre deux points', async () => {
        const { POST } = await import('@/app/api/geo-compute/route');
        const req = new NextRequest('http://localhost/api/geo-compute', {
            method: 'POST',
            body: JSON.stringify({
                operation: 'distance',
                points: [
                    { name: 'A', x: 0, y: 0 },
                    { name: 'B', x: 3, y: 4 }
                ]
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.result).toBe(5);
    });

    it('calcule le milieu d\'un segment', async () => {
        const { POST } = await import('@/app/api/geo-compute/route');
        const req = new NextRequest('http://localhost/api/geo-compute', {
            method: 'POST',
            body: JSON.stringify({
                operation: 'midpoint',
                points: [
                    { name: 'A', x: 0, y: 0 },
                    { name: 'B', x: 4, y: 6 }
                ]
            }),
        });
        const res = await POST(req);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.result.x).toBe(2);
        expect(data.result.y).toBe(3);
    });
});
