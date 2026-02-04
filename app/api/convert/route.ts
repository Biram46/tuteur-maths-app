import { NextRequest, NextResponse } from "next/server";

/**
 * API de conversion de fichiers pour l'interface professeur
 * Supporte: LaTeX → PDF, LaTeX → DOCX, DOCX → LaTeX
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const targetFormat = formData.get("targetFormat") as string;

        if (!file || !targetFormat) {
            return NextResponse.json(
                { error: "Fichier et format cible requis" },
                { status: 400 }
            );
        }

        const fileBuffer = await file.arrayBuffer();
        const fileName = file.name;
        const sourceExt = fileName.split('.').pop()?.toLowerCase();

        // LaTeX → PDF avec latex.online
        if (sourceExt === 'tex' && targetFormat === 'pdf') {
            return await convertLatexToPdf(fileBuffer, fileName);
        }

        // LaTeX → DOCX avec cloudconvert ou pandoc API
        if (sourceExt === 'tex' && targetFormat === 'docx') {
            return await convertLatexToDocx(fileBuffer, fileName);
        }

        // DOCX → LaTeX (conversion basique)
        if (sourceExt === 'docx' && targetFormat === 'tex') {
            return await convertDocxToLatex(fileBuffer, fileName);
        }

        // PDF → LaTeX (pas supporté directement, mais on peut retourner une erreur claire)
        if (sourceExt === 'pdf' && targetFormat === 'tex') {
            return NextResponse.json(
                { error: "La conversion PDF → LaTeX n'est pas supportée directement. Essayez PDF → DOCX → LaTeX." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: `Conversion ${sourceExt} → ${targetFormat} non supportée` },
            { status: 400 }
        );

    } catch (error: any) {
        console.error("Erreur de conversion:", error);
        return NextResponse.json(
            { error: `Erreur lors de la conversion: ${error.message}` },
            { status: 500 }
        );
    }
}

/**
 * Convertit un fichier LaTeX en PDF via latex.online
 */
async function convertLatexToPdf(fileBuffer: ArrayBuffer, fileName: string): Promise<NextResponse> {
    try {
        // LaTeX Online accepte un POST avec le contenu du fichier
        // Nouvelle approche: utilisation de l'API texlive.net ou latex.online

        // Convertir le buffer en texte
        const texContent = new TextDecoder().decode(fileBuffer);

        // Encoder le contenu pour l'URL (méthode GET alternative)
        // Alternative 1: Essayer avec l'API latexonline.cc via GET
        try {
            const encodedContent = encodeURIComponent(texContent);
            const getUrl = `https://latexonline.cc/compile?text=${encodedContent}&command=pdflatex`;

            const response = await fetch(getUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'TuteurMathsApp/1.0',
                }
            });

            if (response.ok) {
                const pdfBuffer = await response.arrayBuffer();
                const outputName = fileName.replace('.tex', '.pdf');

                return new NextResponse(pdfBuffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${outputName}"`,
                    },
                });
            }
        } catch (getError) {
            console.log("GET method failed, trying POST...", getError);
        }

        // Alternative 2: Méthode POST avec corps multipart
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'text/x-tex' });
        formData.append('filecontents[]', blob, fileName);
        formData.append('filename[]', fileName);
        formData.append('engine', 'pdflatex');

        const postResponse = await fetch('https://latexonline.cc/compile', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/pdf',
            }
        });

        if (!postResponse.ok) {
            // Si les deux méthodes échouent, retourner une erreur avec suggestion
            throw new Error(`Les APIs LaTeX Online ne sont pas disponibles actuellement (${postResponse.status}).
            
Alternatives :
1. Compilez le fichier localement avec pdflatex
2. Utilisez Overleaf (https://overleaf.com)
3. Réessayez plus tard

L'API LaTeX Online peut être temporairement indisponible.`);
        }

        const pdfBuffer = await postResponse.arrayBuffer();
        const outputName = fileName.replace('.tex', '.pdf');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${outputName}"`,
            },
        });

    } catch (error: any) {
        throw new Error(`Erreur LaTeX → PDF: ${error.message}`);
    }
}

/**
 * Convertit un fichier LaTeX en DOCX
 * Utilise une approche en deux étapes: LaTeX → PDF → DOCX via cloudconvert
 * OU directement via une API Pandoc si disponible
 */
async function convertLatexToDocx(fileBuffer: ArrayBuffer, fileName: string): Promise<NextResponse> {
    try {
        // Pour l'instant, on retourne une conversion basique
        // TODO: Intégrer cloudconvert API (nécessite clé API) ou pandoc-api

        // Alternative simple: on peut convertir via pandoc localement si disponible
        // Mais pour Vercel, on utiliserait cloudconvert

        const message = `La conversion LaTeX → DOCX nécessite Pandoc ou CloudConvert API.
        
Pour l'instant, veuillez:
1. Convertir ${fileName} en PDF d'abord
2. Utiliser un outil externe pour PDF → DOCX

Ou configurez CloudConvert API dans les variables d'environnement.`;

        return NextResponse.json(
            {
                error: message,
                suggestion: "latex_to_pdf_first"
            },
            { status: 501 }
        );

    } catch (error: any) {
        throw new Error(`Erreur LaTeX → DOCX: ${error.message}`);
    }
}

/**
 * Convertit un fichier DOCX en LaTeX
 */
async function convertDocxToLatex(fileBuffer: ArrayBuffer, fileName: string): Promise<NextResponse> {
    try {
        // Similaire à LaTeX → DOCX, nécessite Pandoc ou API externe
        const message = `La conversion DOCX → LaTeX nécessite Pandoc ou CloudConvert API.

Pour l'instant, cette conversion n'est pas disponible en ligne.
Veuillez utiliser Pandoc localement:

pandoc ${fileName} -o output.tex

Ou configurez CloudConvert API dans les variables d'environnement.`;

        return NextResponse.json(
            {
                error: message,
                suggestion: "use_pandoc_locally"
            },
            { status: 501 }
        );

    } catch (error: any) {
        throw new Error(`Erreur DOCX → LaTeX: ${error.message}`);
    }
}
