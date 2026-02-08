/**
 * Client DeepSeek pour le raisonnement mathématique intense
 */

export interface DeepSeekResponse {
    success: boolean;
    response: string;
    error?: string;
}

/**
 * Envoie une requête à DeepSeek R1 (via API officielle ou compatible OpenAI)
 */
export async function chatWithDeepSeek(messages: any[], context?: string): Promise<DeepSeekResponse> {
    try {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("Clé API DeepSeek non configurée");

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-reasoner', // C'est le nom pour DeepSeek-R1 (Reasoning model)
                messages: [
                    {
                        role: 'system',
                        content: `Tu es mimimaths@i, version EXPERT en raisonnement logique. 
                        Tu es un professeur de mathématiques français spécialisé dans la résolution complexe.
                        Utilise LaTeX pour toutes les formules. Justifie chaque étape logique. 
                        Contexte : ${context || 'Niveau Lycée'}`
                    },
                    ...messages
                ],
                temperature: 0.1, // Très bas pour maximiser la rigueur mathématique
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Erreur DeepSeek');
        }

        return {
            success: true,
            response: data.choices[0].message.content
        };
    } catch (error) {
        console.error('Erreur DeepSeek:', error);
        return {
            success: false,
            response: '',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        };
    }
}
