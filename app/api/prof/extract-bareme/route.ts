import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authWithRateLimit } from '@/lib/api-auth';
import type { BaremeItem } from '@/lib/correction-types';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_SYSTEM = `Tu es un assistant qui extrait la structure des questions d'un sujet d'examen de mathématiques lycée français.

RÈGLES D'EXTRACTION :
- Respecte la hiérarchie exacte : Partie I / II / III, puis 1) 2) 3), puis a) b) c)
- Chaque question "feuille" (la plus fine, celle où l'élève doit répondre) est un item distinct
- Ignore les consignes générales, les rappels de cours, les "on admet que"
- Construis un id court qui reflète la hiérarchie : "I.1.a", "I.1.b", "II.2", "III" etc.
- Le label doit être la question elle-même (court, 80 car max), pas le numéro seul
- max_points = 0 pour tous les items (le professeur renseignera les points)

FORMAT DE RÉPONSE : JSON strict uniquement, sans texte avant/après.`;

function buildTextPrompt(text: string): string {
    return `Voici le sujet d'examen. Extrais toutes les questions en respectant la hiérarchie.

SUJET :
${text.substring(0, 12000)}

Retourne UNIQUEMENT ce JSON :
{
  "items": [
    { "id": "I.1.a", "label": "Calculer la dérivée de f", "max_points": 0 },
    { "id": "I.1.b", "label": "Étudier le signe de f'", "max_points": 0 }
  ]
}`;
}

function buildImagePrompt(): string {
    return `Voici les pages du sujet d'examen. Extrais toutes les questions en respectant la hiérarchie.

Retourne UNIQUEMENT ce JSON :
{
  "items": [
    { "id": "I.1.a", "label": "Calculer la dérivée de f", "max_points": 0 }
  ]
}`;
}

export async function POST(request: NextRequest) {
    const auth = await authWithRateLimit(request, 10, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { text, images } = await request.json() as {
            text?: string;
            images?: { base64: string; mimeType: string }[];
        };

        if (!text && (!images || images.length === 0)) {
            return NextResponse.json({ error: 'text ou images requis' }, { status: 400 });
        }

        let userContent: Anthropic.MessageParam['content'];

        if (images && images.length > 0) {
            // PDF converti en images — envoie toutes les pages à Claude
            const imageBlocks: Anthropic.ImageBlockParam[] = images.slice(0, 8).map(img => ({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: img.mimeType as Anthropic.Base64ImageSource['media_type'],
                    data: img.base64,
                },
            }));
            userContent = [
                ...imageBlocks,
                { type: 'text', text: buildImagePrompt() },
            ];
        } else {
            userContent = buildTextPrompt(text!);
        }

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: [{ type: 'text', text: EXTRACT_SYSTEM, cache_control: { type: 'ephemeral' } }] as any,
            messages: [{ role: 'user', content: userContent }],
        });

        const block = response.content[0];
        if (block.type !== 'text') {
            return NextResponse.json({ error: 'Réponse Claude inattendue' }, { status: 500 });
        }

        const raw = block.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        let parsed: { items: BaremeItem[] };
        try {
            parsed = JSON.parse(raw);
        } catch {
            return NextResponse.json(
                { error: 'Réponse non parseable', raw: raw.substring(0, 300) },
                { status: 500 }
            );
        }

        if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
            return NextResponse.json({ error: 'Aucune question trouvée dans le sujet' }, { status: 422 });
        }

        return NextResponse.json({ items: parsed.items });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
