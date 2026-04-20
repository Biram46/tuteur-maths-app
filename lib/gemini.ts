import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Service d'analyse d'images via Google Gemini
 * Ce service permet de transcrire des énoncés de mathématiques à partir de photos ou PDFs.
 */

// Initialisation du client Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

/**
 * Analyse un fichier (Image ou PDF) et extrait l'énoncé mathématique
 * @param base64Data - Les données converties en base64
 * @param mimeType - Le type MIME du fichier
 * @returns Le texte extrait
 */
export async function analyzeMathImage(base64Data: string, mimeType: string = "image/jpeg"): Promise<string> {
    // Liste des modèles disponibles pour cette clé API, avec les versions "lite" en premier pour le quota
    const modelsToTry = [
        "gemini-2.0-flash-lite-preview-01-20", // Souvent plus de quota sur le free tier
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];

    let lastError: any = null;


    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `Tu es un assistant expert en transcription mathématique. 
Ta mission est de lire ce fichier (image ou document PDF) contenant un exercice de mathématiques.
Transcris l'énoncé EXACTEMENT tel qu'il est écrit. 
- Utilise Markdown pour la structure.
- Utilise LaTeX pour les formules (ex: $x^2 + 2x + 1 = 0$).
- Si tu vois un graphique ou un tableau, décris-le brièvement.
Ne résous pas l'exercice, contente-toi de transcrire l'énoncé.`;

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

        } catch (error: any) {
            lastError = error;
            console.error(`[Gemini] ❌ Échec avec ${modelName}:`, error.message);

            // Si c'est une erreur de quota (429), on tente quand même le modèle suivant (lite -> flash -> etc)
            if (error.message?.includes('429') || error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('not supported')) {
                continue;
            }
            // Si c'est une autre erreur bloquante, on s'arrête
            break;
        }
    }

    // Message d'erreur pédagogique si tout a échoué
    if (lastError?.message?.includes('429')) {
        throw new Error("Désolé, le quota gratuit de l'IA Google (Gemini) est temporairement épuisé. \n\n✅ SOLUTION : Faites une capture d'écran (Image) de votre PDF et renvoyez-la. Les images utilisent un moteur différent (OpenAI) qui est actuellement opérationnel !");
    }

    const finalMessage = lastError?.message || "Erreur inconnue lors de l'analyse.";
    throw new Error(`${finalMessage} (Note: Vérifiez votre connexion ou essayez de convertir en Image)`);
}
