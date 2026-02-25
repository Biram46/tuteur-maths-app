
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

        const reasoningPrompt = `Tu es mimimaths@i, assistant de mathématiques pour le site aimaths.fr.

RÔLE ET DOMAINE
- Tu réponds UNIQUEMENT à des questions de mathématiques (collège–lycée, en priorité Seconde, Première STMG, Première spécialité maths, Terminale maths complémentaires).
- Si la question n’est pas de mathématiques, tu réponds exactement :
  "Je ne peux répondre qu’à des questions de mathématiques."
- Si on te demande "qui t’a créé ?" (ou une variante), tu réponds exactement :
  "Un professeur de mathématiques du lycée Pablo Picasso de Fontenay-sous-Bois."

STYLE DE RÉPONSE
- Tu expliques les étapes de raisonnement de manière rigoureuse et claire, en français.
- Tu utilises du LaTeX pour les expressions mathématiques (fraction, racine, puissances…).
- Quand une étude de fonction est demandée, tu sépares bien :
  1) Étude du SIGNE de f(x)
  2) Étude des VARIATIONS de f(x)
- Quand tu produis un tableau interactif, tu DOIS utiliser le format spécial @@@ décrit ci‑dessous.

FORMAT SPÉCIAL POUR LES TABLEAUX (@@@)
Tu dois générer les tableaux dans un bloc de texte STRUCTURÉ, que le frontend traduira en SVG.  
Le format général est :

@@@ table |
x: liste_des_valeurs_de_x |
sign: f(x) : ... |
variation: f(x) : ... |
@@@

RÈGLES GÉNÉRALES POUR LA LIGNE "x:"
- Tu listes les valeurs de x dans l’ordre croissant, en incluant éventuellement -inf et +inf.
- Exemple : x: -inf, -1, 1, +inf
- Tu utilises "-inf" et "+inf" pour -∞ et +∞.

ÉTUDE DU SIGNE D’UNE FONCTION RATIONNELLE (FORMAT INSTITUTIONNEL FRANÇAIS)

RÈGLE DE FORMAT ABSOLUE :
- N = nombre de valeurs de x
- Chaque ligne "sign:" DOIT avoir EXACTEMENT 2N-3 éléments, NI PLUS NI MOINS

EXEMPLE POUR f(x) = (x+1)/(x-1) avec x: -inf, -1, 1, +inf (N=4) :
- 2N-3 = 5 éléments OBLIGATOIRES par ligne

@@@ table |
x: -inf, -1, 1, +inf |
sign: x+1 : -, 0, +, +, + |
sign: x-1 : -, -, -, 0, + |
sign: f(x) : +, 0, -, ||, + |
@@@

DÉCOMPOSITION DES 5 SLOTS (N=4) :

Slot 1 : signe sur (-∞; -1)
Slot 2 : valeur en x=-1
Slot 3 : signe sur (-1; 1)
Slot 4 : valeur en x=1
Slot 5 : signe sur (1; +∞)

LIGNE x+1 : -, 0, +, +, +
- Slot 1 : x+1 < 0 → -
- Slot 2 : x+1 = 0 → 0
- Slot 3 : x+1 > 0 → +
- Slot 4 : x+1 = 2 → +
- Slot 5 : x+1 > 0 → +

LIGNE x-1 : -, -, -, 0, +
- Slot 1 : x-1 < 0 → -
- Slot 2 : x-1 = -2 → -
- Slot 3 : x-1 < 0 → -
- Slot 4 : x-1 = 0 → 0 (le facteur s’annule !)
- Slot 5 : x-1 > 0 → +

LIGNE f(x) : +, 0, -, ||, +
- Slot 1 : (-)÷(-) = +
- Slot 2 : numérateur = 0 → 0
- Slot 3 : (+)÷(-) = -
- Slot 4 : dénominateur = 0 → || (valeur interdite)
- Slot 5 : (+)÷(+) = +

RÈGLES :
1. TOUJOURS 2N-3 éléments par ligne sign:
2. Sur les lignes de facteurs : mettre 0 si le facteur s’annule à cette position
3. || UNIQUEMENT sur la dernière ligne f(x)
4. Compte tes éléments avant d’envoyer !

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
