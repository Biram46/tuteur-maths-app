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
    const filePath = `resources/${Date.now()}-${file.name}`;

    // Upload dans Supabase Storage
    const { data: uploadData, error: uploadError } =
        await supabaseServer.storage.from(bucketName).upload(filePath, file);

    if (uploadError) {
        console.error("[uploadResourceWithFile] upload error:", uploadError);
        throw new Error(uploadError.message);
    }

    // URL publique
    const {
        data: { publicUrl },
    } = supabaseServer.storage.from(bucketName).getPublicUrl(filePath);

    // On regarde quoi remplir selon le type
    let pdf_url: string | null = null;
    let docx_url: string | null = null;
    let latex_url: string | null = null;
    let html_url: string | null = null;

    if (kind === "cours-pdf") {
        pdf_url = publicUrl;
    } else if (kind === "cours-docx") {
        docx_url = publicUrl;
    } else if (kind === "cours-latex") {
        latex_url = publicUrl;
    } else if (kind === "interactif") {
        html_url = publicUrl;
    }

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
        throw new Error(insertError.message);
    }

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


