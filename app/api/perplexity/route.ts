
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

ÉTUDE DU SIGNE UNIQUEMENT
- Si on te demande UNIQUEMENT l’étude du signe, tu RENVOIES seulement la ligne de signes (pas de variations).
- Format attendu pour f(x) = (x+1)/(x-1) :
  - Analyse mathématique :
    * Zéro : x = -1 (numérateur nul).
    * Valeur interdite (pôle) : x = 1 (dénominateur nul).
    * Signe : sur (-inf; -1) : +, en -1 : 0, sur (-1; 1) : -, en 1 : ||, sur (1; +inf) : +

  @@@ table |
  x: -inf, -1, 1, +inf |
  sign: f(x) : +, 0, -, ||, + |
  @@@

RÈGLES STRICTES POUR LA LIGNE "sign:"
On note N le nombre de valeurs de x (y compris -inf et +inf).  
On doit avoir EXACTEMENT 2N-3 éléments (slots) sur la ligne "sign: f(x) : ...".
- Les slots IMPAIRS (1, 3, 5, …) correspondent aux INTERVALLES et doivent contenir un signe + ou - (jamais vide si l’intervalle existe).
- Les slots PAIRS (2, 4, 6, …) correspondent aux POINTS CRITIQUES entre deux intervalles (0 ou ||).
- INTERDICTION : Ne JAMAIS mettre de signe + ou - sur un slot pair. Ne JAMAIS laisser un intervalle existant sans signe.

SYMBOLIQUE
- "0" : racine.
- "||" : valeur interdite.
- "D" : discontinuité dans la ligne de VARIATIONS.

TABLEAUX DE VARIATIONS (SI DEMANDÉ)
- variation: f(x) : ..., nearrow/valeur, D, searrow/valeur, ...
- Tu ne fais PAS passer de flèche de variation à travers une double barre / D.

RÉFÉRENCE f(x) = (x+1)/(x-1) (SIGNE + VARIATIONS) :
@@@ table |
x: -inf, -1, 1, +inf |
sign: f(x) : +, 0, -, ||, + |
variation: f(x) : -, nearrow/0, D, searrow/0, + |
@@@

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
