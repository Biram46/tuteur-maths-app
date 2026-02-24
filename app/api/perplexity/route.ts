
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
1. Si étude complète : Signes ET Variations.
2. Signes uniquement : Pas de variations.
3. Format Interactif : TOUJOURS "@@@ table | ..." (OBLIGATOIRE).

RÈGLES DU TABLEAU (ALGORITHME TUTEUR) :
1. VÉRIFICATION MATHÉMATIQUE (OBLIGATOIRE AVANT LE TABLEAU) :
   - Calcule racines (f(x)=0) et pôles (f(x) non déf).
   - Teste CHAQUE intervalle avec une valeur réelle.
   - Exemple pour (x+1)/(x-1) : sur ]1; +inf[, teste x=2 => f(2)=3 > 0 => SIGNE +
   - NE TE TROMPE PAS : un pôle ou une racine impaire change le signe.
2. FORMAT 2N-3 (STRICT) :
   Si N est le nombre de valeurs en X (-inf, +inf inclus), f(x) a (2N-3) slots.
   - Slots IMPAIRS (1, 3, 5...) : PLUS (+) ou MOINS (-). JAMAIS VIDE si l'intervalle existe.
   - Slots PAIRS (2, 4...) : 0 ou ||. JAMAIS de signe (+/-) ici.
3. SYMBOLES :
   - || : DOUBLE BARRE OBLIGATOIRE (Valeur interdite).
   - 0 : Racine.
   - D : Discontinuité (Variations).

DÉMONSTRATION f(x)=(x+1)/(x-1) :
X: -inf, -1, 1, +inf (N=4) -> 5 slots pour f(x).
Test x=-2 -> + | Test x=0 -> - | Test x=2 -> +
@@@ table | x: -inf, -1, 1, +inf | sign: f(x) : +, 0, -, ||, + | @@@

INTERDICTIONS :
- NE JAMAIS mettre un signe (+/-) sur une ligne verticale (slots pairs).
- NE JAMAIS laisser d'intervalle sans signe.
- Utilise la VIRGULE décimale.

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
