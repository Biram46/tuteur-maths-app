import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Service d'analyse d'images via Google Gemini
 * Ce service permet de transcrire des énoncés de mathématiques à partir de photos.
 */

// Initialisation du client Gemini (l'IA Visuelle)
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

/**
 * Analyse une image et extrait l'énoncé mathématique
 * @param base64Image - L'image convertie en base64 (format Gemini)
 * @returns Le texte extrait de l'image
 */
export async function analyzeMathImage(base64Data: string, mimeType: string = "image/jpeg"): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Tu es un assistant expert en transcription mathématique. 
Ta mission est de lire cette image contenant un exercice de mathématiques (souvent manuscrit ou imprimé).
Transcris l'énoncé EXACTEMENT tel qu'il est écrit. 
- Utilise Markdown pour la structure.
- Utilise LaTeX pour les formules (ex: $x^2 + 2x + 1 = 0$).
- Si tu vois un graphique ou un tableau, décris-le brièvement.
Ne résous pas l'exercice, contente-toi de transcrire l'énoncé pour que le tuteur puisse ensuite le traiter.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erreur Gemini Vision:", error);
        throw new Error("Impossible de lire l'image. Assure-toi qu'elle est nette.");
    }
}
