import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authWithRateLimit } from '@/lib/api-auth';
import type { BaremeItem, CopyAnalysis } from '@/lib/correction-types';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM = `Tu es un correcteur expert en mathématiques lycée français.
Tu reçois la transcription OCR d'une copie manuscrite et le barème de l'évaluation.

MISSION : attribuer des points à chaque item du barème en te basant UNIQUEMENT sur ce que l'élève a écrit.

RÈGLES :
- Ne pas attribuer de points pour des étapes non montrées
- Les points accordés doivent être entre 0 et le maximum de l'item (demi-points autorisés)
- En cas de transcription illisible sur un item, attribue 0 et signale-le dans le commentaire
- Commentaires courts et factuels, destinés au professeur (pas à l'élève)
- Sois équitable : une démarche correcte avec erreur de calcul mérite des points partiels

FORMAT DE RÉPONSE : JSON strict uniquement, aucun texte avant ou après.`;

function buildPrompt(transcription: string, bareme: BaremeItem[], totalPoints: number): string {
    const baremeText = bareme
        .map(b => `- id: "${b.id}" | label: "${b.label}" | max: ${b.max_points} pts`)
        .join('\n');

    return `BARÈME (total: ${totalPoints} points) :
${baremeText}

TRANSCRIPTION OCR DE LA COPIE :
${transcription}

Retourne UNIQUEMENT ce JSON valide :
{
  "items": [
    { "id": "q1", "label": "...", "awarded": 2.5, "max": 3, "comment": "..." }
  ],
  "note": 12.5,
  "confidence": 0.85,
  "general_comment": "..."
}`;
}

export async function POST(request: NextRequest) {
    const auth = await authWithRateLimit(request, 20, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { transcription, bareme, total_points } = await request.json() as {
            transcription: string;
            bareme: BaremeItem[];
            total_points: number;
        };

        if (!transcription || !Array.isArray(bareme) || bareme.length === 0) {
            return NextResponse.json(
                { error: 'transcription et bareme (non vide) requis' },
                { status: 400 }
            );
        }

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: [{ type: 'text', text: ANALYSIS_SYSTEM, cache_control: { type: 'ephemeral' } }] as any,
            messages: [{
                role: 'user',
                content: buildPrompt(transcription, bareme, total_points ?? 20),
            }],
        });

        const block = response.content[0];
        if (block.type !== 'text') {
            return NextResponse.json({ error: 'Réponse Claude inattendue' }, { status: 500 });
        }

        const raw = block.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        let analysis: CopyAnalysis;
        try {
            analysis = JSON.parse(raw);
        } catch {
            return NextResponse.json(
                { error: 'Réponse non parseable', raw: raw.substring(0, 500) },
                { status: 500 }
            );
        }

        return NextResponse.json({ analysis });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
