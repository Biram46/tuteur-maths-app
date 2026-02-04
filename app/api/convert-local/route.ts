import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

/**
 * API de conversion de fichiers pour l'interface professeur
 * Supporte: LaTeX → PDF (via pdflatex local ou Pandoc), LaTeX ↔ DOCX (via Pandoc)
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

        // LaTeX → PDF
        if (sourceExt === 'tex' && targetFormat === 'pdf') {
            return await convertLatexToPdf(fileBuffer, fileName);
        }

        // LaTeX → DOCX
        if (sourceExt === 'tex' && targetFormat === 'docx') {
            return await convertLatexToDocx(fileBuffer, fileName);
        }

        // DOCX → LaTeX
        if (sourceExt === 'docx' && targetFormat === 'tex') {
            return await convertDocxToLatex(fileBuffer, fileName);
        }

        // PDF → LaTeX
        if (sourceExt === 'pdf' && targetFormat === 'tex') {
            return NextResponse.json(
                { error: "La conversion PDF → LaTeX n'est pas supportée directement." },
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
 * Vérifie si Pandoc est disponible sur le système
 */
async function checkPandocAvailability(): Promise<{ available: boolean; message: string }> {
    try {
        await execAsync('pandoc --version');
        return { available: true, message: 'Pandoc disponible' };
    } catch (error) {
        return {
            available: false,
            message: `Pandoc n'est pas installé ou pas dans le PATH.

⚠️ Pour utiliser le convertisseur, installez Pandoc :

Windows :
  winget install --id JohnMacFarlane.Pandoc

Puis REDÉMARREZ votre terminal/serveur de développement.

Vérifiez ensuite avec : pandoc --version`
        };
    }
}

/**
 * Convertit LaTeX en PDF avec Pandoc (recommandé) ou pdflatex
 */
async function convertLatexToPdf(fileBuffer: ArrayBuffer, fileName: string): Promise<NextResponse> {
    // Vérifier d'abord si Pandoc est disponible
    const pandocCheck = await checkPandocAvailability();
    if (!pandocCheck.available) {
        return NextResponse.json(
            { error: pandocCheck.message },
            { status: 503 }
        );
    }

    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input_${Date.now()}.tex`);
    const outputPath = join(tempDir, `output_${Date.now()}.pdf`);

    try {
        // Écrire le fichier temporaire
        await writeFile(inputPath, Buffer.from(fileBuffer));

        // Essayer Pandoc d'abord (plus fiable)
        try {
            await execAsync(`pandoc "${inputPath}" -o "${outputPath}" --pdf-engine=pdflatex`);
        } catch (pandocError) {
            console.log("Pandoc failed, trying direct pdflatex...");

            // Fallback: essayer pdflatex directement
            const workingDir = tempDir;
            await execAsync(`pdflatex -interaction=nonstopmode -output-directory="${workingDir}" "${inputPath}"`);

            // Le fichier de sortie aura le même nom de base que l'input
            const baseName = inputPath.replace('.tex', '.pdf');
            const pdfExists = await readFile(baseName).catch(() => null);

            if (pdfExists) {
                await writeFile(outputPath, pdfExists);
            } else {
                throw new Error("La compilation LaTeX a échoué. Vérifiez la syntaxe de votre fichier.");
            }
        }

        // Lire le PDF généré
        const pdfBuffer = await readFile(outputPath);
        const outputName = fileName.replace('.tex', '.pdf');

        // Nettoyer les fichiers temporaires
        await unlink(inputPath).catch(() => { });
        await unlink(outputPath).catch(() => { });

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${outputName}"`,
            },
        });

    } catch (error: any) {
        // Nettoyer en cas d'erreur
        await unlink(inputPath).catch(() => { });
        await unlink(outputPath).catch(() => { });

        throw new Error(`Erreur LaTeX → PDF: ${error.message}
        
Assurez-vous que :
1. Pandoc est installé (pandoc --version)
2. OU pdflatex est installé (MiKTeX ou TeX Live)
3. Votre fichier LaTeX est valide`);
    }
}

/**
 * Convertit LaTeX en DOCX avec Pandoc
 */
async function convertLatexToDocx(fileBuffer: ArrayBuffer, fileName: string): Promise<NextResponse> {
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input_${Date.now()}.tex`);
    const outputPath = join(tempDir, `output_${Date.now()}.docx`);

    try {
        // Écrire le fichier temporaire
        await writeFile(inputPath, Buffer.from(fileBuffer));

        // Utiliser Pandoc pour la conversion
        await execAsync(`pandoc "${inputPath}" -o "${outputPath}"`);

        // Lire le DOCX généré
        const docxBuffer = await readFile(outputPath);
        const outputName = fileName.replace('.tex', '.docx');

        // Nettoyer
        await unlink(inputPath).catch(() => { });
        await unlink(outputPath).catch(() => { });

        return new NextResponse(docxBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${outputName}"`,
            },
        });

    } catch (error: any) {
        await unlink(inputPath).catch(() => { });
        await unlink(outputPath).catch(() => { });

        throw new Error(`Erreur LaTeX → DOCX: ${error.message}

Pandoc doit être installé pour cette conversion.
Vérifiez avec : pandoc --version`);
    }
}

/**
 * Convertit DOCX en LaTeX avec Pandoc
 */
async function convertDocxToLatex(fileBuffer: ArrayBuffer, fileName: string): Promise<NextResponse> {
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `input_${Date.now()}.docx`);
    const outputPath = join(tempDir, `output_${Date.now()}.tex`);

    try {
        // Écrire le fichier temporaire
        await writeFile(inputPath, Buffer.from(fileBuffer));

        // Utiliser Pandoc pour la conversion
        await execAsync(`pandoc "${inputPath}" -o "${outputPath}"`);

        // Lire le TEX généré
        const texBuffer = await readFile(outputPath);
        const outputName = fileName.replace('.docx', '.tex');

        // Nettoyer
        await unlink(inputPath).catch(() => { });
        await unlink(outputPath).catch(() => { });

        return new NextResponse(texBuffer, {
            headers: {
                'Content-Type': 'text/x-tex',
                'Content-Disposition': `attachment; filename="${outputName}"`,
            },
        });

    } catch (error: any) {
        await unlink(inputPath).catch(() => { });
        await unlink(outputPath).catch(() => { });

        throw new Error(`Erreur DOCX → LaTeX: ${error.message}

Pandoc doit être installé pour cette conversion.
Vérifiez avec : pandoc --version`);
    }
}
