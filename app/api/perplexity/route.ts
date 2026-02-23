
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
3. Utilise le format de bloc "math-table" pour les tableaux.

CONSIGNE TABLEAUX (ALIGNEMENT ET COMPLÉTUDE) :
Si tu as N valeurs sur l'axe x (ex: -inf, -2, 1, +inf -> N=4) :
- Chaque ligne 'sign:' DOIT impérativement contenir EXACTEMENT 2N-3 éléments.
- COMPLÉTUDE TOTALE : Tu n'as pas le droit de t'arrêter en cours de ligne. Tu dois fournir chaque signe et symbole jusqu'au dernier intervalle avant +inf.
- Pour une fraction, si un dénominateur s'annule en x0, tu DOIS mettre "||" sur la ligne f(x) à cette position.

MODÈLE STRICT :
\`\`\`math-table
x: -inf, 1, 3, +inf
sign: (x-1) : -, 0, +, +, +
sign: (x-3) : -, -, -, 0, +
sign: f(x) : +, 0, -, ||, +

x: -inf, 2, +inf
var: f(x) : +inf/+, searrow, -1/-, nearrow, +inf/+
\`\`\`

RÈGLES D'OR :
1. AXE X : Commence TOUJOURS par -inf et termine TOUJOURS par +inf. Ne répète JAMAIS une même valeur (ex: pas de "1, 1").
2. DÉCIMALES : Utilise la VIRGULE (ex: 0,5).
3. NOTATION : P_A(B) pour les probas conditionnelles.
4. VECTEURS : \\vec{u} ou \\vec{AB} impératif.

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
