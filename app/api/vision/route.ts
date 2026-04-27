import { NextRequest, NextResponse } from "next/server";
import { analyzeMathImage } from "@/lib/gemini";
import { authWithRateLimit } from "@/lib/api-auth";
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VISION_PROMPT = `Tu es un assistant expert en transcription mathématique.
Ta mission est de lire cette image contenant un exercice de mathématiques.
Transcris l'énoncé EXACTEMENT tel qu'il est écrit.
- Utilise Markdown pour la structure.
- Utilise LaTeX pour les formules (ex: $x^2 + 2x + 1 = 0$).
- Si tu vois un graphique ou un tableau, décris-le brièvement.
Ne résous pas l'exercice, contente-toi de transcrire l'énoncé.`;

async function analyzeImageWithClaude(base64: string, mimeType: string): Promise<string> {
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mimeType as Anthropic.Base64ImageSource['media_type'],
                        data: base64,
                    },
                },
                { type: 'text', text: VISION_PROMPT },
            ],
        }],
    });
    const block = response.content[0];
    if (block.type !== 'text') throw new Error('Réponse Claude inattendue');
    return block.text;
}

export async function POST(request: NextRequest) {
    const auth = await authWithRateLimit(request, 15, 60_000);
    if (auth instanceof NextResponse) return auth;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const { image, mimeType } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "Aucune donnée de fichier reçue." }, { status: 400 });
        }

        let transcription = "";
        const safeMimeType = mimeType || "image/jpeg";
        console.log(`[API Vision] Début traitement: ${safeMimeType} (${Math.round(image.length / 1024)} KB)`);

        if (safeMimeType === "application/pdf") {
            // PDF : Gemini uniquement (lit nativement les PDFs multi-pages)
            console.log("[API Vision] Cible: PDF → Gemini.");
            transcription = await analyzeMathImage(image, safeMimeType);
        } else {
            // Image : Gemini Flash (gratuit) → Claude Haiku (fallback)
            try {
                console.log("[API Vision] Cible: IMAGE → Gemini Flash.");
                transcription = await analyzeMathImage(image, safeMimeType);
            } catch (geminiError: any) {
                console.warn("[API Vision] Gemini échoué, fallback Claude Haiku:", geminiError.message);
                transcription = await analyzeImageWithClaude(image, safeMimeType);
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
