
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

CONSIGNE RÉPONSE :
1. Si l'utilisateur demande une étude complète ou que c'est pédagogiquement nécessaire, génère les deux tableaux (signes ET variations).
2. Si l'utilisateur demande UNIQUEMENT un tableau de signes, ne génère PAS le tableau de variations.
3. Utilise le format "@@@ table | ..." (OBLIGATOIRE).

MÉTHODE TABLEAU (ALGORITHME TUTEUR) :
1. Calculs Préalables (RAISONNEMENT) : Trouve roots (num=0) et poles (den=0). Calcule f(x) pour une valeur de test dans chaque intervalle pour ne pas te tromper de signe. Check la limite en +inf pour le signe final.
2. Axe x : Place -inf, les racines/pôles ordonnés, et +inf. (Soit N valeurs)
3. FORMAT 2N-3 (STRICT) : Chaque ligne générée (sign/var) doit avoir EXACTEMENT 2N-3 éléments.
   - Slot 1 : Intervalle ]x0, x1[ -> mets un signe (+/-).
   - Slot 2 : Sous x1 -> mets 0 ou ||.
   - Slot 3 : Intervalle ]x1, x2[ -> mets un signe (+/-).
   - ... etc.
4. Ligne f(x) (Règles) :
   - Sous une racine -> mets 0.
   - Sous un pôle -> mets || (DOUBLE BARRE OBLIGATOIRE).
   - Dans un intervalle -> JAMAIS de 0 ou ||. Uniquement + ou -.
5. Tableau de Variations :
   - Ne mets PAS d'image f(x) pour des points qui ne sont pas des extrema. (Pas de f(-1) si ce n'est pas un sommet).
   - Double barre : Utilise 'D' sous les pôles.

MODÈLE f(x)=(x+1)/(x-1) (x=-inf, -1, 1, +inf -> 4 valeurs -> 2*4-3 = 5 slots) :
[Raisonnement : x=-1 est racine, x=1 est pôle. Intervalle ]-inf, -1[: (-)/(-)=+. Intervalle ]-1, 1[: (+)/(-)=-. Intervalle ]1, +inf[: (+)/(+)=+.]
@@@ table | x: -inf, -1, 1, +inf | sign: f(x) : +, 0, -, ||, + | @@@

RÈGLES D'OR :
1. AXE X : Commence TOUJOURS par -inf et termine TOUJOURS par +inf. Jamais de doublons.
2. DÉCIMALES : Utilise la VIRGULE (ex: 0,5).
3. VECTEURS : \vec{u} ou \vec{AB} impératif.

Contexte : ${curriculumContext}
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
