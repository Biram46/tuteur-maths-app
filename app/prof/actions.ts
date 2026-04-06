"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import type { ProfResourceType } from "@/lib/prof-types";

// ─────────────────────────────────────────────────────────────
// SÉQUENCES
// ─────────────────────────────────────────────────────────────

/**
 * Crée ou récupère une séquence pour un niveau+chapitre donné
 */
export async function getOrCreateSequence(
    teacherId: string,
    levelId: string,
    chapterId: string
): Promise<{ id: string; status: string }> {
    // Vérifier si une séquence existe déjà
    const { data: existing } = await supabaseServer
        .from("sequences")
        .select("id, status")
        .eq("teacher_id", teacherId)
        .eq("level_id", levelId)
        .eq("chapter_id", chapterId)
        .single();

    if (existing) return existing;

    // Créer une nouvelle séquence
    const { data, error } = await supabaseServer
        .from("sequences")
        .insert([{
            teacher_id: teacherId,
            level_id: levelId,
            chapter_id: chapterId,
            status: 'draft',
        }])
        .select("id, status")
        .single();

    if (error) throw new Error(`Erreur création séquence: ${error.message}`);
    return data!;
}

/**
 * Met à jour le statut d'une séquence (recalcule automatiquement)
 */
async function recalculateSequenceStatus(sequenceId: string) {
    const { data: resources } = await supabaseServer
        .from("resources")
        .select("status")
        .eq("sequence_id", sequenceId);

    if (!resources || resources.length === 0) {
        await supabaseServer
            .from("sequences")
            .update({ status: 'draft', updated_at: new Date().toISOString() })
            .eq("id", sequenceId);
        return;
    }

    const allPublished = resources.every((r: { status: string }) => r.status === 'published');
    const somePublished = resources.some((r: { status: string }) => r.status === 'published');

    const newStatus = allPublished ? 'published' : somePublished ? 'partial' : 'draft';

    await supabaseServer
        .from("sequences")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", sequenceId);
}

// ─────────────────────────────────────────────────────────────
// BROUILLONS — Sauvegarder une ressource générée
// ─────────────────────────────────────────────────────────────

/**
 * Sauvegarde un brouillon (crée ou met à jour la ressource)
 */
export async function saveDraft(params: {
    teacherId: string;
    sequenceId: string;
    chapterId: string;
    resourceType: ProfResourceType;
    content: string; // LaTeX ou HTML
    label?: string;
}): Promise<{ resourceId: string }> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("Bucket non configuré");

    const { teacherId, sequenceId, chapterId, resourceType, content, label } = params;

    // Mapper le type de ressource vers le kind existant
    const kindMap: Record<ProfResourceType, string> = {
        cours: 'cours',
        exercices_1: 'exercices-pdf',
        exercices_2: 'exercices-pdf',
        exercices_3: 'exercices-pdf',
        interactif: 'interactif',
        ds: 'cours-pdf',
        eam: 'cours-pdf',
    };
    const kind = kindMap[resourceType];

    // Générer le label
    const labelMap: Record<ProfResourceType, string> = {
        cours: 'Cours',
        exercices_1: 'Feuille d\'exercices N°1',
        exercices_2: 'Feuille d\'exercices N°2',
        exercices_3: 'Feuille d\'exercices N°3',
        interactif: 'Exercices interactifs',
        ds: 'Devoir Surveillé',
        eam: 'Épreuve Anticipée',
    };
    const resourceLabel = label || labelMap[resourceType];

    // Upload le fichier LaTeX dans Storage
    const timestamp = Date.now();
    const fileName = `${resourceType}_${timestamp}.tex`;
    const filePath = `prof/${teacherId}/sequences/${sequenceId}/${fileName}`;

    const { error: uploadError } = await supabaseServer.storage
        .from(bucketName)
        .upload(filePath, content, {
            contentType: 'text/x-latex',
            upsert: true,
        });

    if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

    const { data: { publicUrl: latexUrl } } = supabaseServer.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    // Vérifier s'il existe déjà une ressource draft pour ce type dans cette séquence
    const { data: existing } = await supabaseServer
        .from("resources")
        .select("id")
        .eq("sequence_id", sequenceId)
        .eq("kind", kind)
        .ilike("label", `%${labelMap[resourceType]}%`)
        .single();

    if (existing) {
        // Mettre à jour
        const { error } = await supabaseServer
            .from("resources")
            .update({
                latex_url: latexUrl,
                label: resourceLabel,
                status: 'draft',
            })
            .eq("id", existing.id);

        if (error) throw new Error(`Erreur mise à jour: ${error.message}`);

        revalidatePath("/prof");
        return { resourceId: existing.id };
    }

    // Créer une nouvelle ressource en brouillon
    const { data: newResource, error: insertError } = await supabaseServer
        .from("resources")
        .insert([{
            chapter_id: chapterId,
            sequence_id: sequenceId,
            kind,
            label: resourceLabel,
            latex_url: latexUrl,
            status: 'draft',
            created_by: teacherId,
        }])
        .select("id")
        .single();

    if (insertError) throw new Error(`Erreur création ressource: ${insertError.message}`);

    // Recalculer le statut de la séquence
    await recalculateSequenceStatus(sequenceId);

    revalidatePath("/prof");
    return { resourceId: newResource!.id };
}

