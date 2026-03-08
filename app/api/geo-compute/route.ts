/**
 * POST /api/geo-compute
 * ─────────────────────────────────────────────────────────────
 * Proxy vers l'API Python Flask /geo-compute (SymPy).
 * Calcule les mesures géométriques exactes : distances, aires,
 * périmètres, milieux, angles, vecteurs.
 *
 * Body  : { points: [{id,x,y}...], commands: ["distance AB"...] }
 * Return: { success, results: [{label, latex, approx}...] }
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL ?? 'http://localhost:5000';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { points, commands } = body;

        if (!Array.isArray(points) || !Array.isArray(commands)) {
            return NextResponse.json(
                { success: false, error: 'points et commands requis (arrays)' },
                { status: 400 }
            );
        }

        // Appel à l'API Python
        const resp = await fetch(`${PYTHON_API}/geo-compute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points, commands }),
            // Timeout 8 secondes (SymPy peut être lent sur gros calculs)
            signal: AbortSignal.timeout(8000),
        });

        if (!resp.ok) {
            const err = await resp.text();
            return NextResponse.json(
                { success: false, error: `Python API error ${resp.status}: ${err.slice(0, 300)}` },
                { status: 502 }
            );
        }

        const data = await resp.json();
        return NextResponse.json(data);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Si Python API hors ligne → retourner un résultat vide (graceful degradation)
        console.warn('[geo-compute] Python API indisponible:', msg);
        return NextResponse.json({
            success: false,
            error: msg,
            results: [],
        }, { status: 503 });
    }
}
