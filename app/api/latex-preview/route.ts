/**
 * POST /api/latex-preview
 * ─────────────────────────────────────────────────────────────
 * Proxy vers l'API Python Flask /latex-preview (pdflatex).
 * Compile du LaTeX en PDF, convertit en PNG, retourne l'image base64.
 *
 * Body  : { latex: string, dpi?: number }
 * Return: { success, image: "data:image/png;base64,..." }
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL ?? 'http://localhost:5000';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { latex } = body;

        if (!latex || typeof latex !== 'string') {
            return NextResponse.json(
                { success: false, error: 'latex requis (string)' },
                { status: 400 }
            );
        }

        // Timeout 55s — cold start Render + compilation pdflatex
        const resp = await fetch(`${PYTHON_API}/latex-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex, dpi: body.dpi ?? 150 }),
            signal: AbortSignal.timeout(55_000),
        });

        if (!resp.ok) {
            const err = await resp.text();
            return NextResponse.json(
                { success: false, error: `Python API error ${resp.status}: ${err.slice(0, 500)}` },
                { status: resp.status === 503 ? 503 : 502 }
            );
        }

        const data = await resp.json();
        return NextResponse.json(data);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[latex-preview] Python API indisponible:', msg);
        return NextResponse.json({
            success: false,
            error: 'Service de compilation LaTeX indisponible',
        }, { status: 503 });
    }
}
