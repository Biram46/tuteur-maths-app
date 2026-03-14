/**
 * POST /api/solve
 * ─────────────────────────────────────────────────────────────
 * Proxy vers l'API Python Flask /solve (SymPy).
 * Résout les équations polynomiales du second degré.
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.SYMPY_API_URL || process.env.PYTHON_API_URL || 'http://localhost:5000';

/**
 * Convertit une équation format utilisateur vers format SymPy
 * Ex: "2x² - 5x + 1 = 0" → "2*x**2-5*x+1=0"
 */
function formatForSymPy(equation: string): string {
    let result = equation.trim();

    // Remplacer les exposants Unicode
    result = result.replace(/²/g, '**2');
    result = result.replace(/³/g, '**3');
    result = result.replace(/⁴/g, '**4');

    // Remplacer ^ par **
    result = result.replace(/\^/g, '**');

    // Ajouter * entre coefficient et variable
    // 2x → 2*x, -5x → -5*x, etc.
    result = result.replace(/(\d)([xX])/g, '$1*$2');

    // Nettoyer les espaces
    result = result.replace(/\s+/g, '');

    return result;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { equation } = body;

        if (!equation) {
            return NextResponse.json({
                success: false,
                error: 'equation is required'
            }, { status: 400 });
        }

        // Formater pour SymPy
        const sympyEquation = formatForSymPy(equation);

        console.log(`[Solve] Original: "${equation}" → SymPy: "${sympyEquation}"`);

        // Appeler l'API Python
        const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5000';

        const response = await fetch(`${pythonApiUrl}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equation: sympyEquation }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: data.error || 'Python API error',
                sympy_equation: sympyEquation
            }, { status: response.status });
        }

        return NextResponse.json({
            ...data,
            original_equation: equation,
            sympy_equation: sympyEquation
        });

    } catch (error: any) {
        console.error('[Solve] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
