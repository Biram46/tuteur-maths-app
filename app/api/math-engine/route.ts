/**
 * COUCHE 3 — API MOTEUR MATHÉMATIQUE
 * =====================================
 * Route Next.js : POST /api/math-engine
 *
 * Reçoit une requête de calcul mathématique et dispatch
 * vers le bon moteur selon le type de sortie demandé.
 *
 * Entrée JSON :
 * {
 *   type: MathOutputType,
 *   expression: string,
 *   niveau: NiveauLycee,
 *   options?: { ... }
 * }
 *
 * Sortie JSON :
 * {
 *   success: boolean,
 *   aaaBlock: string,     ← format @@@, prêt pour MathAssistant
 *   rawData: any,         ← données structurées (TableSpec, etc.)
 *   latex?: string,       ← expression LaTeX si applicable
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSignTable } from '@/lib/math-engine/sign-table-engine';
import { generateVariationTable } from '@/lib/math-engine/variation-engine';
import { generateGraphData } from '@/lib/math-engine/graph-engine';
import type { NiveauLycee } from '@/lib/niveaux';
import type { MathOutputType } from '@/lib/math-spec-types';

// ─────────────────────────────────────────────────────────────
// TYPES DE REQUÊTE
// ─────────────────────────────────────────────────────────────

interface MathEngineRequest {
    type: MathOutputType;
    expression: string;
    niveau: NiveauLycee;
    options?: {
        searchDomain?: [number, number];
        numeratorFactors?: { label: string; expr: string }[];
        denominatorFactors?: { label: string; expr: string }[];
        derivativeExpr?: string;
        title?: string;
        graphDomain?: [number, number, number, number];
        graphPoints?: { x: number; y: number; label?: string }[];
    };
}

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body: MathEngineRequest = await req.json();
        const { type, expression, niveau, options = {} } = body;

        if (!type || !expression) {
            return NextResponse.json(
                { success: false, error: 'Paramètres manquants : type et expression requis' },
                { status: 400 }
            );
        }

        console.log(`[MathEngine] type=${type} niveau=${niveau} expr="${expression}"`);

        switch (type) {
            // ───────────────────────────────────────────────────────
            case 'sign_table': {
                // ── Priorité 1 : Python/SymPy (déterministe, exact) ──
                const sympyResult = await callSignTableSympy(expression, niveau);
                if (sympyResult.success) {
                    console.log(`[MathEngine] ✅ MOTEUR SYMPY utilisé pour "${expression}"`);
                    return NextResponse.json({
                        success: true,
                        aaaBlock: sympyResult.aaaBlock,
                        rawData: sympyResult,
                        criticalPoints: sympyResult.criticalPoints,
                        // Étapes Δ pour les trinômes (injectées dans le contexte IA)
                        discriminantSteps: sympyResult.discriminantSteps ?? [],
                        engine: 'sympy',
                    });
                }
                // ── Fallback : moteur JS ──
                console.log(`[MathEngine] ⚠️ SymPy échoué, FALLBACK JS pour "${expression}"`);
                const result = generateSignTable({
                    expression,
                    numeratorFactors: options.numeratorFactors,
                    denominatorFactors: options.denominatorFactors,
                    searchDomain: options.searchDomain,
                });

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 422 });
                }

                return NextResponse.json({
                    success: true,
                    aaaBlock: result.aaaBlock,
                    rawData: result.tableSpec,
                    criticalPoints: result.criticalPoints,
                    engine: 'js-fallback',
                });
            }

            // ───────────────────────────────────────────────────────
            case 'variation_table': {
                const result = generateVariationTable({
                    expression,
                    niveau,
                    derivativeExpr: options.derivativeExpr,
                    searchDomain: options.searchDomain,
                    title: options.title,
                });

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 422 });
                }

                return NextResponse.json({
                    success: true,
                    aaaBlock: result.aaaBlock,
                    rawData: result.tableSpec,
                    derivativeExpr: result.derivativeExpr,
                    extrema: result.extrema,
                });
            }

            // ───────────────────────────────────────────────────────
            case 'sign_and_variation': {
                // Générer les deux en parallèle
                const [signResult, varResult] = await Promise.all([
                    Promise.resolve(generateSignTable({
                        expression,
                        numeratorFactors: options.numeratorFactors,
                        denominatorFactors: options.denominatorFactors,
                        searchDomain: options.searchDomain,
                    })),
                    Promise.resolve(generateVariationTable({
                        expression,
                        niveau,
                        derivativeExpr: options.derivativeExpr,
                        searchDomain: options.searchDomain,
                    })),
                ]);

                const errors = [
                    !signResult.success ? `Signes: ${signResult.error}` : null,
                    !varResult.success ? `Variations: ${varResult.error}` : null,
                ].filter(Boolean);

                return NextResponse.json({
                    success: errors.length === 0,
                    aaaBlock: [signResult.aaaBlock, varResult.aaaBlock].filter(Boolean).join('\n\n'),
                    rawData: {
                        signTable: signResult.tableSpec,
                        variationTable: varResult.tableSpec,
                    },
                    derivativeExpr: varResult.derivativeExpr,
                    extrema: varResult.extrema,
                    errors: errors.length > 0 ? errors : undefined,
                });
            }

            // ───────────────────────────────────────────────────────
            case 'graph': {
                const result = generateGraphData({
                    expression,
                    domain: options.graphDomain,
                    extraPoints: options.graphPoints,
                    title: options.title,
                });

                return NextResponse.json({
                    success: result.success,
                    aaaBlock: result.aaaBlock,
                    rawData: result.graphData,
                    error: result.error,
                });
            }

            // ───────────────────────────────────────────────────────
            case 'literal_calc': {
                // Pour les calculs symboliques complexes → appel à la Supabase Edge Function SymPy
                const sympyResult = await callSympyEngine(expression, niveau);
                return NextResponse.json(sympyResult);
            }

            // ───────────────────────────────────────────────────────
            default:
                return NextResponse.json(
                    { success: false, error: `Type non supporté : ${type}` },
                    { status: 400 }
                );
        }
    } catch (err: any) {
        console.error('[MathEngine] Erreur:', err);
        return NextResponse.json(
            { success: false, error: err.message ?? 'Erreur interne du moteur' },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────
// APPEL SUPABASE EDGE FUNCTION — Tableau de signes Python/SymPy
// ─────────────────────────────────────────────────────────────

async function callSignTableSympy(
    expression: string,
    niveau: string
): Promise<Record<string, any>> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[MathEngine] SymPy: config Supabase manquante → fallback JS');
        return { success: false, error: 'Config Supabase manquante' };
    }

    try {
        console.log(`[MathEngine] SymPy: appel pour "${expression}"...`);
        const startTime = Date.now();
        const res = await fetch(
            `${supabaseUrl}/functions/v1/sign-table-sympy`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ expression, niveau }),
                // 45s : le premier appel charge Pyodide+SymPy (~15-20s)
                // Les appels suivants sont rapides (~2-5s)
                signal: AbortSignal.timeout(45000),
            }
        );
        const elapsed = Date.now() - startTime;

        if (!res.ok) {
            console.warn(`[MathEngine] SymPy: HTTP ${res.status} (${elapsed}ms) → fallback JS`);
            return { success: false, error: `SymPy HTTP ${res.status}` };
        }
        const result = await res.json();
        console.log(`[MathEngine] SymPy: ✅ succès en ${elapsed}ms`);
        return result;
    } catch (err: any) {
        console.warn(`[MathEngine] SymPy: ❌ ${err.message} → fallback JS`);
        return { success: false, error: err.message ?? 'Timeout SymPy' };
    }
}

// ─────────────────────────────────────────────────────────────
// APPEL SUPABASE EDGE FUNCTION (SymPy générique)
// ─────────────────────────────────────────────────────────────

async function callSympyEngine(expression: string, niveau: NiveauLycee) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            success: false,
            error: 'Configuration Supabase manquante pour le moteur SymPy',
        };
    }

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/sympy-compute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expression, niveau }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const errText = await response.text();
            return { success: false, error: `SymPy Engine: ${response.status} — ${errText.slice(0, 200)}` };
        }

        return await response.json();
    } catch (err: any) {
        return { success: false, error: `SymPy Engine indisponible: ${err.message}` };
    }
}
