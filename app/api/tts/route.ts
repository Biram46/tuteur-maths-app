import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authWithRateLimit } from '@/lib/api-auth';
import { latexToSpeech } from '@/lib/latex-to-speech';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Gemini TTS retourne du PCM brut (24kHz, 16-bit, mono) → wrapper WAV
function pcmToWav(pcm: Buffer): Buffer {
    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const wav = Buffer.alloc(44 + pcm.length);
    wav.write('RIFF', 0, 'ascii');
    wav.writeUInt32LE(36 + pcm.length, 4);
    wav.write('WAVE', 8, 'ascii');
    wav.write('fmt ', 12, 'ascii');
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(channels, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(byteRate, 28);
    wav.writeUInt16LE(blockAlign, 32);
    wav.writeUInt16LE(bitsPerSample, 34);
    wav.write('data', 36, 'ascii');
    wav.writeUInt32LE(pcm.length, 40);
    pcm.copy(wav, 44);
    return wav;
}

async function ttsWithGemini(text: string): Promise<Buffer> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY manquante');

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
                    },
                },
            }),
        }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini TTS ${res.status}: ${(err as any)?.error?.message ?? 'erreur inconnue'}`);
    }

    const data = await res.json() as any;
    const audioB64: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioB64) throw new Error('Aucune donnée audio dans la réponse Gemini');

    return pcmToWav(Buffer.from(audioB64, 'base64'));
}

export async function POST(req: NextRequest) {
    const auth = await authWithRateLimit(req, 20, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { text, voice = 'shimmer' } = await req.json();
        if (!text) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });

        const spokenText = latexToSpeech(text);

        // Gemini TTS (abonnement fixe, coût marginal = 0) → OpenAI fallback
        try {
            const wavBuffer = await ttsWithGemini(spokenText);
            console.log('[TTS] Gemini ✅');
            const wavAb = wavBuffer.buffer.slice(wavBuffer.byteOffset, wavBuffer.byteOffset + wavBuffer.byteLength) as ArrayBuffer;
            return new NextResponse(wavAb, {
                headers: {
                    'Content-Type': 'audio/wav',
                    'Content-Length': wavBuffer.length.toString(),
                },
            });
        } catch (geminiErr: any) {
            console.warn('[TTS] Gemini échoué, fallback OpenAI:', geminiErr.message);
        }

        // Fallback OpenAI tts-1-hd
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1-hd',
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: spokenText,
            speed: 0.80,
        });
        const arrayBuf = await mp3.arrayBuffer();
        console.log('[TTS] OpenAI fallback ✅');
        return new NextResponse(arrayBuf, {
            headers: { 'Content-Type': 'audio/mpeg' },
        });

    } catch (error: any) {
        console.error('Erreur TTS:', error);
        return NextResponse.json({
            error: 'Erreur lors de la génération de la voix',
            details: error?.message || 'Erreur inconnue',
            code: error?.code || error?.status || 'no_code',
        }, { status: 500 });
    }
}
