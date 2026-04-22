/**
 * POST /api/admin/rag-ingest
 * ─────────────────────────────────────────────────────────────────────────────
 * Indexe les fichiers LaTeX des ressources dans rag_documents (pgvector).
 *
 * Body JSON :
 *   { force?: boolean }          — force=true ré-indexe même si déjà présent
 *   { resource_id?: string }     — indexe une seule ressource
 *
 * Réponse : { success, stats: { total, indexed, skipped, chunks, errors } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/api-auth';
import { supabaseServer } from '@/lib/supabaseServer';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CHUNK_CHARS = 1200;
const BATCH_SIZE = 20;

// ── Nettoyage LaTeX ───────────────────────────────────────────────────────────

function stripPreamble(tex: string): string {
    const idx = tex.indexOf('\\begin{document}');
    if (idx !== -1) tex = tex.substring(idx + '\\begin{document}'.length);
    return tex.replace(/\\end\{document\}/g, '');
}

function cleanTex(tex: string): string {
    return tex
        .replace(/%[^\n]*/g, '')
        .replace(/\\(usepackage|documentclass|geometry|setlength|pagestyle|thispagestyle|renewcommand|newcommand|definecolor|usetikzlibrary)\{[^}]*\}(\[[^\]]*\])?\{?[^}]*\}?/g, '')
        .replace(/\\\\/g, ' ')
        .replace(/\\(vspace|hspace)\{[^}]*\}/g, ' ')
        .replace(/\\(newpage|clearpage|pagebreak|vfill|hfill|noindent|centering|medskip|bigskip|smallskip)\b/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

// ── Découpage en chunks ───────────────────────────────────────────────────────

const ENV_NAMES = 'methode|definition|theoreme|propriete|exemple|exercice|remarque|tcolorbox|mdframed|proof|demo|resolution';

function chunkLatex(rawTex: string, contextPrefix: string): string[] {
    const tex = cleanTex(stripPreamble(rawTex));
    const results: string[] = [];

    // Séparer par sections
    const sections = tex.split(/(?=\\(?:sub)*section\{)/);

    for (const section of sections) {
        if (section.trim().length < 60) continue;

        const envRegex = new RegExp(
            `\\\\begin\\{(${ENV_NAMES})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
            'g'
        );

        let lastIdx = 0;
        let match: RegExpExecArray | null;
        const parts: string[] = [];

        while ((match = envRegex.exec(section)) !== null) {
            const before = section.substring(lastIdx, match.index).trim();
            if (before.length > 80) parts.push(before);
            parts.push(`[${match[1].toUpperCase()}]\n${match[2].trim()}`);
            lastIdx = match.index + match[0].length;
        }

        const tail = section.substring(lastIdx).trim();
        if (tail.length > 80) parts.push(tail);

        const finalParts = parts.length > 0 ? parts : [section.trim()];

        for (const part of finalParts) {
            const full = `${contextPrefix}\n\n${part}`;
            if (full.length <= MAX_CHUNK_CHARS) {
                results.push(full);
            } else {
                // Découpe par paragraphes
                const paras = part.split(/\n\n+/);
                let acc = `${contextPrefix}\n\n`;
                for (const para of paras) {
                    if (acc.length + para.length > MAX_CHUNK_CHARS && acc.length > contextPrefix.length + 10) {
                        if (acc.trim().length > contextPrefix.length + 50) results.push(acc.trim());
                        acc = `${contextPrefix}\n\n${para}`;
                    } else {
                        acc += (acc.endsWith('\n\n') ? '' : '\n\n') + para;
                    }
                }
                if (acc.trim().length > contextPrefix.length + 50) results.push(acc.trim());
            }
        }
    }

    return results.filter(c => c.trim().length > 120);
}

// ── Embeddings OpenAI ─────────────────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<number[][] | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
        });
        const data = await res.json();
        if (data.error) { console.error('[rag-ingest] OpenAI:', data.error.message); return null; }
        return (data.data as any[]).map(d => d.embedding);
    } catch (err) {
        console.error('[rag-ingest] embed fetch:', err);
        return null;
    }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const user = await getAuthUser();
    if (!user || !isAdmin(user)) {
        return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const force: boolean = body.force === true;
    const filterResourceId: string | undefined = body.resource_id;

    // Récupère toutes les ressources avec fichier LaTeX + contexte hiérarchique
    let query = supabaseServer
        .from('resources')
        .select('id, kind, latex_url, chapter_id, chapters!inner(id, title, level_id, levels!inner(id, label))')
        .not('latex_url', 'is', null);

    if (filterResourceId) query = (query as any).eq('id', filterResourceId);

    const { data: resources, error: fetchErr } = await query;
    if (fetchErr || !resources) {
        return NextResponse.json({ error: 'Lecture ressources: ' + fetchErr?.message }, { status: 500 });
    }

    const stats = { total: resources.length, indexed: 0, skipped: 0, chunks: 0, errors: 0 };

    for (const resource of resources as any[]) {
        try {
            // Vérifier si déjà indexé
            if (!force && !filterResourceId) {
                const { count } = await supabaseServer
                    .from('rag_documents')
                    .select('id', { count: 'exact', head: true })
                    .eq('metadata->>resource_id', resource.id)
                    .eq('metadata->>source', 'latex');
                if ((count ?? 0) > 0) { stats.skipped++; continue; }
            }

            // Télécharger le .tex
            const texRes = await fetch(resource.latex_url, { signal: AbortSignal.timeout(15_000) });
            if (!texRes.ok) { stats.errors++; continue; }
            const texContent = await texRes.text();

            const chapter = resource.chapters;
            const level = chapter.levels;
            const contextPrefix = `[Niveau: ${level.label} | Chapitre: ${chapter.title} | Type: ${resource.kind}]`;

            const chunks = chunkLatex(texContent, contextPrefix);
            if (chunks.length === 0) { stats.skipped++; continue; }

            // Supprimer les anciens chunks de cette ressource
            await supabaseServer
                .from('rag_documents')
                .delete()
                .eq('metadata->>resource_id', resource.id)
                .eq('metadata->>source', 'latex');

            // Embedder par batch + insérer
            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batch = chunks.slice(i, i + BATCH_SIZE);
                const embeddings = await embedBatch(batch);
                if (!embeddings) { stats.errors++; continue; }

                const rows = batch.map((content, j) => ({
                    content,
                    embedding: embeddings[j],
                    metadata: {
                        source: 'latex',
                        resource_id: resource.id,
                        chapter_id: resource.chapter_id,
                        chapter_title: chapter.title,
                        niveau: level.label,
                        kind: resource.kind,
                    },
                }));

                const { error: insertErr } = await supabaseServer.from('rag_documents').insert(rows);
                if (insertErr) { stats.errors++; } else { stats.chunks += batch.length; }
            }

            stats.indexed++;
        } catch (err: any) {
            console.error(`[rag-ingest] resource ${resource.id}:`, err.message);
            stats.errors++;
        }
    }

    return NextResponse.json({ success: true, stats });
}
