import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.36.3';

// ─── Config ────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 1200;    // characters per chunk
const CHUNK_OVERLAP = 150;  // overlap between consecutive chunks
const MIN_CHUNK_LEN = 60;   // ignore chunks shorter than this

// ─── Helpers ───────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        const chunk = text.slice(start, end).trim();
        if (chunk.length >= MIN_CHUNK_LEN) chunks.push(chunk);
        if (end === text.length) break;
        start = end - CHUNK_OVERLAP;
    }
    return chunks;
}

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'text-embedding-ada-002', input: text }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`OpenAI: ${data.error.message}`);
    return data.data[0].embedding;
}

/** Convertit un ArrayBuffer en base64 sans dépasser la pile JS */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    const batchSize = 8192;
    for (let i = 0; i < uint8.length; i += batchSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + batchSize));
    }
    return btoa(binary);
}

// ─── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // Valider le secret du webhook
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    if (webhookSecret) {
        const auth = req.headers.get('authorization');
        if (auth !== `Bearer ${webhookSecret}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    let payload: any;
    try {
        payload = await req.json();
    } catch {
        return new Response('Invalid JSON', { status: 400 });
    }

    const { type, record, old_record } = payload;

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Suppression ────────────────────────────────────────────────────────
    if (type === 'DELETE') {
        const resourceId = old_record?.id;
        if (resourceId) {
            await supabase.from('rag_documents')
                .delete()
                .eq('metadata->>resource_id', resourceId);
        }
        return Response.json({ ok: true, action: 'deleted', resource_id: resourceId });
    }

    const resource = record;

    // ── Dépublication (UPDATE : published → autre) ─────────────────────────
    if (type === 'UPDATE' && old_record?.status === 'published' && resource?.status !== 'published') {
        await supabase.from('rag_documents')
            .delete()
            .eq('metadata->>resource_id', resource.id);
        return Response.json({ ok: true, action: 'unindexed', resource_id: resource.id });
    }

    // ── Ignorer si pas publié ou pas de PDF ────────────────────────────────
    if (!resource || resource.status !== 'published' || !resource.pdf_url) {
        return Response.json({ ok: true, action: 'skipped' });
    }

    // ── Récupérer chapitre + niveau ────────────────────────────────────────
    const { data: chapter } = await supabase
        .from('chapters')
        .select('id, title, level_id')
        .eq('id', resource.chapter_id)
        .single();

    const { data: level } = chapter
        ? await supabase.from('levels').select('id, label').eq('id', chapter.level_id).single()
        : { data: null };

    // ── Télécharger le PDF ─────────────────────────────────────────────────
    let pdfBase64: string;
    try {
        const pdfRes = await fetch(resource.pdf_url);
        if (!pdfRes.ok) throw new Error(`HTTP ${pdfRes.status}`);
        const buffer = await pdfRes.arrayBuffer();
        pdfBase64 = arrayBufferToBase64(buffer);
    } catch (err: any) {
        console.error('[RAG] PDF download failed:', err.message);
        return Response.json({ ok: false, error: 'pdf_download_failed' }, { status: 500 });
    }

    // ── Extraire le texte via Anthropic ────────────────────────────────────
    let extractedText = '';
    try {
        const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'document',
                        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
                    },
                    {
                        type: 'text',
                        text: 'Extrais tout le contenu textuel de ce document mathématique (cours, exercices, définitions, théorèmes, formules, exemples). Retourne uniquement le texte extrait, sans commentaire ni introduction.',
                    },
                ],
            }],
        });
        extractedText = msg.content[0].type === 'text' ? msg.content[0].text : '';
    } catch (err: any) {
        console.error('[RAG] Anthropic extraction failed:', err.message);
        return Response.json({ ok: false, error: 'extraction_failed' }, { status: 500 });
    }

    if (extractedText.length < MIN_CHUNK_LEN) {
        return Response.json({ ok: true, action: 'empty_document' });
    }

    // ── Supprimer l'ancien index pour cette ressource ──────────────────────
    await supabase.from('rag_documents')
        .delete()
        .eq('metadata->>resource_id', resource.id);

    // ── Découper, embedder, insérer ────────────────────────────────────────
    const chunks = chunkText(extractedText);
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    const baseMetadata = {
        resource_id: resource.id,
        chapter_id: resource.chapter_id ?? '',
        chapter_title: chapter?.title ?? '',
        niveau: level?.label ?? '',
        type_doc: resource.kind ?? 'cours',
        label: resource.label ?? '',
        source: 'resource',
        total_chunks: chunks.length,
    };

    let indexed = 0;
    for (let i = 0; i < chunks.length; i++) {
        try {
            const embedding = await getEmbedding(chunks[i], openaiKey);
            await supabase.from('rag_documents').insert({
                content: chunks[i],
                metadata: { ...baseMetadata, chunk_index: i },
                embedding,
            });
            indexed++;
        } catch (err: any) {
            console.error(`[RAG] Chunk ${i} failed:`, err.message);
            // Continue — les autres chunks sont quand même indexés
        }
    }

    console.log(`[RAG] Indexed ${indexed}/${chunks.length} chunks for resource ${resource.id}`);
    return Response.json({ ok: true, action: 'indexed', chunks: indexed, resource_id: resource.id });
});
