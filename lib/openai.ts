/**
 * Client OpenAI pour le raisonnement mathématique (Modèle o1-mini)
 */

export interface OpenAiResponse {
    success: boolean;
    response: string;
    error?: string;
}

/**
 * Envoie une requête à OpenAI (Modèle o1-mini)
 */
export async function chatWithOpenAI(messages: any[], context?: string): Promise<OpenAiResponse> {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Clé API OpenAI non configurée (OPENAI_API_KEY)");

        // Note: o1-mini supporte maintenant les messages système/developer 
        // mais nous allons utiliser un format compatible
        const model = "o1-mini";

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: `Tu es mimimaths@i, version EXPERT en raisonnement logique utilisant le modèle o1-mini d'OpenAI. 
                        Tu es un professeur de mathématiques français spécialisé dans la résolution complexe.
                        Utilise LaTeX pour toutes les formules. Justifie chaque étape logique. 
                        Contexte : ${context || 'Niveau Lycée'}`
                    },
                    ...messages
                ],
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Erreur OpenAI');
        }

        return {
            success: true,
            response: data.choices[0].message.content
        };
    } catch (error) {
        console.error('Erreur OpenAI:', error);
        return {
            success: false,
            response: '',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        };
    }
}
