/**
 * MATH ROUTER — Routeur vers les moteurs mathématiques
 * ══════════════════════════════════════════════════════
 * Prend l'analyse d'intentions et appelle le bon moteur
 * pour chaque sous-question, puis retourne des blocs @@@
 * prêts à être injectés dans le contexte IA.
 *
 * ⚡ OPTIMISATION : Les moteurs JS sont appelés DIRECTEMENT
 * (import TS) au lieu de passer par HTTP → -200ms par requête.
 * SymPy (Python) reste en HTTP car c'est un service externe.
 */

import { analyzeQuestion, type DetectedIntent, type RouterAnalysis, INTENT_LABELS } from './intent-detector';
import { generateSignTable } from '../math-engine/sign-table-engine';
import { generateVariationTable } from '../math-engine/variation-engine';
import { generateGraphData } from '../math-engine/graph-engine';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface RoutedResult {
    questionNumber?: string;
    intent: string;
    intentLabel: string;
    expression: string | null;
    mathBlock: string | null;          // Bloc @@@ généré par le Math Engine
    textSummary: string | null;        // Résumé textuel pour le prompt IA
    aiContext?: string;                // Contexte IA généré localement
    discriminantSteps?: { factor: string; steps: string[] }[]; // Étapes Δ
    error?: string;
    /** Vrai si le moteur JS a échoué → l'IA doit générer le tableau */
    needsAI?: boolean;
}

export interface RouterOutput {
    results: RoutedResult[];
    contextForAI: string;       // Ce qu'on injecte dans le prompt Perplexity
    prerenderedBlocks: string;  // Les blocs @@@ à afficher directement
    hasResults: boolean;
    /** Vrai si au moins un résultat nécessite une génération IA du tableau */
    hasAIFallback?: boolean;
}

// ─────────────────────────────────────────────────────────────
// ROUTING VERS MATH ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * ⚡ Appelle les moteurs mathématiques DIRECTEMENT (sans HTTP).
 * SymPy reste en HTTP (service externe Supabase).
 */
async function callMathEngine(
    intent: DetectedIntent,
    niveau: string,
    baseUrl: string
): Promise<{ mathBlock: string | null; textSummary: string | null; aiContext?: string; discriminantSteps?: { factor: string; steps: string[] }[]; error?: string; needsAI?: boolean }> {
    if (!intent.expression) {
        return { mathBlock: null, textSummary: null, error: 'Expression non trouvée' };
    }

    const expression = intent.expression;

    try {
        switch (intent.intent) {

            // ── Tableau de signes (JS direct — instantané, ~1ms) ──
            case 'sign_table':
            case 'solve_inequality': {
                // Moteur JS sans aucun appel réseau.
                // Si le moteur échoue (expression complexe), on délègue à l'IA
                // avec un prompt structuré ultra-précis (mode non-déterministe).
                const signResult = generateSignTable({
                    expression,
                    niveau: niveau as 'Seconde' | 'Premiere' | 'Terminale',
                });
                if (!signResult.success) {
                    // Délégation à l'IA : ne pas retourner d'erreur bloquante
                    return {
                        mathBlock: null,
                        textSummary: null,
                        needsAI: true,
                        error: signResult.error,
                    };
                }
                return {
                    mathBlock: signResult.aaaBlock ?? null,
                    textSummary: null,
                    aiContext: signResult.aiContext,
                    discriminantSteps: signResult.discriminantSteps,
                };
            }

            // ── Tableau de variations (JS direct) ──
            case 'variation_table': {
                const varResult = generateVariationTable({ expression, niveau: niveau as any });
                if (!varResult.success) {
                    return { mathBlock: null, textSummary: null, error: varResult.error };
                }
                return { mathBlock: varResult.aaaBlock ?? null, textSummary: varResult.method ?? null, aiContext: varResult.aiContext };
            }

            // ── Graphique (JS direct) ──
            case 'graph': {
                const graphResult = generateGraphData({ expression });
                return { mathBlock: graphResult.aaaBlock ?? null, textSummary: null, error: graphResult.error };
            }

            // ── Calculs symboliques → SymPy via HTTP (service externe) ──
            case 'derivative':
            case 'integral':
            case 'factorize':
            case 'limits':
            case 'solve_equation': {
                const res = await fetch(`${baseUrl}/api/math-engine`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'literal_calc', expression, niveau }),
                    signal: AbortSignal.timeout(4000),
                });
                if (!res.ok) return { mathBlock: null, textSummary: null, error: `HTTP ${res.status}` };
                const data = await res.json();
                let aiContext;
                if (intent.intent === 'factorize' && (niveau && niveau.toLowerCase() !== 'seconde' && niveau.toLowerCase() !== '2de')) {
                    aiContext = "⚠️ EXIGENCE PÉDAGOGIQUE : Si l'expression est un polynôme du second degré ax² + bx + c ou s'y ramène, tu DOIS ABSOLUMENT détailler le calcul du discriminant Δ = b² - 4ac, puis calculer les racines x1 et x2, avant de conclure sur la forme factorisée a(x-x1)(x-x2). N'utilise JAMAIS les racines évidentes ou les formules directes sans montrer le passage par Δ.";
                } else if ((intent.intent === 'solve_equation' || intent.intent === 'factorize') && (niveau && (niveau.toLowerCase() === 'seconde' || niveau.toLowerCase() === '2de'))) {
                    aiContext = "⛔⛔⛔ DANGER PÉDAGOGIQUE ROUGE ⛔⛔⛔\nSi l'expression est un trinôme du second degré (avec x²) et que l'élève demande de la résoudre ou de la factoriser, MÊME SI tu vois le résultat calculé par le moteur au-dessus, TU NE DOIS PAS LE LUI DONNER ! Tu DOIS lui dire explicitement : 'En Seconde, la résolution sans forme factorisée est impossible car le discriminant n'est pas au programme. As-tu une indication ?' NE LUI DONNE SURTOUT PAS LES RACINES MAGIQUES (pas de factorisation par observation !).";
                }
                return { mathBlock: data.aaaBlock ?? null, aiContext, textSummary: null, error: data.error };
            }

            default:
                return { mathBlock: null, textSummary: null };
        }
    } catch (err: any) {
        return { mathBlock: null, textSummary: null, error: err.message };
    }
}

