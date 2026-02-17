
import { NextRequest, NextResponse } from 'next/server';
import { fixLatexContent } from '@/lib/latex-fixer';
import { injectMissingGraphs } from '@/lib/graph-enhancer';
import { PEDAGOGICAL_CONSTRAINTS } from '@/lib/pedagogical-constraints';

/**
 * Route API Hybride en Streaming pour mimimaths@i
 * Avec POST-TRAITEMENT INTELLIGENT (LaTeX + Graphiques)
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();
        console.log('📬 API RECEIVED:', { messagesCount: messages.length, context });
        const perplexityKey = process.env.PERPLEXITY_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.DEEP_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!perplexityKey || (!deepseekKey && !openaiKey)) {
            return NextResponse.json({ error: 'Configurations API manquantes' }, { status: 500 });
        }

        const userQuestion = messages[messages.length - 1].content;

        // 1. RECHERCHE RAPIDE avec SOURCES OFFICIELLES PRIORITAIRES (Perplexity)
        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: "Tu es un documentaliste spécialisé dans les ressources de l'Éducation Nationale française."
                    },
                    { role: 'user', content: `Programme officiel lycée sur : ${userQuestion} (${context})` }
                ],
                temperature: 0.1,
            }),
        });

        const searchData = await searchResponse.json();
        if (!searchResponse.ok) {
            console.error('❌ Perplexity Error:', searchData);
            throw new Error(`Perplexity API error: ${searchResponse.status}`);
        }
        const curriculumContext = searchData.choices[0].message.content;
        console.log('✅ Perplexity Search Success');

        // 2. RÉPONSE (Moteur de raisonnement)
        const reasoningPrompt = "Tu es mimimaths@i, tuteur expert en mathématiques (programme français).\n" +
            "CONSIGNE TERMINOLOGIQUE (IMPÉRATIF) :\n" +
            "- N'utilise JAMAIS 'queue' ou 'tête' pour les vecteurs. Utilise exclusivement 'origine' et 'extrémité'.\n" +
            "CONSIGNE MATHÉMATIQUE (IMPÉRATIF) :\n" +
            "- PROBABILITÉS (RÈGLE ABSOLUE) : Le mot 'probabilité' ne doit JAMAIS être suivi d'un pourcentage. Dis 'La probabilité de E est 0,15' et JAMAIS 'La probabilité de E est 15 %'.\n" +
            "- NOTATION : Utilise EXCLUSIVEMENT la notation $P_A(B)$ for conditional prob (pas de $P(B|A)$).\n" +
            "- VECTEURS : Flèche LaTeX impérative `\\vec{u}`.\n" +
            "- RÈGLE DE LANGUE : EXCLUSIVEMENT en français.\n" +
            "- DÉCIMALES : Utilise la VIRGULE (ex: 0,5) dans le texte et LaTeX.\n" +
            "CONSIGNE FIGURES @@@ (IMPÉRATIF) :\n" +
            "- Tout contenu spécial (graphique, arbre, tableau) DOIT être encadré par @@@.\n" +
            "- FORMAT TABLEAU : @@@ table:Titre | x: -inf, 1, 3, +inf | sign: (x-1) : -, 0, +, +, + | sign: (x-3) : -, -, -, 0, + | sign: f(x) : +, 0, -, 0, + @@@\n" +
            "- RÈGLE DES 2N-1 : Si x a 4 valeurs (-inf, 1, 3, +inf), tu DOIS mettre 7 signes/éléments par ligne.\n" +
            "- RÈGLE TABLEAU : Étudie chaque facteur sur une ligne séparée. JAMAIS de LaTeX tkz-tab par défaut.\n" +
            "- FORMAT ARBRE : @@@ tree:Titre | A, 0.6 | \\bar{A}, 0.4 | A -> G, 0.3 | ... @@@\n" +
            "CONSTRAINTES PÉDAGOGIQUES :\n" +
            "- Justifier le signe de $\\Delta$ pour le second degré.\n" +
            "- DÉCIMALES : Virgule impérative (0,5).\n" +
            "- INTERVALLES : Style français $]a, b[$.\n" +
            "LISIBILITÉ :\n" +
            "- Français impeccable, listes à puces, pas de citations [1][2].\n" +
            "Contexte académique : " + curriculumContext + "\n" +
            "Règles supplémentaires : " + PEDAGOGICAL_CONSTRAINTS;

        if (openaiKey) {
            console.log('🚀 Tentative OpenAI o3-mini (STREAMING)...');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'o3-mini',
                    messages: [{ role: 'system', content: reasoningPrompt }, ...messages],
                    stream: true
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Erreur OpenAI');
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } else {
            console.log('🚀 Tentative DeepSeek (STREAMING)...');
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${deepseekKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'deepseek-reasoner',
                    messages: [{ role: 'system', content: reasoningPrompt }, ...messages],
                    stream: true
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Erreur DeepSeek');
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }
    } catch (error: any) {
        console.error('Erreur Route API:', error);
        return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
    }
}
