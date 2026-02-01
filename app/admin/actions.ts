"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET!;

export async function createOrUpdateLevel(formData: FormData) {
    const id = formData.get("id") as string | null;
    const label = (formData.get("label") as string)?.trim();
    const code = (formData.get("code") as string)?.trim();
    const position = Number(formData.get("position") || 1);

    if (!label || !code) {
        throw new Error("Nom et code sont obligatoires.");
    }

    if (id) {
        const { error } = await supabaseServer
            .from("levels")
            .update({ label, code, position })
            .eq("id", id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabaseServer
            .from("levels")
            .insert([{ label, code, position }]);
        if (error) throw new Error(error.message);
    }

    redirect("/admin");
}

export async function createOrUpdateChapter(formData: FormData) {
    const id = formData.get("id") as string | null;
    const levelId = formData.get("level_id") as string;
    const title = (formData.get("title") as string)?.trim();
    const code = (formData.get("code") as string)?.trim();
    const position = Number(formData.get("position") || 1);
    const published = formData.get("published") === "on";

    if (!levelId || !title || !code) {
        throw new Error("Niveau, titre et code sont obligatoires.");
    }

    const payload = { level_id: levelId, title, code, position, published };

    if (id) {
        const { error } = await supabaseServer
            .from("chapters")
            .update(payload)
            .eq("id", id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabaseServer
            .from("chapters")
            .insert([payload]);
        if (error) throw new Error(error.message);
    }

    redirect("/admin");
}

export async function createOrUpdateResource(formData: FormData) {
    const id = formData.get("id") as string | null;
    const chapterId = formData.get("chapter_id") as string;
    const kind = (formData.get("kind") as string)?.trim();

    const pdf_url = (formData.get("pdf_url") as string)?.trim() || null;
    const docx_url = (formData.get("docx_url") as string)?.trim() || null;
    const latex_url = (formData.get("latex_url") as string)?.trim() || null;
    const html_url = (formData.get("html_url") as string)?.trim() || null;

    if (!chapterId || !kind) {
        throw new Error("Chapitre et type sont obligatoires.");
    }

    const payload = {
        chapter_id: chapterId,
        kind,
        pdf_url,
        docx_url,
        latex_url,
        html_url,
    };

    if (id) {
        const { error } = await supabaseServer
            .from("resources")
            .update(payload)
            .eq("id", id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabaseServer
            .from("resources")
            .insert([payload]);
        if (error) throw new Error(error.message);
    }

    redirect("/admin");
}

/**
 * Upload un fichier vers Supabase Storage et crée la ressource associée
 */
export async function uploadResourceWithFile(formData: FormData) {
    const chapterId = formData.get("chapter_id") as string;
    const kind = (formData.get("kind") as string)?.trim();
    const file = formData.get("file") as File | null;

    if (!chapterId || !kind || !file) {
        throw new Error("Chapitre, type et fichier sont obligatoires.");
    }

    // Nom de fichier dans le bucket : resources/<timestamp>-<nom>
    const timestamp = Date.now();
    // Sanitize filename to avoid issues with special characters
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    let filePath = `resources/${timestamp}-${sanitizedFileName}`;

    console.log("[uploadResourceWithFile] Processing upload:", {
        chapterId,
        kind,
        originalName: file.name,
        size: file.size,
        type: file.type,
        targetPath: filePath,
        bucket: bucketName
    });

    // Déterminer le Content-Type correct
    let contentType = file.type;
    const isInteractive = kind === 'interactif' || file.name.toLowerCase().endsWith('.html');

    if (isInteractive) {
        contentType = 'text/html; charset=utf-8';
        // Assurer l'extension .html
        if (!filePath.toLowerCase().endsWith('.html')) {
            filePath += '.html';
        }
    } else if (!contentType) {
        contentType = 'application/octet-stream';
    }

    console.log("[uploadResourceWithFile] Uploading with contentType:", contentType);

    // Forcer le contenu en Buffer
    const fileBuffer = await file.arrayBuffer();
    const fileData = Buffer.from(fileBuffer);

    // Upload dans Supabase Storage
    const { data: uploadData, error: uploadError } =
        await supabaseServer.storage.from(bucketName).upload(filePath, fileData, {
            upsert: true,
            contentType: contentType,
            cacheControl: '3600'
        });

    if (uploadError) {
        console.error("[uploadResourceWithFile] CRITICAL upload error:", uploadError);
        console.error("[uploadResourceWithFile] Details:", {
            statusCode: (uploadError as any).statusCode,
            errorName: uploadError.name,
            errorMessage: uploadError.message
        });
        throw new Error(`Erreur upload Storage: ${uploadError.message}`);
    }

    console.log("[uploadResourceWithFile] Upload successful:", uploadData);

    // URL publique
    const {
        data: { publicUrl },
    } = supabaseServer.storage.from(bucketName).getPublicUrl(filePath);

    console.log("[uploadResourceWithFile] Generated public URL:", publicUrl);

    // On regarde quoi remplir selon le type
    let pdf_url: string | null = null;
    let docx_url: string | null = null;
    let latex_url: string | null = null;
    let html_url: string | null = null;

    if (kind === "cours-pdf" || kind === "exercices-pdf") {
        pdf_url = publicUrl;
    } else if (kind === "cours-docx" || kind === "exercices-docx") {
        docx_url = publicUrl;
    } else if (kind === "cours-latex" || kind === "exercices-latex") {
        latex_url = publicUrl;
    } else if (kind === "interactif") {
        html_url = publicUrl;
    }

    console.log("[uploadResourceWithFile] Inserting into DB...", { chapterId, kind, pdf_url, docx_url, latex_url, html_url });

    const { error: insertError } = await supabaseServer
        .from("resources")
        .insert([
            {
                chapter_id: chapterId,
                kind,
                pdf_url,
                docx_url,
                latex_url,
                html_url,
            },
        ]);

    if (insertError) {
        console.error("[uploadResourceWithFile] insert error:", insertError);
        throw new Error(`Erreur DB insert: ${insertError.message}`);
    }

    console.log("[uploadResourceWithFile] Process completed successfully.");

    redirect("/admin");
}

export async function deleteLevel(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("levels").delete().eq("id", id);
    if (error) throw new Error(error.message);

    redirect("/admin");
}

export async function deleteChapter(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("chapters").delete().eq("id", id);
    if (error) throw new Error(error.message);

    redirect("/admin");
}

export async function deleteResource(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("resources").delete().eq("id", id);
    if (error) throw new Error(error.message);

    redirect("/admin");
}