/**
 * Appel SymPy via l'API locale (qui relaie vers Supabase Edge Function).
 * Le résultat SymPy est exact (Python), mais plus lent que le JS.
 */
async function callSignTableSympy(
    expression: string,
    niveau: string,
    baseUrl: string
): Promise<Record<string, any>> {
    try {
        const res = await fetch(`${baseUrl}/api/math-engine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'sign_table', expression, niveau }),
            signal: AbortSignal.timeout(3000), // 3s max (réduit de 4s)
        });
        if (!res.ok) return { success: false };
        return await res.json();
    } catch {
        return { success: false };
    }
}

// ─────────────────────────────────────────────────────────────
// ROUTEUR PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Route toutes les intentions d'une question vers les bons moteurs.
 * Retourne les résultats et le contexte à injecter dans Perplexity.
 */
export async function routeQuestion(
    userMessage: string,
    niveau: string,
    baseUrl: string
): Promise<RouterOutput> {
    const analysis: RouterAnalysis = analyzeQuestion(userMessage, niveau);

    if (!analysis.hasMathEngine) {
        return {
            results: [],
            contextForAI: '',
            prerenderedBlocks: '',
            hasResults: false,
        };
    }

    // Traiter toutes les intentions en parallèle
    const results: RoutedResult[] = await Promise.all(
        analysis.intents.map(async (intent): Promise<RoutedResult> => {
            if (intent.intent === 'unknown') {
                return {
                    questionNumber: intent.questionNumber,
                    intent: intent.intent,
                    intentLabel: INTENT_LABELS[intent.intent],
                    expression: intent.expression,
                    mathBlock: null,
                    textSummary: null,
                };
            }

            const engineResult = await callMathEngine(intent, niveau, baseUrl);
            const { mathBlock, textSummary, aiContext, discriminantSteps, error, needsAI } = engineResult;

            return {
                questionNumber: intent.questionNumber,
                intent: intent.intent,
                intentLabel: INTENT_LABELS[intent.intent],
                expression: intent.expression,
                mathBlock,
                textSummary,
                aiContext,
                discriminantSteps,
                error,
                needsAI,
            };
        })
    );

    // Construire le contexte pour Perplexity
    const contextLines: string[] = [
        '══════════════════════════════════════════════',
        '  RÉSULTATS PRÉ-CALCULÉS PAR LE MATH ENGINE',
        '══════════════════════════════════════════════',
        `Expression principale : ${analysis.globalExpression ?? 'voir ci-dessous'}`,
        '',
        'Tu DOIS utiliser ces résultats ci-dessous dans ta réponse.',
        'Ces tableaux sont déjà calculés — ne les recalcule pas toi-même.',
        'Explique-les pédagogiquement et réponds aux autres sous-questions.',
        '',
    ];

    const prerenderedParts: string[] = [];

    for (const result of results) {
        const qLabel = result.questionNumber ? `Question ${result.questionNumber}` : 'Question';
        contextLines.push(`--- ${qLabel} : ${result.intentLabel} ---`);

        // Étapes Δ pour les trinômes (AVANT le tableau, obligatoire programme)
        if (result.discriminantSteps && result.discriminantSteps.length > 0) {
            contextLines.push('📐 Calcul du discriminant Δ (à montrer AVANT le tableau de signes) :');
            for (const ds of result.discriminantSteps) {
                contextLines.push(`  Facteur : ${ds.factor}`);
                for (const step of ds.steps) {
                    contextLines.push(`  ${step}`);
                }
            }
            contextLines.push('');
        }

        if (result.mathBlock) {
            contextLines.push(`Tableau calculé (reproduire ce bloc dans ta réponse) :`);
            contextLines.push(result.mathBlock);
            prerenderedParts.push(result.mathBlock);
        } else if (result.needsAI) {
            // Le moteur JS a échoué → l'IA doit générer le tableau en format @@@
            contextLines.push(`⚠ Moteur JS insuffisant pour cette expression (${result.expression}).`);
            contextLines.push(`→ TU DOIS générer toi-même le tableau de signes en format @@@ table.`);
            contextLines.push(`→ Expression : f(x) = ${result.expression}`);
            contextLines.push(`→ Respecte EXACTEMENT la syntaxe @@@, 1 ligne sign: par facteur.`);
        } else if (result.textSummary) {
            contextLines.push(`Résultat : ${result.textSummary}`);
        } else if (result.error) {
            contextLines.push(`⚠ Erreur moteur : ${result.error} — répondre manuellement.`);
        } else if (result.intent === 'unknown') {
            contextLines.push(`→ Répondre librement à cette sous-question.`);
        }
        
        if (result.aiContext) {
            contextLines.push(`\n--- CONSIGNES ANTI-HALLUCINATION DU MOTEUR MATHEMATIQUE ---`);
            contextLines.push(result.aiContext);
        }
        
        contextLines.push('');
    }

    contextLines.push('══════════════════════════════════════════════');

    // Un résultat needsAI = l'IA doit générer le tableau → hasResults=false pour ne pas bloquer l'IA
    const hasAIFallback = results.some(r => r.needsAI);
    return {
        results,
        contextForAI: contextLines.join('\n'),
        prerenderedBlocks: prerenderedParts.join('\n\n'),
        hasResults: results.some(r => r.mathBlock !== null),
        hasAIFallback,
    };
}

// ─────────────────────────────────────────────────────────────
// QUICK PREVIEW (côté client — pour afficher l'analyse)
// ─────────────────────────────────────────────────────────────

/**
 * Retourne un résumé lisible de ce que le routeur va faire.
 * Utilisé pour afficher "🔄 Analyse en cours…" dans le chat.
 */
export function getRoutingPreview(userMessage: string): string {
    const analysis = analyzeQuestion(userMessage);
    if (!analysis.hasMathEngine) return '';

    const engineIntents = analysis.intents.filter(i => i.intent !== 'unknown');
    if (engineIntents.length === 0) return '';

    const lines = engineIntents.map(i =>
        `  ${i.questionNumber ? `Q${i.questionNumber} →` : '→'} ${INTENT_LABELS[i.intent]}${i.expression ? ` [${i.expression}]` : ''}`
    );

    return `🔄 *Calculs en cours…*\n${lines.join('\n')}`;
}
