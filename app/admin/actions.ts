"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { logAdminAction } from "@/lib/audit-logger";

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
        logAdminAction({ action: 'upload_resource', targetType: 'resource', targetLabel: formData.get('kind') as string ?? undefined, success: false, metadata: { error: error.message } }).catch(() => {});
        throw new Error(`Erreur technique: ${error.message}`);
    }

    logAdminAction({ action: 'upload_resource', targetType: 'resource', targetLabel: formData.get('kind') as string ?? undefined, success: true }).catch(() => {});
    revalidatePath("/admin");
    redirect("/admin");
}

export async function deleteLevel(formData: FormData) {
    const id = formData.get("id") as string;
    const label = formData.get("label") as string | null;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("levels").delete().eq("id", id);
    if (error) throw new Error(error.message);

    logAdminAction({ action: 'delete_level', targetType: 'level', targetId: id, targetLabel: label ?? undefined }).catch(() => {});
    revalidatePath("/admin");
    redirect("/admin");
}

export async function deleteChapter(formData: FormData) {
    const id = formData.get("id") as string;
    const label = formData.get("label") as string | null;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("chapters").delete().eq("id", id);
    if (error) throw new Error(error.message);

    logAdminAction({ action: 'delete_chapter', targetType: 'chapter', targetId: id, targetLabel: label ?? undefined }).catch(() => {});
    revalidatePath("/admin");
    redirect("/admin");
}

export async function deleteResource(formData: FormData) {
    const id = formData.get("id") as string;
    const label = formData.get("label") as string | null;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer.from("resources").delete().eq("id", id);
    if (error) throw new Error(error.message);

    logAdminAction({ action: 'delete_resource', targetType: 'resource', targetId: id, targetLabel: label ?? undefined }).catch(() => {});
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
        .order('created_at', { ascending: true });

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
    const label = formData.get("label") as string | null;
    if (!id) throw new Error("ID requis pour la suppression.");

    const { error } = await supabaseServer
        .from("eam_sujets")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    logAdminAction({ action: 'delete_eam_sujet', targetType: 'eam_sujet', targetId: id, targetLabel: label ?? undefined }).catch(() => {});
    revalidatePath("/admin");
    revalidatePath("/sujets");
    redirect("/admin");
}

/**
 * Upload tous les fichiers EAM et crée le sujet en une seule opération
 * @param data - { titre, description, niveau, date_sujet, corrige_disponible }
 * @param files - { sujet_pdf, sujet_latex, corrige_pdf, corrige_latex }
 */
