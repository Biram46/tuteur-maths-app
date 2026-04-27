import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authWithRateLimit } from '@/lib/api-auth';
import { analyzeMathImageWithOpenAI } from '@/lib/openai-vision';
import { analyzeMathImage } from '@/lib/gemini';
import type { OcrResult } from '@/lib/correction-types';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OCR_SYSTEM = `Tu es un expert en transcription de copies manuscrites de mathématiques lycée français.
Transcris TOUT ce que tu vois sur cette page de copie d'élève :
- Calculs, démarches, raisonnements étape par étape
- Résultats encadrés ou soulignés
- Ratures et corrections visibles
- Numéros des questions si lisibles

FORMAT :
- Utilise "Question X :" pour identifier chaque réponse si les numéros sont visibles
- Formules mathématiques en $...$ (inline) ou $$...$$ (display)
- Transcris fidèlement sans corriger ni interpréter
- Si une zone est illisible, écris [illisible] à cet endroit`;

function estimateConfidence(text: string): number {
    if (!text || text.length < 20) return 0.15;
    const uncertainty = (text.match(/\[illisible\]|\bcannot\b|\bunable\b|\bunclear\b/gi) ?? []).length;
    const mathContent = (text.match(/\$|Question\s+\d|=|\\frac|\\sqrt/g) ?? []).length;
    const score = 0.5 + Math.min(mathContent * 0.025, 0.45) - Math.min(uncertainty * 0.12, 0.4);
    return parseFloat(Math.max(0.1, Math.min(0.97, score)).toFixed(2));
}

async function ocrWithClaude(base64: string, mimeType: string): Promise<string> {
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [{ type: 'text', text: OCR_SYSTEM, cache_control: { type: 'ephemeral' } }] as any,
        messages: [{
            role: 'user',
            content: [{
                type: 'image',
                source: { type: 'base64', media_type: mimeType as Anthropic.Base64ImageSource['media_type'], data: base64 },
            }, {
                type: 'text',
                text: 'Transcris cette page de copie.',
            }],
        }],
    });
    const block = response.content[0];
    if (block.type !== 'text') throw new Error('Réponse Claude inattendue');
    return block.text.trim();
}

export async function POST(request: NextRequest) {
    const auth = await authWithRateLimit(request, 30, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { base64, mimeType } = await request.json() as {
            base64: string;
            mimeType: string;
        };

        if (!base64 || !mimeType) {
            return NextResponse.json({ error: 'base64 et mimeType requis' }, { status: 400 });
        }

        const isPdf = mimeType === 'application/pdf';
        const providerOrder: Array<'claude' | 'gpt4o' | 'gemini'> = isPdf
            ? ['gemini', 'claude', 'gpt4o']
            : ['claude', 'gpt4o', 'gemini'];

        let lastError: Error | null = null;
        for (const provider of providerOrder) {
            try {
                let transcription: string;
                if (provider === 'claude') {
                    transcription = await ocrWithClaude(base64, mimeType);
                } else if (provider === 'gpt4o') {
                    transcription = await analyzeMathImageWithOpenAI(base64, mimeType);
                } else {
                    transcription = await analyzeMathImage(base64, mimeType);
                }
                const confidence = estimateConfidence(transcription);
                const result: OcrResult = { transcription, confidence, provider };
                return NextResponse.json(result);
            } catch (err: unknown) {
                lastError = err instanceof Error ? err : new Error(String(err));
                console.warn(`[ocr-copy] ${provider} échoué:`, lastError.message);
            }
        }

        return NextResponse.json(
            { error: lastError?.message ?? 'Tous les fournisseurs OCR ont échoué' },
            { status: 500 }
        );
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
