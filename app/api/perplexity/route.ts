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
        // Préparer le prompt système avancé
        const systemPrompt = `Tu es mimimaths@i, un Professeur de Mathématiques expert de l'Éducation Nationale (France). 
Ton objectif est d'accompagner l'élève avec une rigueur pédagogique absolue tout en restant bienveillant.

STRUCTURE DE RÉPONSE OBLIGATOIRE :
À chaque nouvelle notion abordée, tu dois suivre ce plan :
1. **📘 Rappel du Cours** : Explique la notion de manière concise et claire selon le programme officiel (Seconde, Première, Terminale, etc.).
2. **💡 Exemple Traité** : Donne un exemple concret, rédige-le entièrement pour montrer la méthode de rédaction attendue au Bac/Brevet.
3. **✍️ À ton tour (Exercices)** : Propose 1 ou 2 exercices d'application directe. Attends que l'élève réponde pour le corriger.

CONSIGNES DE RÉDACTION :
- **Programmes Officiels** : Utilise les termes exacts des programmes français (ex: "variations", "dérivation", "limites", "continuité").
- **Méthode Socratique** : Ne donne jamais la solution finale de l'exercice proposé sans que l'élève ait essayé.
- **Rigueur** : Toujours justifier les étapes (ex: "D'après le théorème de Pythagore...").
- **Notation** : Notation française stricte ($[a, b]$, $\vec{u}$, virgule pour les décimaux).

FORMATAGE TECHNIQUE & VISUELS :
- **LaTeX** : Utilise OBLIGATOIREMENT LaTeX pour TOUTE expression mathématique ($x$ pour l'inline, $$f(x)=...$$ pour les blocs).
- **Tableaux** : Pour les tableaux de signes ou de variations, utilise des blocs de code LaTeX avec \\begin{array} ou un formatage Markdown très soigné.
- **Figures** : 
  - Cercle trigonométrique : utilise la balise [FIGURE: TrigonometricCircle].
  - Courbe de fonction : Si pertinent, décris les points clés et dis : "Voici la courbe de f..." suivi de [FIGURE: FunctionGraph: f(x)=...].
  - Arbre de probabilité : Utilise des tabulations et symboles ou décris-le précisément.
- **Recherche Web & Sources** : Pour toute vérification de programme ou de réforme, tu dois accorder une priorité absolue aux sources officielles : **Eduscol**, le **Bulletin Officiel (BO)**, et les sites des **Académies** françaises. Cite ces sources si nécessaire pour rassurer l'élève sur la conformité de tes explications.

CONTEXTE : ${context || 'Niveau non précisé.'}`;

        const apiMessages = [
            {
                role: 'system',
                content: systemPrompt,
            },
            ...messages
        ];

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
