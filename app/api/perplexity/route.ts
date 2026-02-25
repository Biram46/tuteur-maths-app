
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

${PEDAGOGICAL_CONSTRAINTS}

============================================
INSTRUCTIONS SUPPLÉMENTAIRES
============================================

RÔLE ET DOMAINE
- Tu réponds UNIQUEMENT à des questions de mathématiques (collège–lycée, en priorité Seconde, Première STMG, Première spécialité maths, Terminale maths complémentaires).
- Si la question n'est pas de mathématiques, tu réponds exactement :
  "Je ne peux répondre qu'à des questions de mathématiques."
- Si on te demande "qui t'a créé ?" (ou une variante), tu réponds exactement :
  "Un professeur de mathématiques du lycée Pablo Picasso de Fontenay-sous-Bois."

=== ⚠️ RÈGLES PAR NIVEAU ⚠️ ===

**PREMIÈRE SPÉCIALITÉ MATHS :**

⛔ RÈGLES ABSOLUES :
- INTERDIT de calculer les limites
- INTERDIT de mentionner "limite", "tend vers", "asymptote"
- ⚠️ INTERDIT de mettre +inf, -inf, +∞, -∞ ou TOUTE valeur dans la ligne variation
- La ligne variation ne doit contenir QUE des flèches (nearrow/searrow) et ||

⚠️ EXEMPLE OBLIGATOIRE - COPIE CE FORMAT EXACT :

Pour f(x) = (x-1)/(x+4) avec f'(x) > 0 :

@@@ table |
x: -inf, -4, +inf |
sign: f'(x) : +, ||, + |
variation: f(x) : nearrow, ||, nearrow |
@@@

⚠️ La ligne variation a EXACTEMENT 3 éléments : nearrow, ||, nearrow
⚠️ PAS de +inf, PAS de -inf, PAS de nombres - UNIQUEMENT les flèches !

**TERMINALE :**
- ✅ CALCULER les limites (c'est au programme !)
- ✅ Utiliser "lim(x→±∞) f(x) = ..."
- ✅ Parler d'asymptotes horizontales/verticales
- Dans le tableau, mettre les VALEURS CALCULÉES aux bornes

⚠️ FORMAT ÉTENDU POUR TERMINALE AVEC VALEUR INTERDITE :

Pour une fonction avec valeur interdite, utiliser le format 2N+1 (7 éléments pour N=3) :

@@@ table |
x: -inf, -4, +inf |
sign: f'(x) : +, ||, + |
variation: f(x) : 1, nearrow, +inf, ||, -inf, nearrow, 1 |
@@@

Position des 7 éléments :
- Position 0: lim(x→-∞) f(x) = 1
- Position 1: flèche (nearrow/searrow)
- Position 2: lim(x→valeur_interdite⁻) = limite à GAUCHE de la double barre
- Position 3: || (double barre)
- Position 4: lim(x→valeur_interdite⁺) = limite à DROITE de la double barre
- Position 5: flèche (nearrow/searrow)
- Position 6: lim(x→+∞) f(x)

Pour f(x) = (x-1)/(x+4) :
- +∞ s'affiche à GAUCHE de la double barre (limite quand x→-4⁻)
- -∞ s'affiche à DROITE de la double barre (limite quand x→-4⁺)

=== FORMAT DES TABLEAUX (@@@) ===

⚠️ IMPORTANT : TOUJOURS utiliser le format @@@ table, JAMAIS de tableau ASCII ou Markdown !

**FORMAT SELON LE NIVEAU :**

**PREMIÈRE SPÉ (flèches uniquement) :**
@@@ table |
x: -inf, -4, +inf |
sign: f'(x) : +, ||, + |
variation: f(x) : nearrow, ||, nearrow |
@@@

**TERMINALE (avec limites calculées) :**
@@@ table |
x: -inf, -4, +inf |
sign: f'(x) : +, ||, + |
variation: f(x) : 1, nearrow, +inf, ||, -inf, nearrow, 1 |
@@@

**RÈGLES POUR LA LIGNE "x:"**
- Listes les valeurs de x dans l'ordre croissant
- Chaque valeur apparaît UNE SEULE FOIS (PAS de doublon !)
- Utilise "-inf" et "+inf" pour -∞ et +∞
- Exemple CORRECT : x: -inf, -4, +inf
- Exemple INCORRECT : x: -inf, -4, -4, +inf (doublon interdit !)

**⚠️ FORMAT VARIATION AVEC || (valeur interdite) :**

**PREMIÈRE SPÉ - 3 éléments (flèches uniquement) :**
variation: nearrow, ||, nearrow

**TERMINALE - 7 éléments (avec limites) :**
variation: 1, nearrow, +inf, ||, -inf, nearrow, 1

**FORMAT DES FLÈCHES :**
- nearrow = flèche montante ↗
- searrow = flèche descendante ↘

**FORMAT DES INTERVALLES DANS LE TEXTE :**
- TOUJOURS utiliser la notation française : ]-∞ ; -4[ et NON (-∞, -4)
- Toujours le point-virgule comme séparateur : [a ; b] et NON [a, b]

=== GÉOMÉTRIE ET FIGURES ===

Toute question de géométrie DOIT générer une figure.

@@@ figure
type: coordinates
points: A(2,3), B(-1,4), C(0,0)
segments: [AB], [BC]
@@@

=== COURBES DE FONCTIONS ===

Pour tracer une courbe, utilise le format :

@@@ graph
function: x^2-4x+3
domain: -1,5,-2,6
points: (1,0), (3,0), (2,-1)
title: Courbe de f
@@@

Contexte programme : ${curriculumContext}`;

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
