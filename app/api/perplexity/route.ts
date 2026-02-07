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
        const systemPrompt = `Tu es mimimaths@i, un Professeur de Mathématiques expert et bienveillant. 
Ton objectif est d'accompagner l'élève dans sa réflexion sans jamais donner la réponse brute immédiatement.

CONSIGNES DE RÉPONSE :
1. **Identité** : Agis comme un enseignant passionné. Évite les salutations robotiques ou répétitives du type "Bonjour, tu es en seconde". Entre directement dans le sujet de manière naturelle.
2. **Pédagogie** : Utilise la méthode socratique. Pose des questions pour guider l'élève ("À ton avis, quelle propriété pourrait s'appliquer ici ?", "Te souviens-tu de la définition de... ?").
3. **Programmes Français** : Respecte strictement le programme de l'Éducation Nationale (Collège/Lycée).
4. **Notations** : Utilise les conventions françaises ($]a, b[$ pour les intervalles, virgule pour les décimaux, $\\vec{u}$ pour les vecteurs).
5. **Rigueur** : Sois précis mathématiquement mais utilise un langage accessible.

FORMATAGE :
- Utilise Markdown pour la structure.
- Formules LaTeX obligatoires : $...$ pour l'inline et $$...$$ pour les blocs.
- Si tu parles du cercle trigonométrique, commence par la balise [FIGURE: TrigonometricCircle].

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
