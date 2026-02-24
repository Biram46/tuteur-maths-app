
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
1. Analyse : Détermine les racines (numérateur) et pôles (dénominateur).
2. Axe x : Place -inf, les racines/pôles par ordre croissant, et +inf. (Soit N valeurs)
3. CONTENU (IMPÉRATIF) : Chaque ligne de contenu (sign ou var) doit comporter EXACTEMENT 2N-3 éléments séparés par des VIRGULES.
   - Slot 1 : Entre x0 et x1
   - Slot 2 : Sous x1
   - Slot 3 : Entre x1 et x2
   - ... etc.
4. Ligne f(x) (Signes) :
   - Sous une racine -> mets 0.
   - Sous un pôle (valeur interdite) -> mets || (DOUBLE BARRE).
   - Dans un intervalle -> mets + ou -. Jamais de 0 dans un intervalle.
5. Ligne Variations :
   - Extremas : Ne mets la valeur f(x) QUE pour les extremas locaux ou les bornes.
   - Points de passage : Ne mets JAMAIS f(x) pour une valeur de x qui n'est pas un extremum (ex: si x=-1 n'est pas un sommet, ne mets pas f(-1)).
   - Double barre : Utilise 'D' sous les pôles dans \\tkzTabVar.

MODÈLE f(x)=(x+1)/(x-1) (x=-inf, -1, 1, +inf -> 4 valeurs -> 2*4-3 = 5 slots) :
@@@ table | x: -inf, -1, 1, +inf | sign: x+1 : -, 0, +, +, + | sign: x-1 : -, -, -, 0, + | sign: f(x) : +, 0, -, ||, + | @@@

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
