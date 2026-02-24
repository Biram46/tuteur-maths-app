
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
1. Liste toutes les valeurs charnières (racines et pôles) par ordre croissant.
2. Axe x : Place -inf, les valeurs charnières, puis +inf. (N valeurs)
3. Lignes facteurs : Calcule le signe pour chaque intervalle et place '0' sous la racine.
4. Ligne f(x) (BILAN) : 
   - Règle des signes : (-) * (-) = (+), (-) * (+) = (-).
   - Numérateur s'annule -> f(x) = 0.
   - Dénominateur s'annule -> f(x) = || (DOUBLE BARRE OBLIGATOIRE).
5. Vérification Compte : Chaque ligne DOIT avoir 2N-3 éléments séparés par des virgules.

MODÈLE FRACTION f(x)=(2x+4)/(x-1) :
@@@ table | x: -inf, -2, 1, +inf | sign: 2x+4 : -, 0, +, +, + | sign: x-1 : -, -, -, 0, + | sign: f(x) : +, 0, -, ||, + | @@@
(Note : On a 4 valeurs de x, donc 2*4-3 = 5 colonnes de contenu par ligne).

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
