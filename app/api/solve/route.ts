/**
 * POST /api/solve
 * ─────────────────────────────────────────────────────────────
 * Proxy vers l'API Python Flask /solve (SymPy).
 * Résout les équations polynomiales du second degré.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authWithRateLimit } from '@/lib/api-auth';

// Durée max de la fonction Vercel (secondes) — nécessaire pour le cold start Render
export const maxDuration = 60;

const PYTHON_API = process.env.SYMPY_API_URL || process.env.PYTHON_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    // Vérification d'authentification + rate limiting (20 req/min)
    const authResult = await authWithRateLimit(request, 20, 60_000);
    if (authResult instanceof NextResponse) return authResult;

    // Timeout généreux pour gérer le cold start Render (plan gratuit ~30s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000);

    try {
        const body = await request.json();
        const { equation, niveau } = body;

        if (!equation) {
            clearTimeout(timeoutId);
            return NextResponse.json({
                success: false,
                error: 'equation is required'
            }, { status: 400 });
        }

        // Nettoyage impitoyable : on coupe tout dès qu'on sort du domaine mathématique pur (ex: " avec le discriminant")
        // Autorise chiffres, x, X, opérateurs basiques, espaces, et point décimal. Dès qu'une lette non-x apparait, on coupe la string.
        let cleanEquation = equation.replace(/[^0-9xX\*\+\-\/\(\)\=\.\s].*$/, "").trim();

        console.log(`[Solve] equation originale envoyée: "${equation}", nettoyée: "${cleanEquation}" niveau=${niveau ?? 'non précisé'} → ${PYTHON_API}`);

        const response = await fetch(`${PYTHON_API}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equation: cleanEquation, niveau: niveau ?? 'terminale_spe' }),
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
