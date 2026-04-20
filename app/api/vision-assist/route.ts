import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authWithRateLimit } from '@/lib/api-auth';
import { getContraintesIA, detectNiveauFromText } from '@/lib/niveaux';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
    const auth = await authWithRateLimit(request, 15, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { images, pdf, level_label } = await request.json() as {
            images?: { base64: string; mimeType: string }[];
            pdf?: string;
            level_label?: string;
        };

        if (!images?.length && !pdf) {
            return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
        }

        const detectedNiveau = detectNiveauFromText(level_label || '');
        const niveauConstraints = detectedNiveau ? getContraintesIA(detectedNiveau) : '';

        const systemPrompt = `Tu es mimimaths, assistant de mathématiques pour lycéens français.
${level_label ? `Niveau de l'élève : ${level_label}` : ''}
${niveauConstraints ? `\n⛔ CONTRAINTES PÉDAGOGIQUES :\n${niveauConstraints}` : ''}

Tu reçois une image d'un exercice de mathématiques (PDF scanné ou photo).

INSTRUCTIONS :
- Analyse visuellement l'image avec précision.
- Si tu vois des graphiques ou courbes : lis les graduations des axes, donne les coordonnées exactes des points remarquables (zéros, extrema, intersections), indique le pas des axes.
- Si tu vois un énoncé : transcris-le fidèlement en Markdown + LaTeX ($...$ et $$...$$).
- Si tu vois un tableau de signes/variations : transcris-le.
- Après avoir transcrit ou décrit le contenu, aide l'élève à résoudre ou comprendre l'exercice selon les contraintes pédagogiques de son niveau.
- Utilise Markdown + KaTeX ($...$ et $$...$$). JAMAIS de \\documentclass.`;

        let contentBlocks: Anthropic.ContentBlockParam[];

        if (pdf) {
            // PDF natif : Claude lit le PDF directement (texte + graphiques)
            contentBlocks = [
                {
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: pdf },
                } as any,
                { type: 'text', text: "Voici mon exercice en PDF. Analyse-le et aide-moi." },
            ];
        } else {
            // Images (JPEG/PNG) converties depuis PDF ou photo
            contentBlocks = [
                ...(images!.map(img => ({
                    type: 'image' as const,
                    source: {
                        type: 'base64' as const,
                        media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                        data: img.base64,
                    },
                }))),
                { type: 'text', text: "Voici mon exercice. Analyse l'image et aide-moi." },
            ];
        }

        const stream = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: contentBlocks }],
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                        controller.enqueue(encoder.encode(chunk.delta.text));
                    }
                }
                controller.close();
            },
        });

        return new Response(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error: any) {
        console.error('[vision-assist] error:', error);
        return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
    }
}
