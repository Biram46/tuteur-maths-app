/**
 * POST /api/solve
 * ─────────────────────────────────────────────────────────────
 * Proxy vers l'API Python Flask /solve (SymPy).
 * Résout les équations polynomiales du second degré.
 */

import { NextRequest, NextResponse } from 'next/server';

// Durée max de la fonction Vercel (secondes) — nécessaire pour le cold start Render
export const maxDuration = 60;

const PYTHON_API = process.env.SYMPY_API_URL || process.env.PYTHON_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    // Timeout généreux pour gérer le cold start Render (plan gratuit ~30s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000);

    try {
        const body = await request.json();
        const { equation } = body;

        if (!equation) {
            clearTimeout(timeoutId);
            return NextResponse.json({
                success: false,
                error: 'equation is required'
            }, { status: 400 });
        }

        console.log(`[Solve] equation envoyée: "${equation}" → ${PYTHON_API}`);

        const response = await fetch(`${PYTHON_API}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equation }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: data.error || 'Python API error',
            }, { status: response.status });
        }

        return NextResponse.json({ ...data, original_equation: equation });

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[Solve] Error:', error?.message);

        if (error?.name === 'AbortError') {
            return NextResponse.json({
                success: false,
                error: 'Le serveur de calcul met trop de temps à répondre. Réessayez dans quelques secondes (démarrage en cours).'
            }, { status: 504 });
        }

        return NextResponse.json({
            success: false,
            error: error?.message || 'Erreur inconnue'
        }, { status: 500 });
    }
}
