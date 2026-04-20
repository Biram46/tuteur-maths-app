
import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';
import { getAuthUser } from '@/lib/api-auth';

// Limites de sécurité
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'text/plain',
    'application/pdf',
];

export async function POST(req: NextRequest) {
    // Vérification d'authentification
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validation de la taille du fichier
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite : 10MB.`
            }, { status: 413 });
        }

        // Validation du type MIME
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({
                error: `Type de fichier non autorisé (${file.type}). Formats acceptés : images, PDF, texte.`
            }, { status: 415 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = "";

        const fileName = file.name || 'document.pdf';

        // Traitement selon le type de fichier
        if (file.type === "application/pdf") {
            // Polyfills requis par pdf-parse dans l'environnement serverless Vercel
            if (typeof globalThis.DOMMatrix === 'undefined') {
                (globalThis as any).DOMMatrix = class { constructor() {} };
                (globalThis as any).Path2D = class { constructor() {} };
                (globalThis as any).ImageData = class { constructor() {} };
            }
            try {
                const pdfParseModule = await import('pdf-parse');
                const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : ((pdfParseModule as any).default || (pdfParseModule as any).pdf || pdfParseModule);
                const pdfData = await pdfParse(buffer);
                const extractedText = pdfData.text?.trim() || '';

                if (extractedText.length > 100) {
                    return NextResponse.json({
                        text: extractedText,
                        pageCount: pdfData.numpages,
                    });
                }

                // PDF scanné (peu de texte) → fallback Gemini vision
                const base64 = buffer.toString('base64');
                const visionRes = await fetch(new URL('/api/vision', req.url).toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        cookie: req.headers.get('cookie') || '',
                    },
                    body: JSON.stringify({ fileData: base64, mimeType: 'application/pdf', fileName }),
                });
                const visionData = await visionRes.json();
                if (visionData.text) {
                    return NextResponse.json({ text: visionData.text });
                }
                return NextResponse.json({ error: "Impossible d'extraire le texte de ce PDF scanné." }, { status: 422 });
            } catch (e) {
                console.error('PDF parse error:', e);
                return NextResponse.json({ error: "Erreur lors de l'analyse du PDF." }, { status: 500 });
            }
        }
        else if (file.type.startsWith("image/")) {
            try {
                // Tesseract a besoin d'un buffer ou d'une URL.
                // On utilise recognize directement sur le buffer.
                const { data: { text: ocrText } } = await Tesseract.recognize(
                    buffer,
                    'fra', // Langue française
                    { logger: () => {} }
                );
                text = ocrText;
            } catch (e) {
                console.error("OCR Error", e);
                return NextResponse.json({ error: "Erreur lors de l'analyse de l'image (OCR)" }, { status: 500 });
            }
        }
        else {
            // Fallback texte brut
            text = await file.text();
        }

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "Aucun texte n'a pu être extrait du fichier." }, { status: 400 });
        }

        return NextResponse.json({ text });

    } catch (error) {
        console.error('Upload handler error:', error);
        return NextResponse.json({ error: 'Upload process failed' }, { status: 500 });
    }
}
