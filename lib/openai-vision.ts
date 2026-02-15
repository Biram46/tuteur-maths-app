/**
 * Service d'analyse d'images via OpenAI GPT-4o
 * Ce service permet de transcrire des énoncés de mathématiques à partir de photos avec une grande précision.
 */

export async function analyzeMathImageWithOpenAI(base64Data: string, mimeType: string = "image/jpeg"): Promise<string> {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Clé API OpenAI non configurée (OPENAI_API_KEY)");

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Tu es un assistant expert en transcription mathématique. Ta mission est de lire une image contenant un exercice de mathématiques. Transcris l'énoncé EXACTEMENT tel qu'il est écrit. Utilise Markdown pour la structure et LaTeX pour les formules (entre dollars $...$ ou double dollars $$...$$). Ne résous pas l'exercice, contente-toi de transcrire l'énoncé."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Voici l'exercice à transcrire :" },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Data}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Erreur OpenAI Vision');
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error("Erreur OpenAI Vision:", error);
        throw new Error("Impossible de lire l'image avec GPT-4o. Vérifiez votre connexion.");
    }
}
