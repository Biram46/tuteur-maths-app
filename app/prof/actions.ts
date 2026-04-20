"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import type { ProfResourceType } from "@/lib/prof-types";
import { appendFileSync } from "fs";
import { logAdminAction } from "@/lib/audit-logger";



// ─────────────────────────────────────────────────────────────
// CHAPITRES (création depuis l'espace prof)
// ─────────────────────────────────────────────────────────────

/**
 * Crée un nouveau chapitre pour un niveau donné (utilisable depuis l'espace prof)
 */
export async function createChapterFromProf(
    levelId: string,
    title: string,
    position?: number
): Promise<{ id: string; title: string; level_id: string; position: number; code: string; published: boolean }> {
    if (!levelId || !title?.trim()) {
        throw new Error("Niveau et titre sont obligatoires.");
    }

    const code = title.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);

    const { data, error } = await supabaseServer
        .from("chapters")
        .insert([{
            level_id: levelId,
            title: title.trim(),
            code,
            position: position || 99,
            published: false,
        }])
        .select()
        .single();

    if (error) throw new Error(`Erreur création chapitre: ${error.message}`);

    revalidatePath("/prof");
    revalidatePath("/admin");
    return data!;
}

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

    // Upload le fichier dans Storage (HTML pour interactif, LaTeX pour les autres)
    const timestamp = Date.now();
    const isInteractif = resourceType === 'interactif';
    const fileExtension = isInteractif ? 'html' : 'tex';
    const fileName = `${resourceType}_${timestamp}.${fileExtension}`;
    const filePath = `prof/${teacherId}/sequences/${sequenceId}/${fileName}`;

    const { error: uploadError } = await supabaseServer.storage
        .from(bucketName)
        .upload(filePath, content, {
            contentType: isInteractif ? 'text/html' : 'text/x-latex',
            upsert: true,
        });

    if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

    const { data: { publicUrl: contentUrl } } = supabaseServer.storage
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
                latex_url: contentUrl,
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
            latex_url: contentUrl,
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

// ─────────────────────────────────────────────────────────────
// NOMMAGE DES RESSOURCES
// ─────────────────────────────────────────────────────────────

/**
 * Génère le nom de fichier normalisé d'une ressource pour l'espace élève.
 * Conventions : cours_chap_classe | feuille_chap_classe_N | ds_chap_classe | eam_chap_classe
 */
function buildResourceFileName(
    label: string | null,
    chapterCode: string | null,
    chapterTitle: string | null,
    levelCode: string | null,
): string {
    const slugify = (s: string) =>
        s.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const chap = slugify(chapterCode || chapterTitle || 'chap');
    const classe = slugify(levelCode || 'classe');
    const l = (label || '').toLowerCase();

    if (l.includes('feuille') || (l.includes('exercice') && !l.includes('interactif'))) {
        const numMatch = l.match(/n[°o]?\s*(\d+)/i);
        const num = numMatch ? numMatch[1] : '1';
        return `feuille_${chap}_${classe}_${num}`;
    }
    if (l.includes('devoir')) return `ds_${chap}_${classe}`;
    if (l.includes('epreuve') || l.includes('épreuve') || l.includes('eam')) return `eam_${chap}_${classe}`;
    return `cours_${chap}_${classe}`;
}

/**
 * Publie une seule ressource (brouillon → publié).
 * S'assure qu'un PDF est disponible (compile le LaTeX si besoin)
 * et nomme le fichier selon la convention cours/feuille_chap_classe_N.
 * Retourne { pdfUrl } si le PDF a été généré, { pdfError } sinon.
 */