export async function createEAMSujetWithFiles(
    data: {
        titre: string;
        description?: string | null;
        niveau: string;
        date_sujet: string;
        corrige_disponible: boolean;
    },
    files: {
        sujet_pdf?: File | null;
        sujet_latex?: File | null;
        corrige_pdf?: File | null;
        corrige_latex?: File | null;
    }
): Promise<{ success: boolean; sujet?: any; error?: string }> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    if (!bucketName) {
        return { success: false, error: "Bucket non configuré" };
    }

    try {
        const timestamp = Date.now();
        const urls: Record<string, string | null> = {
            sujet_pdf_url: null,
            sujet_latex_url: null,
            corrige_pdf_url: null,
            corrige_latex_url: null,
        };

        // Upload chaque fichier
        for (const [key, file] of Object.entries(files)) {
            if (!file) continue;

            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `eam/sujets/${timestamp}-${safeName}`;

            const buffer = await file.arrayBuffer();

            // Détection du type MIME
            const ext = file.name.toLowerCase().split('.').pop();
            const mimeTypes: Record<string, string> = {
                'tex': 'text/x-latex',
                'latex': 'text/x-latex',
                'pdf': 'application/pdf',
            };
            const contentType = mimeTypes[ext || ''] || file.type || 'application/octet-stream';

            const { error: uploadError } = await supabaseServer.storage
                .from(bucketName)
                .upload(filePath, buffer, {
                    contentType,
                    upsert: false
                });

            if (uploadError) {
                throw new Error(`Impossible d'uploader ${key} : ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabaseServer.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // Mapper le nom du fichier à l'URL
            if (key === 'sujet_pdf') urls.sujet_pdf_url = publicUrl;
            else if (key === 'sujet_latex') urls.sujet_latex_url = publicUrl;
            else if (key === 'corrige_pdf') urls.corrige_pdf_url = publicUrl;
            else if (key === 'corrige_latex') urls.corrige_latex_url = publicUrl;
        }

        // Créer l'entrée dans la base de données
        const payload = {
            titre: data.titre,
            description: data.description || null,
            date_sujet: data.date_sujet,
            niveau: data.niveau,
            corrige_disponible: data.corrige_disponible,
            ...urls,
        };

        const { data: sujet, error: dbError } = await supabaseServer
            .from("eam_sujets")
            .insert([payload])
            .select()
            .single();

        if (dbError) {
            return { success: false, error: "Erreur base de données: " + dbError.message };
        }

        revalidatePath("/admin");
        revalidatePath("/sujets");

        logAdminAction({ action: 'create_eam_sujet', targetType: 'eam_sujet', targetId: sujet.id, targetLabel: data.titre, success: true }).catch(() => {});
        return { success: true, sujet };
    } catch (err: any) {
        console.error("Erreur createEAMSujetWithFiles:", err);
        logAdminAction({ action: 'create_eam_sujet', targetType: 'eam_sujet', targetLabel: data.titre, success: false, metadata: { error: err.message } }).catch(() => {});
        return { success: false, error: err.message || "Erreur inconnue" };
    }
}

/**
 * Ajoute une note pédagogique manuelle dans le RAG (avec embedding OpenAI)
 */
export async function addRagNote(params: {
    content: string;
    chapitre: string;
    niveau: string;
}): Promise<{ success: boolean; error?: string }> {
    const { content, chapitre, niveau } = params;
    if (!content.trim()) return { success: false, error: 'Contenu vide' };

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return { success: false, error: 'OPENAI_API_KEY manquante' };

    try {
        // Générer l'embedding
        const embRes = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'text-embedding-ada-002', input: content }),
        });
        const embData = await embRes.json();
        if (embData.error) return { success: false, error: `OpenAI: ${embData.error.message}` };
        const embedding = embData.data[0].embedding;

        // Insérer dans rag_documents
        const { error } = await supabaseServer.from('rag_documents').insert({
            content,
            embedding,
            metadata: {
                source: 'manual',
                chapter_title: chapitre,
                niveau,
                added_by: 'admin',
            },
        });

        if (error) return { success: false, error: error.message };

        logAdminAction({ action: 'add_rag_note', targetType: 'rag_documents', targetLabel: chapitre, metadata: { niveau } }).catch(() => {});
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Supprime toutes les notes manuelles RAG d'un chapitre
 */
export async function deleteRagNotes(chapitre: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseServer
        .from('rag_documents')
        .delete()
        .eq('metadata->>source', 'manual')
        .eq('metadata->>chapter_title', chapitre);
    if (error) return { success: false, error: error.message };
    logAdminAction({ action: 'delete_rag_notes', targetType: 'rag_documents', targetLabel: chapitre }).catch(() => {});
    revalidatePath('/admin');
    return { success: true };
}

/**
 * Supprime tous les résultats QCM de la base de données (purge)
 */
export async function deleteAllQcmResults() {
    const { error } = await supabaseServer
        .from("qcm_results")
        .delete()
        .not("id", "is", null);

    if (error) throw new Error(error.message);

    logAdminAction({ action: 'purge_qcm_results', targetType: 'qcm_results', metadata: { scope: 'all' } }).catch(() => {});
    revalidatePath("/admin");
    redirect("/admin");
}

