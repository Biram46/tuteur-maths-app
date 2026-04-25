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

const PREAMBLE = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage{amsmath,amssymb,amsthm,mathtools}
\\usepackage{geometry}
\\usepackage[most]{tcolorbox}
\\usepackage{array,booktabs,multirow}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\geometry{margin=2cm}

\\begin{document}
`;

async function extractPage(imageBase64: string, mimeType: string): Promise<string> {
    const response = await client.messages.create({
        model: 'claude-opus-4-7',
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
                    {
                        type: 'text',
                        text: 'Transcris intégralement cette page en code LaTeX (corps uniquement, sans préambule).',
                    },
                ],
            },
        ],
    });
    return (response.content[0] as Anthropic.TextBlock).text.trim();
}

async function verifyPage(imageBase64: string, mimeType: string, draft: string): Promise<string> {
    const response = await client.messages.create({
        model: 'claude-opus-4-7',
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
                    {
                        type: 'text',
                        text: `Voici la transcription LaTeX de cette page :

${draft}

Compare ligne par ligne avec l'image. Corrige TOUTES les erreurs :
- formules mathématiques incorrectes ou manquantes
- texte manquant ou mal transcrit
- environnements LaTeX incorrects
- mise en forme différente de l'image

Retourne UNIQUEMENT le code LaTeX corrigé et complet (corps uniquement, sans préambule).`,
                    },
                ],
            },
        ],
    });
    return (response.content[0] as Anthropic.TextBlock).text.trim();
}

function stripPreamble(latex: string): string {
    // Enlève tout ce qui est avant \begin{document} si Claude l'a quand même inclus
    const match = latex.match(/\\begin\{document\}([\s\S]*?)(?:\\end\{document\})?$/);
    if (match) return match[1].trim();
    // Enlève les blocs ```latex ... ``` si présents
    return latex.replace(/^```latex\s*/i, '').replace(/```\s*$/, '').trim();
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

    try {
        const { images } = await request.json() as {
            images: { base64: string; mimeType: string }[];
        };

        if (!images?.length) {
            return NextResponse.json({ error: 'Aucune image reçue' }, { status: 400 });
        }

        const MAX_PAGES = 8;
        const pages = images.slice(0, MAX_PAGES);
        const pageContents: string[] = [];

        for (const img of pages) {
            const draft = await extractPage(img.base64, img.mimeType);
            const verified = await verifyPage(img.base64, img.mimeType, draft);
            pageContents.push(stripPreamble(verified));
        }

        const body = pageContents.join('\n\n\\newpage\n\n');
        const latex = `${PREAMBLE}\n${body}\n\n\\end{document}`;

        return NextResponse.json({ latex, pages: pages.length });
    } catch (e: any) {
        console.error('pdf-to-latex error:', e);
        return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
    }
}
