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
import { buildPedagogicalContext } from '@/lib/math-orchestrator';
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
                    // ── Enrichissement pédagogique via l'orchestrateur ──
                    const pedagogical = buildPedagogicalContext(expression, niveau, sympyResult);
                    const aiContext = pedagogical.promptInjection;
                    console.log(`[MathEngine] 📚 Classe: ${pedagogical.analysis.classe} | Méthode: ${pedagogical.analysis.method}`);
                    return NextResponse.json({
                        success: true,
                        aaaBlock: sympyResult.aaaBlock,
                        rawData: sympyResult,
                        criticalPoints: sympyResult.criticalPoints,
                        discriminantSteps: sympyResult.discriminantSteps ?? [],
                        factors: sympyResult.factors ?? [],
                        numZeros: sympyResult.numZeros ?? [],
                        denZeros: sympyResult.denZeros ?? [],
                        effectiveConst: sympyResult.effectiveConst ?? 1,
                        // ── Nouvelles données de l'orchestrateur ──
                        canonicalForm: sympyResult.canonicalForm ?? null,
                        limits: sympyResult.limits ?? null,
                        functionClass: pedagogical.analysis.classe,
                        pedagogicalMethod: pedagogical.analysis.method,
                        isBlocked: pedagogical.analysis.blocked,
                        blockReason: pedagogical.analysis.blockReason,
                        aiContext,
                        engine: 'sympy',
                    });
                }
                // ── Fallback : moteur JS ──
                console.log(`[MathEngine] ⚠️ SymPy échoué, FALLBACK JS pour "${expression}"`);
                let sympyDomainResult: any = null;
                try {
                    sympyDomainResult = await callDomainSympy(expression);
                } catch (e) {
                    console.warn('[MathEngine] SignTable Fallback: appel domaine échoué');
                }

                const result = generateSignTable({
                    expression,
                    numeratorFactors: options.numeratorFactors,
                    denominatorFactors: options.denominatorFactors,
                    searchDomain: options.searchDomain,
                    niveau: niveau as any,
                    sympyDomain: sympyDomainResult?.success ? {
                        domainLeft: sympyDomainResult.domainLeft,
                        domainStrict: sympyDomainResult.domainStrict,
                        forbiddenPoints: sympyDomainResult.forbiddenPoints,
                        domainLatex: sympyDomainResult.domainLatex,
                    } : undefined,
                });

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 422 });
                }

                return NextResponse.json({
                    success: true,
                    aaaBlock: result.aaaBlock,
                    rawData: result.tableSpec,
                    criticalPoints: result.criticalPoints,
                    aiContext: result.aiContext,
                    engine: 'js-fallback',
                });
            }

            // ───────────────────────────────────────────────────────
            case 'variation_table': {
                // ── Stratégie hybride (mise à jour) : 100% Python/SymPy pour f'(x), puis JS/Python pour le signe ──
                let derivativeExprForSympy: string | undefined;
                try {
                    const pythonApiUrl = process.env.SYMPY_API_URL || process.env.NEXT_PUBLIC_SYMPY_API_URL;
                    if (pythonApiUrl) {
                        const drRes = await fetch(`${pythonApiUrl}/derivative`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ expression }),
                            signal: AbortSignal.timeout(5000),
                        });
                        if (drRes.ok) {
                            const drData = await drRes.json();
                            if (drData.success && drData.factored_derivative_str) {
                                // Utiliser l'expression factorisée pour une meilleure évaluation des signes
                                // Remplacer double '*' pour pow par un seul '^' (format standard pour nos TS)
                                derivativeExprForSympy = drData.factored_derivative_str.replace(/\*\*/g, '^');
                                console.log(`[MathEngine] Variation: Python/SymPy f'(x) = ${derivativeExprForSympy}`);
                                
                                // Appeler SymPy pour le signe de f'(x)
                                const sympyDerivSign = await callSignTableSympy(derivativeExprForSympy, niveau);
                                if (sympyDerivSign.success && sympyDerivSign.fxValues) {
                                    console.log(`[MathEngine] Variation: ✅ SymPy signe f'(x) OK`);
                                    options.derivativeExpr = derivativeExprForSympy;
                                    (options as any).sympyDerivSign = sympyDerivSign;
                                }
                            }
                        }
                    }
                    if (!derivativeExprForSympy) {
                        // Fallback mathjs si l'API Python n'est pas dispo
                        const { computeDerivative } = require('@/lib/math-engine/expression-parser');
                        derivativeExprForSympy = computeDerivative(expression);
                        if (derivativeExprForSympy) {
                            console.log(`[MathEngine] Variation: MathJS f'(x) = ${derivativeExprForSympy}`);
                            const sympyDerivSign = await callSignTableSympy(derivativeExprForSympy, niveau);
                            if (sympyDerivSign.success && sympyDerivSign.fxValues) {
                                options.derivativeExpr = derivativeExprForSympy;
                                (options as any).sympyDerivSign = sympyDerivSign;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[MathEngine] Variation: calcul dérivée échoué', e);
                }

                let sympyDomainResult: any = null;
                try {
                    sympyDomainResult = await callDomainSympy(expression);
                } catch (e) {
                    console.warn('[MathEngine] Variation: appel domaine échoué');
                }

                const result = generateVariationTable({
                    expression,
                    niveau,
                    derivativeExpr: options.derivativeExpr,
                    searchDomain: options.searchDomain,
                    title: options.title,
                    sympyDomain: sympyDomainResult?.success ? {
                        domainLeft: sympyDomainResult.domainLeft,
                        domainStrict: sympyDomainResult.domainStrict,
                        forbiddenPoints: sympyDomainResult.forbiddenPoints,
                        domainLatex: sympyDomainResult.domainLatex,
                    } : undefined,
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
                    method: result.method,
                    aiContext: result.aiContext,
                });
            }

            case 'sign_and_variation': {
                // Générer les deux en parallèle
                let sympyDomainResult: any = null;
                try {
                    sympyDomainResult = await callDomainSympy(expression);
                } catch (e) {
                    console.warn('[MathEngine] Sign&Variation: appel domaine échoué');
                }

                // ── Mettre à profit le nouveau module Python SymPy ──
                let derivativeExprForSympy: string | undefined;
                try {
                    const pythonApiUrl = process.env.SYMPY_API_URL || process.env.NEXT_PUBLIC_SYMPY_API_URL;
                    if (pythonApiUrl) {
                        const drRes = await fetch(`${pythonApiUrl}/derivative`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ expression }),
                            signal: AbortSignal.timeout(5000),
                        });
                        if (drRes.ok) {
                            const drData = await drRes.json();
                            if (drData.success && drData.factored_derivative_str) {
                                derivativeExprForSympy = drData.factored_derivative_str.replace(/\*\*/g, '^');
                                const sympyDerivSign = await callSignTableSympy(derivativeExprForSympy, niveau);
                                if (sympyDerivSign.success && sympyDerivSign.fxValues) {
                                    options.derivativeExpr = derivativeExprForSympy;
                                    (options as any).sympyDerivSign = sympyDerivSign;
                                }
                            }
                        }
                    }
                    if (!derivativeExprForSympy) {
                        const { computeDerivative } = require('@/lib/math-engine/expression-parser');
                        derivativeExprForSympy = computeDerivative(expression);
                        if (derivativeExprForSympy) {
                            const sympyDerivSign = await callSignTableSympy(derivativeExprForSympy, niveau);
                            if (sympyDerivSign.success && sympyDerivSign.fxValues) {
                                options.derivativeExpr = derivativeExprForSympy;
                                (options as any).sympyDerivSign = sympyDerivSign;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[MathEngine] Sign&Variation: calcul dérivée échoué', e);
                }

                const [signResult, varResult] = await Promise.all([
                    Promise.resolve(generateSignTable({
                        expression,
                        numeratorFactors: options.numeratorFactors,
                        denominatorFactors: options.denominatorFactors,
                        searchDomain: options.searchDomain,
                        sympyDomain: sympyDomainResult?.success ? {
                            domainLeft: sympyDomainResult.domainLeft,
                            domainStrict: sympyDomainResult.domainStrict,
                            forbiddenPoints: sympyDomainResult.forbiddenPoints,
                            domainLatex: sympyDomainResult.domainLatex,
                        } : undefined,
                    })),
                    Promise.resolve(generateVariationTable({
                        expression,
                        niveau,
                        derivativeExpr: options.derivativeExpr,
                        searchDomain: options.searchDomain,
                        sympyDomain: sympyDomainResult?.success ? {
                            domainLeft: sympyDomainResult.domainLeft,
                            domainStrict: sympyDomainResult.domainStrict,
                            forbiddenPoints: sympyDomainResult.forbiddenPoints,
                            domainLatex: sympyDomainResult.domainLatex,
                        } : undefined,
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
            case 'derivative': {
                const pythonApiUrl = process.env.SYMPY_API_URL || process.env.NEXT_PUBLIC_SYMPY_API_URL;
                if (!pythonApiUrl) {
                    return NextResponse.json({ success: false, error: 'Aucune API SymPy configurée' }, { status: 500 });
                }
                const res = await fetch(`${pythonApiUrl}/derivative`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expression }),
                    signal: AbortSignal.timeout(5000),
                });
                if (!res.ok) {
                    return NextResponse.json({ success: false, error: `Erreur HTTP ${res.status}` }, { status: res.status });
                }
                const derivData = await res.json();
                if (!derivData.success) {
                    return NextResponse.json({ success: false, error: derivData.error }, { status: 500 });
                }
                
                // Préparer le contexte pédagogique pour l'IA
                const stepsBulletPoints = (derivData.steps || []).map((s: string) => `- ${s}`).join('\n');
                let aiContext = `[MODE MODULE DÉRIVATION]
Le système a calculé de manière exacte la dérivée de f(x) = ${derivData.original_latex}.

Voici les étapes de calcul algébrique formel (par composition) :
${stepsBulletPoints}

Résultat brut obtenu : ${derivData.raw_derivative_latex}
Résultat factorisé idéal : ${derivData.factored_derivative_latex}

TA MISSION :
Rédige une explication pédagogique claire, détaillée et bien formatée pour un élève de lycée.
Utilise les notations du lycée: u(x), v(x), u'(x), v'(x). JAMAIS la notation d/dx.
Conclus toujours en affichant l'expression finale factorisée entourée de $$ (LaTeX centré).`;

                return NextResponse.json({
                    success: true,
                    aiContext,
                    rawData: derivData
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
// APPEL API PYTHON — Tableau de signes SymPy
// ─────────────────────────────────────────────────────────────

async function callSignTableSympy(
    expression: string,
    niveau: string
): Promise<Record<string, any>> {
    // Priorité 1 : API Python séparée (SYMPY_API_URL)
    // Priorité 2 : Supabase Edge Function (fallback legacy)
    const pythonApiUrl = process.env.SYMPY_API_URL || process.env.NEXT_PUBLIC_SYMPY_API_URL;

    if (pythonApiUrl) {
        try {
            console.log(`[MathEngine] SymPy Python API: appel pour "${expression}"...`);
            const startTime = Date.now();
            const res = await fetch(`${pythonApiUrl}/sign-table`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expression, niveau }),
                signal: AbortSignal.timeout(5000),
            });
            const elapsed = Date.now() - startTime;

            if (!res.ok) {
                console.warn(`[MathEngine] SymPy Python API: HTTP ${res.status} (${elapsed}ms) → fallback JS`);
                return { success: false, error: `SymPy API HTTP ${res.status}` };
            }
            const result = await res.json();
            if (result.success) {
                console.log(`[MathEngine] SymPy Python API: ✅ succès en ${elapsed}ms`);
            } else {
                console.warn(`[MathEngine] SymPy Python API: ❌ ${result.error} (${elapsed}ms) → fallback JS`);
            }
            return result;
        } catch (err: any) {
            console.warn(`[MathEngine] SymPy Python API: ❌ ${err.message} → fallback JS`);
            return { success: false, error: err.message ?? 'Timeout SymPy API' };
        }
    }

    // Fallback Supabase Edge Function (legacy, probablement cassé)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[MathEngine] SymPy: aucune API configurée → fallback JS');
        return { success: false, error: 'Aucune API SymPy configurée' };
    }

    try {
        console.log(`[MathEngine] SymPy Edge Function (legacy): appel pour "${expression}"...`);
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
                signal: AbortSignal.timeout(45000),
            }
        );
        const elapsed = Date.now() - startTime;

        if (!res.ok) {
            console.warn(`[MathEngine] SymPy Edge: HTTP ${res.status} (${elapsed}ms) → fallback JS`);
            return { success: false, error: `SymPy HTTP ${res.status}` };
        }
        const result = await res.json();
        console.log(`[MathEngine] SymPy Edge: ✅ succès en ${elapsed}ms`);
        return result;
    } catch (err: any) {
        console.warn(`[MathEngine] SymPy Edge: ❌ ${err.message} → fallback JS`);
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

// ─────────────────────────────────────────────────────────────
// APPEL API PYTHON — Domaine de définition (SymPy)
// ─────────────────────────────────────────────────────────────

async function callDomainSympy(expression: string): Promise<Record<string, any>> {
    const pythonApiUrl = process.env.SYMPY_API_URL || process.env.NEXT_PUBLIC_SYMPY_API_URL;

    if (!pythonApiUrl) {
        return { success: false, error: 'Aucune API SymPy configurée' };
    }

    try {
        console.log(`[MathEngine] SymPy Domain API: appel pour "${expression}"...`);
        const startTime = Date.now();
        const res = await fetch(`${pythonApiUrl}/domain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expression }),
            signal: AbortSignal.timeout(5000),
        });
        const elapsed = Date.now() - startTime;

        if (!res.ok) {
            console.warn(`[MathEngine] SymPy Domain API: HTTP ${res.status} (${elapsed}ms)`);
            return { success: false, error: `SymPy Domain HTTP ${res.status}` };
        }
        const result = await res.json();
        console.log(`[MathEngine] SymPy Domain API: ✅ succès en ${elapsed}ms`);
        return result;
    } catch (err: any) {
        console.warn(`[MathEngine] SymPy Domain API: ❌ ${err.message}`);
        return { success: false, error: err.message ?? 'Timeout SymPy Domain API' };
    }
}
