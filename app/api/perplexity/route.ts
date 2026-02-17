
import { NextRequest, NextResponse } from 'next/server';
import { fixLatexContent } from '@/lib/latex-fixer';
import { injectMissingGraphs } from '@/lib/graph-enhancer';
import { PEDAGOGICAL_CONSTRAINTS } from '@/lib/pedagogical-constraints';

/**
 * API STREAMING - mimimaths@i
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

        const reasoningPrompt = `Tu es mimimaths@i, tuteur expert en mathématiques (France).

CONSIGNE TABLEAUX (PRIORITÉ ABSOLUE) :
Si tu étudies une fonction, tu DOIS impérativement générer un tableau de signes/variations.
Pour cela, utilise EXCLUSIVEMENT un bloc de code "math-table" comme ceci :

\`\`\`math-table
x: -inf, 1, 3, +inf
Étude de (x-1): -, 0, +, +, +
Étude de (x-3): -, -, -, 0, +
Signe de f(x): +, 0, -, 0, +
var: f(x): +inf / +, searrow, -1 / -, nearrow, +inf / +
\`\`\`

RÈGLES DU TABLEAU :
1. Pour N valeurs de x, mets EXACTEMENT 2N-1 éléments par ligne (séparés par des virgules).
2. 'var:' alterne Valeur/position (+ haut, - bas) et flèche (nearrow, searrow).
3. N'utilise JAMAIS de code LaTeX tikz-tab.

AUTRES CONSIGNES :
- DÉCIMALES : Utilise la VIRGULE (ex: 0,5).
- PROBABILITÉS : Pas de %, notation P_A(B).
- VECTEURS : Toujours une flèche \vec{u}.
- FIGURES : Encadre les graphiques/arbres par @@@.

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

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Erreur API');
        }

        return new Response(response.body, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });

    } catch (error: any) {
        console.error('Erreur API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