// ─────────────────────────────────────────────────────────────
// PUBLICATION
// ─────────────────────────────────────────────────────────────

/**
 * Publie une seule ressource (brouillon → publié)
 */
export async function publishResource(resourceId: string) {
    const { error } = await supabaseServer
        .from("resources")
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
        })
        .eq("id", resourceId);

    if (error) throw new Error(`Erreur publication: ${error.message}`);

    // Recalculer le statut de la séquence associée
    const { data: resource } = await supabaseServer
        .from("resources")
        .select("sequence_id")
        .eq("id", resourceId)
        .single();

    if (resource?.sequence_id) {
        await recalculateSequenceStatus(resource.sequence_id);
    }

    revalidatePath("/prof");
    revalidatePath("/");  // Rafraîchir l'espace élève
}

/**
 * Publie TOUTE la séquence (tous les brouillons → publié)
 */
export async function publishSequence(sequenceId: string) {
    // Récupérer toutes les ressources brouillon de cette séquence
    const { data: drafts } = await supabaseServer
        .from("resources")
        .select("id")
        .eq("sequence_id", sequenceId)
        .eq("status", "draft");

    if (!drafts || drafts.length === 0) {
        // Pas de brouillon lié à cette séquence — ce n'est pas une erreur fatale
        return;
    }

    const now = new Date().toISOString();

    // Publier chaque brouillon
    const { error } = await supabaseServer
        .from("resources")
        .update({
            status: 'published',
            published_at: now,
        })
        .eq("sequence_id", sequenceId)
        .eq("status", "draft");

    if (error) throw new Error(`Erreur publication séquence: ${error.message}`);

    // Mettre à jour le statut de la séquence
    await supabaseServer
        .from("sequences")
        .update({ status: 'published', updated_at: now })
        .eq("id", sequenceId);

    revalidatePath("/prof");
    revalidatePath("/");  // Rafraîchir l'espace élève
}

/**
 * Publie plusieurs ressources par leurs IDs (utilisé par le bouton "Tout valider")
 */
