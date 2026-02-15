import { NextRequest, NextResponse } from "next/server";
import { analyzeMathImageWithOpenAI } from "@/lib/openai-vision";
import { analyzeMathImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

    try {
        const { image, mimeType } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "Aucune donnée de fichier reçue." }, { status: 400 });
        }

        let transcription = "";
        const safeMimeType = mimeType || "image/jpeg";

        console.log(`[API Vision] Début traitement: ${safeMimeType} (${Math.round(image.length / 1024)} KB)`);

        // --- CAS DU PDF ---
        if (safeMimeType === "application/pdf") {
            console.log("[API Vision] Cible: PDF. Passage au moteur Gemini (Multi-pages/Multi-modal).");
            try {
                // On tente Gemini qui est le seul capable de lire nativement le PDF scanné ou texte
                transcription = await analyzeMathImage(image, safeMimeType);
            } catch (visionError: any) {
                console.error("[API Vision] ❌ Erreur Gemini:", visionError.message);

                // Si Gemini échoue (Quota/404), on donne une instruction claire pour utiliser OpenAI via screenshot
                if (visionError.message.includes('429') || visionError.message.includes('quota') || visionError.message.includes('404')) {
                    return NextResponse.json({
                        error: "QUOTA_EXCEEDED",
                        message: "Le quota gratuit de Google Gemini est épuisé ou indisponible.",
                        suggestion: "ASTUCE : Prenez une capture d'écran (Image) de votre PDF et envoyez-la ! Les images passent par OpenAI (GPT-4o) et fonctionnent actuellement parfaitement."
                    }, { status: 500 });
                }
                throw visionError;
            }
        }
        // --- CAS DE L'IMAGE ---
        else {
            console.log("[API Vision] Cible: IMAGE. Passage au moteur OpenAI (GPT-4o).");
            try {
                transcription = await analyzeMathImageWithOpenAI(image, safeMimeType);
            } catch (visionError: any) {
                console.error("[API Vision] ❌ Erreur OpenAI:", visionError.message);
                throw visionError;
            }
        }

        clearTimeout(timeoutId);
        console.log("[API Vision] ✅ Transcription réussie.");
        return NextResponse.json({ transcription });

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("[API Vision] 💥 Erreur Critique:", error);

        let msg = error.message || "Erreur interne lors de l'analyse";
        if (error.name === 'AbortError') msg = "Le traitement a pris trop de temps (timeout 60s).";

        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
