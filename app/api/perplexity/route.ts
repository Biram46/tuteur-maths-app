
import { NextRequest, NextResponse } from 'next/server';
import { fixLatexContent } from '@/lib/latex-fixer';
import { injectMissingGraphs } from '@/lib/graph-enhancer';
import { PEDAGOGICAL_CONSTRAINTS } from '@/lib/pedagogical-constraints';

/**
 * API STREAMING - mimimaths@i (Optimize for Gemini/Nano Banana)
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();
        const perplexityKey = process.env.PERPLEXITY_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.DEEP_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!perplexityKey || (!deepseekKey && !openaiKey)) {
            return NextResponse.json({ error: 'Configs manquantes' }, { status: 500 });
        }

        const userQuestion = messages[messages.length - 1].content;

        // Perplexity pour le contexte de programme
        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'system', content: "Tu es expert Éducation Nationale." }, { role: 'user', content: `Programme scolaire : ${userQuestion}` }],
                temperature: 0.1,
            }),
        });

        const searchData = await searchResponse.json();
        const curriculumContext = searchData.choices?.[0]?.message?.content || "";

        const reasoningPrompt = `Tu es mimimaths@i, tuteur expert en mathématiques de l'Éducation Nationale française.

OBJECTIF : Etude de fonction rigoureuse.

CONSIGNE RÉPONSE :
1. "Etudier le signe" -> Génère UNIQUEMENT le tableau de signes de f(x). Ne génère PAS de tableau de variations sauf si spécifiquement demandé.
2. "Etudier la fonction" ou "Etude complète" -> Génère Signes ET Variations.
3. Format Interactif : TOUJOURS "@@@ table | ..." (OBLIGATOIRE).

RÈGLES DE CALCUL (ALGORITHME TUTEUR) :
1. ANALYSE CRITIQUE (OBLIGATOIRE) :
   - RACINE : f(x)=0 quand le NUMÉRATEUR est nul. Symbole '0' dans le tableau.
   - PÔLE : f(x) est NON DÉFINIE quand le DÉNOMINATEUR est nul. Symbole '||' (Valeur interdite).
   - EXEMPLE f(x)=(x+1)/(x-1) : Racine x=-1 (symbole 0), Pôle x=1 (symbole ||).
2. INTERVALLES ET FLÈCHES :
   - Si tu as N valeurs en X (ex: -inf, 1, +inf -> 3 valeurs), tu as EXACTEMENT N-1 intervalles (ex: 2 intervalles).
   - Tableau de variations : Il doit y avoir EXACTEMENT une flèche (ou une valeur) par intervalle. Pas de flèche en trop.
3. FORMAT 2N-3 (STRICT) :
   Si N est le nombre de valeurs en X, la ligne f(x) compte (2N-3) slots.
   - Slots IMPAIRS (1, 3, 5...) : Signe (+ ou -) ou Flèche.
   - Slots PAIRS (2, 4...) : 0 ou ||. JAMAIS de signe ici.

MODÈLE f(x)=(x+1)/(x-1) :
X: -inf, -1, 1, +inf (N=4) -> f(x) a 2*4-3 = 5 slots.
Raisonnement : x=-2 => +, x=0 => -, x=2 => +
@@@ table | x: -inf, -1, 1, +inf | sign: f(x) : +, 0, -, ||, + | @@@

INTERDICTIONS :
- Ne confonds JAMAIS racine (0) et valeur interdite (||).
- Ne mets JAMAIS de signe (+/-) sur une barre verticale.
- Pas de variations si l'utilisateur demande seulement le signe.

Context : ${curriculumContext}
${PEDAGOGICAL_CONSTRAINTS}`;

        const model = openaiKey ? 'o3-mini' : 'deepseek-reasoner';
        const apiUrl = openaiKey ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions';
        const apiKey = openaiKey || deepseekKey;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: reasoningPrompt }, ...messages],
                stream: true
            }),
        });

        return new Response(response.body, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });

    } catch (error: any) {
        console.error('Erreur API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