export async function publishResourcesByIds(resourceIds: string[]) {
    if (!resourceIds.length) return;

    const now = new Date().toISOString();

    const { error } = await supabaseServer
        .from("resources")
        .update({
            status: 'published',
            published_at: now,
        })
        .in("id", resourceIds)
        .eq("status", "draft");

    if (error) throw new Error(`Erreur publication: ${error.message}`);

    // Recalculer le statut de toutes les séquences concernées
    const { data: resources } = await supabaseServer
        .from("resources")
        .select("sequence_id")
        .in("id", resourceIds);

    const sequenceIds = [...new Set(
        (resources || []).map(r => r.sequence_id).filter(Boolean)
    )];

    for (const seqId of sequenceIds) {
        await recalculateSequenceStatus(seqId as string);
    }

    revalidatePath("/prof");
    revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────
// ÉDITION DE BROUILLONS
// ─────────────────────────────────────────────────────────────

/**
 * Récupère le contenu LaTeX d'un brouillon pour l'éditer
 */
export async function getDraftContent(resourceId: string): Promise<{ content: string; label: string | null; latex_url: string | null }> {
    const { data: resource, error } = await supabaseServer
        .from("resources")
        .select("latex_url, label")
        .eq("id", resourceId)
        .single();

    if (error || !resource) throw new Error("Ressource introuvable");

    if (!resource.latex_url) {
        return { content: '', label: resource.label, latex_url: null };
    }

    // Récupérer le contenu du fichier depuis l'URL
    try {
        const response = await fetch(resource.latex_url);
        if (!response.ok) throw new Error("Impossible de charger le fichier");
        const content = await response.text();
        return { content, label: resource.label, latex_url: resource.latex_url };
    } catch (e: any) {
        throw new Error(`Erreur récupération contenu: ${e.message}`);
    }
}

/**
 * Met à jour le contenu LaTeX d'un brouillon
 */
export async function updateDraftContent(resourceId: string, newContent: string): Promise<void> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("Bucket non configuré");

    const { data: resource, error: fetchError } = await supabaseServer
        .from("resources")
        .select("latex_url, created_by, sequence_id")
        .eq("id", resourceId)
        .single();

    if (fetchError || !resource) throw new Error("Ressource introuvable");

    let filePath: string;

    if (resource.latex_url) {
        const urlObj = new URL(resource.latex_url);
        const pathParts = urlObj.pathname.split('/object/public/' + bucketName + '/');
        filePath = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : `prof/drafts/${resourceId}_${Date.now()}.tex`;
    } else {
        filePath = `prof/drafts/${resourceId}_${Date.now()}.tex`;
    }

    const { error: uploadError } = await supabaseServer.storage
        .from(bucketName)
        .upload(filePath, newContent, {
            contentType: 'text/x-latex',
            upsert: true,
        });

    if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

    if (!resource.latex_url) {
        const { data: { publicUrl } } = supabaseServer.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        await supabaseServer
            .from("resources")
            .update({ latex_url: publicUrl })
            .eq("id", resourceId);
    }

    revalidatePath("/prof");
}

/**
 * Dépublie une ressource (publié → brouillon)
 */
export async function unpublishResource(resourceId: string) {
    const { error } = await supabaseServer
        .from("resources")
        .update({
            status: 'draft',
            published_at: null,
        })
        .eq("id", resourceId);

    if (error) throw new Error(`Erreur dépublication: ${error.message}`);

    const { data: resource } = await supabaseServer
        .from("resources")
        .select("sequence_id")
        .eq("id", resourceId)
        .single();

    if (resource?.sequence_id) {
        await recalculateSequenceStatus(resource.sequence_id);
    }

    revalidatePath("/prof");
    revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────
// CHAT SESSIONS
// ─────────────────────────────────────────────────────────────

/**
 * Crée une session chat pour un type de ressource
 */
export async function createChatSession(
    teacherId: string,
    sequenceId: string,
    resourceType: ProfResourceType
): Promise<string> {
    const { data, error } = await supabaseServer
        .from("prof_chat_sessions")
        .insert([{
            teacher_id: teacherId,
            sequence_id: sequenceId,
            resource_type: resourceType,
            messages: [],
            status: 'active',
        }])
        .select("id")
        .single();

    if (error) throw new Error(`Erreur création session: ${error.message}`);
    return data!.id;
}

/**
 * Met à jour les messages d'une session chat
 */
export async function updateChatMessages(
    sessionId: string,
    messages: any[],
    generatedContent?: string,
    generatedLatex?: string
) {
    const update: any = {
        messages,
        updated_at: new Date().toISOString(),
    };
    if (generatedContent !== undefined) update.generated_content = generatedContent;
    if (generatedLatex !== undefined) update.generated_latex = generatedLatex;

    const { error } = await supabaseServer
        .from("prof_chat_sessions")
        .update(update)
        .eq("id", sessionId);

    if (error) throw new Error(`Erreur mise à jour messages: ${error.message}`);
}

/**
 * Récupère une session chat complète
 */
export async function getChatSession(sessionId: string) {
    const { data, error } = await supabaseServer
        .from("prof_chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

    if (error) throw new Error(`Erreur récupération session: ${error.message}`);
    return data;
}

/**
 * Upload un fichier professeur (PDF, image, .tex, .docx)
 */
export async function uploadProfFile(formData: FormData): Promise<{ url: string; name: string }> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error("Bucket non configuré");

    const file = formData.get("file") as File;
    const teacherId = formData.get("teacher_id") as string;

    if (!file || !teacherId) throw new Error("Fichier et ID professeur requis");

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `prof/${teacherId}/uploads/${timestamp}-${safeName}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseServer.storage
        .from(bucketName)
        .upload(filePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
        });

    if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseServer.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return { url: publicUrl, name: file.name };
}
