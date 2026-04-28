import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authWithRateLimit } from '@/lib/api-auth';
import { latexToSpeech } from '@/lib/latex-to-speech';

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10000 });

export async function POST(req: NextRequest) {
    const auth = await authWithRateLimit(req, 20, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { text, voice = 'nova' } = await req.json();
        if (!text) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });

        const rawText = typeof text === 'string' && text.length > 1500 ? text.substring(0, 1500) : text;
        const spokenText = latexToSpeech(rawText);

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: spokenText,
            speed: 0.85,
        });
        const arrayBuf = await mp3.arrayBuffer();
        console.log('[TTS] OpenAI ✅');
        return new NextResponse(arrayBuf, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'X-TTS-Provider': 'openai',
            },
        });

    } catch (error: any) {
        console.error('[TTS] Erreur:', error?.message);
        return NextResponse.json({
            error: 'Erreur lors de la génération de la voix',
            details: error?.message || 'Erreur inconnue',
        }, { status: 500 });
    }
}
