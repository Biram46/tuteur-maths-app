import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { text, voice = 'nova' } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });
        }

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: text,
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