export async function publishResource(resourceId: string): Promise<{ pdfUrl?: string; pdfError?: string }> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    const _log = (msg: string) => {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        try { appendFileSync('C:\\Users\\HP\\Documents\\projet\\tuteur-maths-app\\publish-debug.log', line, 'utf8'); } catch(e) { console.warn('_log fail:', e); }
        console.log(msg);
    };

    // 1. Récupérer la ressource complète
    const { data: resource, error: fetchErr } = await supabaseServer
        .from("resources")
        .select("sequence_id, chapter_id, kind, label, latex_url, pdf_url, created_by")
        .eq("id", resourceId)
        .single();

    if (fetchErr || !resource) throw new Error("Ressource introuvable");

    // 2. Résoudre chapitre + niveau pour construire le nom de fichier
    let chapterCode: string | null = null;
    let chapterTitle: string | null = null;
    let levelCode: string | null = null;

    if (resource.chapter_id) {
        const { data: chap } = await supabaseServer
            .from("chapters").select("code, title")
            .eq("id", resource.chapter_id).single();
        chapterCode = chap?.code ?? null;
        chapterTitle = chap?.title ?? null;
    }

    if (resource.sequence_id) {
        const { data: seq } = await supabaseServer
            .from("sequences").select("level_id")
            .eq("id", resource.sequence_id).single();
        if (seq?.level_id) {
            const { data: lvl } = await supabaseServer
                .from("levels").select("code")
                .eq("id", seq.level_id).single();
            levelCode = lvl?.code ?? null;
        }
    }

    const properFileName = buildResourceFileName(resource.label, chapterCode, chapterTitle, levelCode);

    // 3. Compiler le LaTeX en PDF et l'uploader avec le bon nom (sauf interactif)
    const isInteractif = resource.kind === 'interactif';
    let generatedPdfUrl: string | undefined;
    let pdfErrorMsg: string | undefined;

    if (!isInteractif && bucketName && resource.latex_url) {
        try {
            _log(`[publishResource] Démarrage compilation pour "${properFileName}"…`);
            _log(`[publishResource] latex_url = ${resource.latex_url}`);

            const latexResp = await fetch(resource.latex_url);
            if (!latexResp.ok) throw new Error(`Impossible de charger le .tex (HTTP ${latexResp.status})`);
            const latex = await latexResp.text();
            _log(`[publishResource] LaTeX récupéré (${latex.length} chars)`);

            const apiUrl = process.env.SYMPY_API_URL || process.env.PYTHON_API_URL || 'http://localhost:5000';
            _log(`[publishResource] Compilation via ${apiUrl}`);

            const compileResp = await fetch(`${apiUrl}/latex-preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex, dpi: 150 }),
                signal: AbortSignal.timeout(120_000),
            });

            if (!compileResp.ok) {
                const errText = await compileResp.text().catch(() => '');
                throw new Error(`API ${compileResp.status}: ${errText.slice(0, 300)}`);
            }

            const data = await compileResp.json();
            _log(`[publishResource] Réponse API — success=${data.success} has_pdf=${!!data.pdf} error=${data.error}`);
            if (!data.success || !data.pdf) {
                throw new Error(data.error || 'Pas de PDF retourné par l\'API');
            }

            const pdfBuffer = Buffer.from(data.pdf, 'base64');
            const teacherPrefix = resource.created_by ?? 'shared';
            const pdfPath = `students/${teacherPrefix}/${properFileName}.pdf`;
            const texPath = `students/${teacherPrefix}/${properFileName}.tex`;
            _log(`[publishResource] Upload PDF → ${pdfPath} (${pdfBuffer.length} bytes)`);

            const { error: upErr } = await supabaseServer.storage
                .from(bucketName)
                .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

            if (upErr) throw new Error(`Upload Storage: ${upErr.message}`);

            // Upload aussi le .tex dans l'espace élèves
            _log(`[publishResource] Upload LaTeX → ${texPath} (${latex.length} chars)`);
            const { error: texUpErr } = await supabaseServer.storage
                .from(bucketName)
                .upload(texPath, latex, { contentType: 'text/x-latex', upsert: true });
            if (texUpErr) _log(`[publishResource] ⚠️ Upload .tex échoué : ${texUpErr.message}`);

            const { data: { publicUrl } } = supabaseServer.storage
                .from(bucketName).getPublicUrl(pdfPath);

            const { data: { publicUrl: texPublicUrl } } = supabaseServer.storage
                .from(bucketName).getPublicUrl(texPath);

            const { error: dbErr } = await supabaseServer
                .from("resources")
                .update({ pdf_url: publicUrl, latex_url: texPublicUrl })
                .eq("id", resourceId);

            if (dbErr) throw new Error(`DB update pdf_url/latex_url: ${dbErr.message}`);

            generatedPdfUrl = publicUrl;
            _log(`[publishResource] ✅ PDF publié : ${publicUrl}`);
        } catch (pdfErr) {
            pdfErrorMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
            _log(`[publishResource] ❌ Erreur PDF : ${pdfErrorMsg}`);
        }
    } else {
        _log(`[publishResource] Skipped — isInteractif=${isInteractif} bucketName=${bucketName} latex_url=${resource.latex_url}`);
    }

    // 4. Publier la ressource (même si PDF a échoué)
    const { error } = await supabaseServer
        .from("resources")
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq("id", resourceId);

    if (error) throw new Error(`Erreur publication: ${error.message}`);

    if (resource.sequence_id) {
        await recalculateSequenceStatus(resource.sequence_id);
    }

    logAdminAction({ action: 'publish_resource', targetType: 'resource', targetId: resourceId, success: true }).catch(() => {});
    revalidatePath("/prof");
    revalidatePath("/");
    return { pdfUrl: generatedPdfUrl, pdfError: pdfErrorMsg };
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

    logAdminAction({ action: 'publish_sequence', targetType: 'sequence', targetId: sequenceId, success: true, metadata: { resource_count: drafts.length } }).catch(() => {});

    revalidatePath("/prof");
    revalidatePath("/");  // Rafraîchir l'espace élève
}

/**
 * Publie plusieurs ressources par leurs IDs (utilisé par le bouton "Tout valider").
 * Génère le PDF pour chaque ressource via publishResource.
 */
export async function publishResourcesByIds(resourceIds: string[]) {
    if (!resourceIds.length) return;

    // Publier chaque ressource avec génération PDF (en séquentiel pour ne pas surcharger l'API)
    for (const id of resourceIds) {
        await publishResource(id);
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
 * Compile le LaTeX en PDF et sauvegarde l'image dans le brouillon.
 * Appelé après saveDraft quand l'onglet PDF est actif.
 */
export async function saveDraftPdf(resourceId: string, latex: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
    if (!bucketName) return { success: false, error: 'Bucket non configuré' };

    try {
        // 1. Compiler via l'API Python
        const apiUrl = process.env.SYMPY_API_URL || process.env.PYTHON_API_URL || 'http://localhost:5000';
        const resp = await fetch(`${apiUrl}/latex-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex, dpi: 150 }),
            signal: AbortSignal.timeout(60_000),
        });

        if (!resp.ok) {
            const err = await resp.text();
            return { success: false, error: `Compilation échouée: ${err.slice(0, 200)}` };
        }

        const data = await resp.json();
        if (!data.success || !data.image) {
            return { success: false, error: data.error || 'Pas d\'image générée' };
        }

        // 2. Décoder base64 → buffer
        const base64Data = data.image.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // 3. Upload aperçu PNG dans Supabase Storage
        const timestamp = Date.now();
        const pngPath = `prof/drafts/${resourceId}_${timestamp}_preview.png`;

        const { error: uploadError } = await supabaseServer.storage
            .from(bucketName)
            .upload(pngPath, buffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (uploadError) return { success: false, error: `Upload échoué: ${uploadError.message}` };

        // 4. Upload le vrai PDF si disponible
        let pdfUrl: string | undefined;
        if (data.pdf) {
            const pdfBuffer = Buffer.from(data.pdf, 'base64');
            const pdfPath = `prof/drafts/${resourceId}_${timestamp}_preview.pdf`;

            const { error: pdfUploadError } = await supabaseServer.storage
                .from(bucketName)
                .upload(pdfPath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (!pdfUploadError) {
                const { data: { publicUrl: pdfPublicUrl } } = supabaseServer.storage
                    .from(bucketName)
                    .getPublicUrl(pdfPath);
                pdfUrl = pdfPublicUrl;
            }
        }

        // 5. URL publique de l'aperçu PNG
        const { data: { publicUrl } } = supabaseServer.storage
            .from(bucketName)
            .getPublicUrl(pngPath);

        // 6. Mettre à jour la ressource avec pdf_url (le vrai PDF) et image_url (aperçu PNG)
        const { error: dbError } = await supabaseServer
            .from('resources')
            .update({
                pdf_url: pdfUrl || publicUrl,
                image_url: publicUrl,
            })
            .eq('id', resourceId);

        if (dbError) return { success: false, error: `DB erreur: ${dbError.message}` };

        revalidatePath("/prof");
        return { success: true, pdfUrl: publicUrl };

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
    }
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
 * et extrait le contenu textuel si possible (PDF, TEX)
 */
export async function uploadProfFile(formData: FormData): Promise<{ url: string; name: string; extractedContent?: string }> {
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

    // Extraire le contenu selon le type de fichier
    let extractedContent: string | undefined;
    const fileName = file.name.toLowerCase();

    try {
        if (fileName.endsWith('.tex')) {
            // Fichier LaTeX : lire directement le texte
            const decoder = new TextDecoder('utf-8');
            extractedContent = decoder.decode(buffer);
            console.log(`[Upload] 📄 Fichier .tex extrait (${extractedContent.length} caractères)`);
        } else if (fileName.endsWith('.pdf')) {
            // Fichier PDF : extraire le texte avec pdf-parse
            const pdfBuffer = Buffer.from(buffer);
            
            // Polyfill pour éviter le crash "DOMMatrix is not defined" pallié à cause de pdf-parse
            if (typeof globalThis.DOMMatrix === 'undefined') {
                (globalThis as any).DOMMatrix = class DOMMatrix {};
            }
            if (typeof globalThis.Path2D === 'undefined') {
                (globalThis as any).Path2D = class Path2D {};
            }
            if (typeof globalThis.ImageData === 'undefined') {
                (globalThis as any).ImageData = class ImageData {};
            }

            const pdfParseModule = await import('pdf-parse');
            const pdf = typeof pdfParseModule === 'function' ? pdfParseModule : ((pdfParseModule as any).default || (pdfParseModule as any).pdf || pdfParseModule);
            const pdfData = await pdf(pdfBuffer);
            extractedContent = pdfData.text;
            console.log(`[Upload] 📕 PDF extrait (${extractedContent?.length || 0} caractères, ${pdfData.numpages} pages)`);
        }
        // Les images (.png, .jpg) seront traitées par GPT-4o Vision via l'API
    } catch (extractError: any) {
        console.warn(`[Upload] ⚠️ Impossible d'extraire le contenu de ${file.name}:`, extractError.message);
        // On continue sans contenu extrait - le fichier reste accessible via URL
    }

    return { url: publicUrl, name: file.name, extractedContent };
}
