
import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = "";

        // Traitement selon le type de fichier
        if (file.type === "application/pdf") {
            // Analyse PDF désactivée pour stabilité du serveur
            return NextResponse.json({
                text: "⚠️ L'analyse directe des PDF est désactivée pour des raisons techniques. \n\n✅ SOLUTION 1 : Faites une capture d'écran de votre devoir (Image) et envoyez-la, l'IA pourra la lire ! \n✅ SOLUTION 2 : Copiez-collez le texte du PDF ici.",
                error: "PDF_DISABLED"
            });
        }
        else if (file.type.startsWith("image/")) {
            try {
                // Tesseract a besoin d'un buffer ou d'une URL.
                // On utilise recognize directement sur le buffer.
                const { data: { text: ocrText } } = await Tesseract.recognize(
                    buffer,
                    'fra', // Langue française
                    { logger: m => console.log(m) }
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
