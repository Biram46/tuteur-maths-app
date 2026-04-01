"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;

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

    revalidatePath("/admin");
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

    revalidatePath("/admin");
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

    revalidatePath("/admin");
    redirect("/admin");
}

/**
 * Upload un fichier vers Supabase Storage et crée la ressource associée
 */
export async function uploadResourceWithFile(formData: FormData) {
    // Cette fonction reste en backup pour les fichiers < 4.5MB si besoin
    console.log("--> Démarrage Upload Standard");

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("Bucket non configuré (Environment Variable missing)");

    const chapterId = formData.get("chapter_id") as string;
    const kind = (formData.get("kind") as string)?.trim();
    const file = formData.get("file") as File | null;

    if (!chapterId || !kind || !file) {
        throw new Error("Données manquantes");
    }

    // Vercel Server Actions Limit Check (4.5MB is the safe limit)
    const MAX_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). La limite Vercel Server Actions est de 4.5MB.`);
    }

    try {
        const timestamp = Date.now();
        // Nom simple et sûr
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `resources/${timestamp}-${safeName}`;

        const buffer = await file.arrayBuffer();

        const { error: uploadError } = await supabaseServer.storage
            .from(bucketName)
            .upload(filePath, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Récupération URL
        const { data: { publicUrl } } = supabaseServer.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        // Insertion DB
        const payload: any = { chapter_id: chapterId, kind };
        if (kind === 'interactif' || safeName.endsWith('.html')) payload.html_url = publicUrl;
        else if (kind.includes('pdf')) payload.pdf_url = publicUrl;
        else if (kind.includes('docx')) payload.docx_url = publicUrl;
        else if (kind.includes('latex')) payload.latex_url = publicUrl;
        else payload.pdf_url = publicUrl; // fallback

        const { error: dbError } = await supabaseServer.from('resources').insert([payload]);

        if (dbError) throw dbError;

    } catch (error: any) {
        console.error("Upload Error:", error);
        throw new Error(`Erreur technique: ${error.message}`);
    }

    revalidatePath("/admin");
    redirect("/admin");
}

export async function deleteLevel(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("levels").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    redirect("/admin");
}

export async function deleteChapter(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("chapters").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    redirect("/admin");
}

export async function deleteResource(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("resources").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    redirect("/admin");
}

// --- NOUVELLES ACTIONS POUR UPLOAD CLIENT AVEC SIGNED URL (BYPASS RLS) ---

/**
 * Génère une URL signée pour upload (Bypass RLS)
 */
export async function getSignedUploadUrl(path: string) {
    console.log("[getSignedUploadUrl] Starting for path:", path);

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    console.log("[getSignedUploadUrl] Bucket name:", bucketName);

    if (!bucketName) {
        console.error("[getSignedUploadUrl] ERROR: Bucket non configuré");
        throw new Error("Bucket non configuré");
    }

    try {
        const { data, error } = await supabaseServer
            .storage
            .from(bucketName)
            .createSignedUploadUrl(path);

        if (error) {
            console.error("[getSignedUploadUrl] Supabase error:", error);
            throw new Error("Erreur Supabase: " + error.message);
        }

        console.log("[getSignedUploadUrl] Success - token generated:", !!data?.token);
        return { signedUrl: data.signedUrl, token: data.token, path: data.path };
    } catch (err: any) {
        console.error("[getSignedUploadUrl] Exception:", err);
        throw err;
    }
}

/**
 * Action appelée après un upload côté client réussi
 */
export async function createResourceEntry(chapterId: string, kind: string, publicUrl: string, fileName: string) {
    if (!chapterId || !kind || !publicUrl) {
        throw new Error("Données d'enregistrement incomplètes");
    }

    const payload: any = { chapter_id: chapterId, kind };

    // Logique d'assignation des URLs
    if (kind === 'interactif' || fileName.toLowerCase().endsWith('.html')) {
        payload.html_url = publicUrl;
    } else if (kind.includes('pdf')) {
        payload.pdf_url = publicUrl;
    } else if (kind.includes('docx')) {
        payload.docx_url = publicUrl;
    } else if (kind.includes('latex')) {
        payload.latex_url = publicUrl;
    } else {
        payload.pdf_url = publicUrl;
    }

    const { error } = await supabaseServer.from("resources").insert([payload]);

    if (error) {
        console.error("DB Error:", error);
        throw new Error(`Erreur base de données: ${error.message}`);
    }

    revalidatePath("/admin");
    return { success: true };
}

// --- ACTIONS POUR LES SUJETS EAM (Épreuve Anticipée de Mathématiques) ---

export type EAMNiveau = '1ere_specialite' | '1ere_gt' | '1ere_techno';

export interface EAMSujet {
    id: string;
    titre: string;
    description: string | null;
    date_sujet: string;
    niveau: EAMNiveau;
    sujet_pdf_url: string | null;
    sujet_latex_url: string | null;
    corrige_pdf_url: string | null;
    corrige_latex_url: string | null;
    corrige_disponible: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Récupère tous les sujets EAM
 */
export async function getEAMSujets(): Promise<EAMSujet[]> {
    const { data, error } = await supabaseServer
        .from('eam_sujets')
        .select('*')
        .order('date_sujet', { ascending: false });

    if (error) {
        console.error("Error fetching EAM sujets:", error);
        return [];
    }

    return (data || []) as EAMSujet[];
}

/**
 * Crée ou met à jour un sujet EAM
 */
export async function createOrUpdateEAMSujet(formData: FormData) {
    const id = formData.get("id") as string | null;
    const titre = (formData.get("titre") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const date_sujet = formData.get("date_sujet") as string;
    const niveau = formData.get("niveau") as EAMNiveau;
    const sujet_pdf_url = (formData.get("sujet_pdf_url") as string)?.trim() || null;
    const sujet_latex_url = (formData.get("sujet_latex_url") as string)?.trim() || null;
    const corrige_pdf_url = (formData.get("corrige_pdf_url") as string)?.trim() || null;
    const corrige_latex_url = (formData.get("corrige_latex_url") as string)?.trim() || null;
    const corrige_disponible = formData.get("corrige_disponible") === "on";

    if (!titre || !date_sujet || !niveau) {
        throw new Error("Titre, date et niveau sont obligatoires.");
    }

    const payload = {
        titre,
        description,
        date_sujet,
        niveau,
        sujet_pdf_url,
        sujet_latex_url,
        corrige_pdf_url,
        corrige_latex_url,
        corrige_disponible,
    };

    if (id) {
        const { error } = await supabaseServer
            .from("eam_sujets")
            .update(payload)
            .eq("id", id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabaseServer
            .from("eam_sujets")
            .insert([payload]);
        if (error) throw new Error(error.message);
    }

    revalidatePath("/admin");
    revalidatePath("/sujets");
    redirect("/admin");
}

/**
 * Supprime un sujet EAM
 */
export async function deleteEAMSujet(formData: FormData) {
    const id = formData.get("id") as string;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer
        .from("eam_sujets")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    revalidatePath("/sujets");
    redirect("/admin");
}
