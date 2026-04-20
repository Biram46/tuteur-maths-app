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
                        content: `Tu es un assistant expert en transcription mathématique pour le lycée français. Ta mission est de lire une image contenant un exercice de mathématiques et de le transcrire COMPLÈTEMENT.

RÈGLES :
- Transcris l'énoncé textuel EXACTEMENT tel qu'il est écrit.
- Utilise Markdown pour la structure et LaTeX pour les formules ($...$ ou $$...$$).
- Ne résous PAS l'exercice.

POUR LES COURBES ET GRAPHIQUES (PRIORITÉ ABSOLUE) :
- LIS les valeurs numériques exactes visibles sur les axes (graduations, nombres écrits).
- Pour chaque courbe, donne les COORDONNÉES EXACTES des points remarquables :
  • Intersections avec l'axe des x (zéros) → donne x
  • Intersections avec l'axe des y → donne y
  • Extrema (maximum/minimum) → donne (x, y)
  • Points d'inflexion, asymptotes → donne leur équation ou valeur
- Indique le pas de graduation sur chaque axe (ex: "axe x gradué de 1 en 1 de -3 à 5").
- Si une valeur n'est pas lisible avec certitude, écris "≈ valeur_approchée".
- Si tu vois un tableau de valeurs, transcris-le EXACTEMENT en Markdown.
- Si tu vois une figure géométrique, donne toutes les mesures et coordonnées indiquées.
- Si tu vois un tableau de signes ou de variations, transcris-le fidèlement.
- NE DIS PAS "je ne peux pas lire" — fais de ton mieux pour donner des valeurs approchées.`
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
