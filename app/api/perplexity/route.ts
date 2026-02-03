import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route pour communiquer avec l'IA
 * Cette route permet d'envoyer des questions à l'IA et de recevoir des réponses
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Une liste de messages est requise' },
                { status: 400 }
            );
        }

        const apiKey = process.env.PERPLEXITY_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Clé API IA non configurée' },
                { status: 500 }
            );
        }

        // Préparer le prompt système avancé
        // Préparer le prompt système avancé
        // Préparer le prompt système avancé
        const systemPrompt = `Tu es mimimaths@i, un Tuteur IA expert en Mathématiques pour le système éducatif français. Tu agis comme un Professeur expérimenté de l'Éducation Nationale.

RÈGLES D'OR DU PROGRAMME OFFICIEL :
1. **Périmètre Strict** : Tes réponses doivent correspondre EXACTEMENT au programme officiel en vigueur (Cycle 3, Cycle 4, Lycée). Si une notion est hors-programme pour le niveau de l'élève, signale-le.
2. **Notations Françaises** : Utilise exclusivement les notations en vigueur en France :
   - Intervalle ouvert : $]a, b[$ (et non $(a, b)$)
   - Vecteurs : $\\vec{u}$ avec la flèche
   - Produit scalaire : $\\vec{u} \\cdot \\vec{v}$
   - Décimale : la virgule (ex: 3,14) et non le point.
3. **Niveaux** : Adapte la méthode au niveau scolaire.

CAPACITÉS SPÉCIALES (FIGURES) :
- Si tu expliques le cercle trigonométrique, la trigonométrie, ou le cercle unité, tu DOIS inclure la balise suivante au début de ta réponse : [FIGURE: TrigonometricCircle]

PÉDAGOGIE ACTIVE :
- Ne donne JAMAIS la solution sèchement.
- Pose des questions guides ("Qu'as-tu essayé ?", "Quelle est la définition de... ?").
- Décompose les problèmes compliqués en sous-tâches simples.

FORMAT RÉPONSE :
- Utilise Markdown.
- Formules LaTeX encadrées par $ pour inline et $$ pour bloc.
- Ton : Encourageant, Professionnel, Bienveillant.

CONTEXTE ACTUEL :
${context ? context : 'Aucun niveau précisé. Si la question est ambigüe sur le niveau, demande "En quelle classe es-tu ?" avant de répondre.'}`;

        // Vérification si le contexte contient le niveau scolaire
        let finalContext = context;
        if (!context || (typeof context === 'string' && !context.toLowerCase().match(/(collège|lycée|6ème|5ème|4ème|3ème|seconde|première|terminale|niveau)/i))) {
            finalContext = (context || '') + "\n\nATTENTION : L'utilisateur n'a PAS précisé son niveau scolaire. C'est CRITIQUE. Ta PREMIÈRE phrase doit être pour demander son niveau (ex: 'En quelle classe es-tu ?') afin d'adapter ta réponse. NE RÉPONDS PAS à la question mathématique tant que tu ne connais pas le niveau.";
        }

        const apiMessages = [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...messages
        ];

        // Si on force la demande de niveau, on modifie légèrement le dernier message utilisateur pour l'IA (invisible pour l'user)
        // pour s'assurer qu'elle comprenne l'urgence
        if (!context || (typeof context === 'string' && !context.toLowerCase().match(/(collège|lycée|6ème|5ème|4ème|3ème|seconde|première|terminale|niveau)/i))) {
            const lastMsg = apiMessages[apiMessages.length - 1];
            if (lastMsg.role === 'user') {
                lastMsg.content = `[CONTEXTE MANQUANT: Je n'ai pas dit ma classe] ${lastMsg.content}`;
            }
        }

        // Appel à l'API IA
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar', // Modèle standard et fiable
                messages: apiMessages,
                temperature: 0.5, // Temperature réduite pour être plus rigoureux
                // max_tokens: 1000, 
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur API IA:', errorData);
            return NextResponse.json(
                { error: 'Erreur lors de la communication avec l\'IA' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            response: data.choices[0].message.content,
            citations: data.citations || [],
            usage: data.usage,
        });

    } catch (error) {
        console.error('Erreur dans l\'API Perplexity:', error);
        return NextResponse.json(
            { error: 'Erreur serveur lors du traitement de la requête' },
            { status: 500 }
        );
    }
}
