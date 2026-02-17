
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

        const reasoningPrompt = `Tu es mimimaths@i, tuteur expert en mathématiques.

CONSIGNE TABLEAUX (IMPÉRATIF) :
Pour toute étude de fonction, tu DOIS générer un tableau de signes ET un tableau de variations.
Utilise des blocs de code "math-table". 
IMPORTANT : Sépare les deux études en répétant la ligne "x:" pour chaque tableau.

MODÈLE STRICT :
\`\`\`math-table
x: -inf, 1, 3, +inf
sign: (x-1) : -, 0, +, +, +
sign: (x-3) : -, -, -, 0, +
sign: f(x) : +, 0, -, 0, +

x: -inf, 2, +inf
var: f(x) : +inf/+, searrow, -1/-, nearrow, +inf/+
\`\`\`

RÈGLES D'OR :
1. AXE X : Commence TOUJOURS par -inf et termine TOUJOURS par +inf. Sépare bien par des virgules.
2. ALIGNEMENT : Si tu as N valeurs sur l'axe x, tu dois donner (2N-3) éléments pour les signes (entre, sous, entre, sous, entre).
3. VARIATIONS : 'var:' alterne Valeur/Position et Flèche (searrow, nearrow). Positions: + (haut), - (bas).

RÈGLES GÉNÉRALES :
- DÉCIMALES : Utilise la VIRGULE (ex: 0,5).
- NOTATION : P_A(B) pour les probas.
- VECTEURS : \\vec{u} impératif.

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
