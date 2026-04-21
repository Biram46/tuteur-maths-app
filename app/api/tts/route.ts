import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authWithRateLimit } from '@/lib/api-auth';
import { latexToSpeech } from '@/lib/latex-to-speech';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    const auth = await authWithRateLimit(req, 20, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { text, voice = 'shimmer' } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });
        }

        const spokenText = latexToSpeech(text);

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1-hd',
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: spokenText,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('Erreur TTS OpenAI:', error);
        const errorMessage = error?.message || 'Erreur inconnue';
        const errorCode = error?.code || error?.status || 'no_code';
        return NextResponse.json({
            error: 'Erreur lors de la génération de la voix',
            details: errorMessage,
            code: errorCode
        }, { status: 500 });
    }
}
