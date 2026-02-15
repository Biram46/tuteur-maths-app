
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
            "CONSIGNE MATHÉMATIQUE :\n" +
            "- VECTEURS (IMPÉRATIF) : Absolument TOUS les vecteurs doivent porter une flèche LaTeX : utilise `\\vec{u}`, `\\vec{AB}`, `\\vec{v}`, etc.\n" +
            "- NE LAISSE JAMAIS un nom de vecteur sans sa flèche (ex : n'écris jamais 'AB' ou 'u' seul si tu parles d'un vecteur).\n" +
            "- Intervalle ouvert : $]a, b[$ (et non $(a, b)$).\n" +
            "- Décimales : utilise la virgule (ex: 3,14).\n" +
            "CONSIGNE FIGURES @@@ (IMPÉRATIF) :\n" +
            "- Pour TOUTE étude de fonction (variations, signes) ou demande de tracé, tu DOIS générer un bloc @@@.\n" +
            "- FORMAT GRAPHIQUE : @@@ Titre de la courbe | x1,y1 | x2,y2 | ... | xn,yn | domain:xmin,xmax,ymin,ymax @@@\n" +
            "- FORMAT ARBRE DE PROBABILITÉS : @@@ tree:Titre | Chemin, Probabilité | ... @@@\n" +
            "  * RÈGLE ARBRE (IMPÉRATIF) : Pour TOUT exercice de probabilités conditionnelles ou successions d'épreuves, tu DOIS impérativement générer cet arbre avant ton explication.\n" +
            "  * Utilise -> pour les niveaux. Exemple : @@@ tree:Bac | T, 0.45 | C, 0.35 | T -> H, 0.92 | T -> \\bar{H}, 0.08 @@@\n" +
            "- RÈGLE DÉCIMALE : Dans les blocs @@@, utilise impérativement le POINT (ex: 0.5). Dans ton texte explicatif, utilise la VIRGULE (ex: 0,5).\n" +
            "- RÈGLE COURBE LISSE : Pour une fonction, fournis au moins 8-10 points.\n" +
            "- VECTEURS (MODE ANALYTIQUE/GÉOMÉTRIQUE) :\n" +
            "  1. ANALYTIQUE (avec coordonnées) : @@@ Somme | vector:u,0,0,x1,y1 | ... @@@\n" +
            "  2. GÉOMÉTRIQUE (sans axes) : @@@ Somme | geometry | point:A,0,0 | vector:u,A,B | ... @@@\n" +
            "CONSIGNE TABLEAUX (IMPÉRATIF) :\n" +
            "- Les tableaux de signes et de variations DOIVENT être COMPLETS.\n" +
            "- N'utilise JAMAIS de tableaux Markdown simples ou texte (ASCII) pour les variations.\n" +
            "- Utilise EXCLUSIVEMENT l'environnement LaTeX `\\begin{array}` avec des flèches `\\nearrow` et `\\searrow`.\n" +
            "- Exemple : `$$\\begin{array}{c|ccc} x & a & & b \\\\ \\hline f(x) & 0 & \\nearrow & 1 \\end{array}$$`.\n" +
            "LISIBILITÉ :\n" +
            "- Français impeccable, pas de citations [1][2], listes à puces pour les calculs.\n" +
            "Sois pédagogue, décompose les étapes, mais donne TOUJOURS le résultat visuel final (graphique/tableau).\n" +
            "CONSTRAINTES PÉDAGOGIQUES À RESPECTER IMPÉRATIVEMENT :\n" + PEDAGOGICAL_CONSTRAINTS + "\n" +
            "Contexte académique : " + curriculumContext;

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
