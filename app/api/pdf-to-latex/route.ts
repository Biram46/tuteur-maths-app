import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthUser } from '@/lib/api-auth';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prompt statique mis en cache côté Anthropic (ephemeral, 5 min TTL)
const STATIC_SYSTEM = `Tu es un expert en transcription LaTeX de documents mathématiques français lycée.
Ta mission : convertir l'image fournie en code LaTeX fidèle et compilable.

RÈGLES ABSOLUES :
1. Transcris UNIQUEMENT ce que tu vois — aucune addition, aucune interprétation
2. Mathématiques inline : $...$  |  display : \\[...\\] ou \\begin{equation*}...\\end{equation*}
3. Structure : \\section*{}, \\subsection*{}, \\begin{enumerate}, \\begin{itemize}
4. Encadrés colorés → \\begin{tcolorbox}[colback=yellow!10,colframe=orange!80!black,title={...}]...\\end{tcolorbox}
5. Tableaux de signes/variations → \\begin{tabular}{|c|c|c|}\\hline...\\end{tabular}
6. Définitions, théorèmes, propriétés → \\begin{tcolorbox}[...] avec le bon titre
7. N'inclus JAMAIS le préambule (\\documentclass, \\usepackage, \\begin{document}, etc.)
8. Retourne UNIQUEMENT le code LaTeX brut — zéro markdown, zéro explication, zéro \`\`\`latex`;

export const maxDuration = 60; // Vercel Pro : 60s max par requête

function stripPreamble(latex: string): string {
    const match = latex.match(/\\begin\{document\}([\s\S]*?)(?:\\end\{document\})?$/);
    if (match) return match[1].trim();
    return latex.replace(/^```latex\s*/i, '').replace(/```\s*$/, '').trim();
}

async function claudeVision(imageBase64: string, mimeType: string, userText: string): Promise<string> {
    const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [
            {
                type: 'text',
                text: STATIC_SYSTEM,
                cache_control: { type: 'ephemeral' },
            } as any,
        ],
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                            data: imageBase64,
                        },
                    },
                    { type: 'text', text: userText },
                ],
            },
        ],
    });
    return (response.content[0] as Anthropic.TextBlock).text.trim();
}

// L'API traite UNE SEULE page à la fois (2 passes) pour rester sous les limites de timeout Vercel.
// Le client itère les pages et appelle cet endpoint N fois.
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

    try {
        const { image } = await request.json() as {
            image: { base64: string; mimeType: string };
        };

        if (!image?.base64) {
            return NextResponse.json({ error: 'Aucune image reçue' }, { status: 400 });
        }

        // Passe 1 — extraction fidèle
        const draft = await claudeVision(
            image.base64,
            image.mimeType,
            'Transcris intégralement cette page en code LaTeX (corps uniquement, sans préambule).'
        );

        // Passe 2 — vérification et correction
        const verified = await claudeVision(
            image.base64,
            image.mimeType,
            `Voici la transcription LaTeX de cette page :

${draft}

Compare ligne par ligne avec l'image. Corrige TOUTES les erreurs :
- formules mathématiques incorrectes ou manquantes
- texte manquant ou mal transcrit
- environnements LaTeX incorrects
- mise en forme différente de l'image

Retourne UNIQUEMENT le code LaTeX corrigé et complet (corps uniquement, sans préambule).`
        );

        return NextResponse.json({ latex: stripPreamble(verified) });
    } catch (e: any) {
        console.error('pdf-to-latex error:', e);
        return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
    }
}
