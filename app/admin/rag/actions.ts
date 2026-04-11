'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getEmbedding(text: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: text
        })
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);
    return result.data[0].embedding;
}

export type RagDocument = {
    id: string;
    content: string;
    metadata: Record<string, any>;
    created_at: string;
};

export type RagStats = {
    niveau: string;
    type_doc: string | null;
    count: number;
};

export type RagFileGroup = {
    niveau: string;
    type_doc: string | null;
    filename: string | null;
    chunks: number;
};

// ── Fetch documents with filters ──────────────────────────────────────
export async function fetchRagDocuments(
    page = 1,
    limit = 30,
    searchTerm = '',
    niveau = '',
    typeDoc = ''
) {
    try {
        let query = supabase
            .from('rag_documents')
            .select('id, content, metadata, created_at', { count: 'exact' });

        if (searchTerm) {
            query = query.ilike('content', `%${searchTerm}%`);
        }

        if (niveau) {
            query = query.eq('metadata->>niveau', niveau);
        }

        if (typeDoc) {
            query = query.eq('metadata->>type_doc', typeDoc);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching RAG documents:', error);
            throw new Error(`Failed to fetch documents: ${error.message}`);
        }

        return { documents: (data || []) as RagDocument[], total: count || 0 };
    } catch (error: any) {
        throw new Error(error.message);
    }
}

// ── Fetch stats by niveau ─────────────────────────────────────────────
export async function fetchRagStats(): Promise<RagStats[]> {
    const { data, error } = await supabase.rpc('exec_sql', {
        query_text: `
            SELECT
                metadata->>'niveau' as niveau,
                metadata->>'type_doc' as type_doc,
                COUNT(*)::int as count
            FROM rag_documents
            GROUP BY metadata->>'niveau', metadata->>'type_doc'
            ORDER BY niveau, type_doc
        `
    });

    // Fallback: query directly if rpc doesn't exist
    if (error) {
        // Use a simpler approach
        const { data: allDocs, error: err2 } = await supabase
            .from('rag_documents')
            .select('metadata');

        if (err2) throw new Error(err2.message);

        const statsMap = new Map<string, number>();
        for (const doc of allDocs || []) {
            const key = `${doc.metadata?.niveau || 'inconnu'}|${doc.metadata?.type_doc || 'null'}`;
            statsMap.set(key, (statsMap.get(key) || 0) + 1);
        }

        return Array.from(statsMap.entries()).map(([key, count]) => {
            const [niveau, type_doc] = key.split('|');
            return { niveau, type_doc: type_doc === 'null' ? null : type_doc, count };
        }).sort((a, b) => a.niveau.localeCompare(b.niveau));
    }

    return data;
}

// ── Fetch file groups ─────────────────────────────────────────────────
export async function fetchRagFileGroups(): Promise<RagFileGroup[]> {
    const { data: allDocs, error } = await supabase
        .from('rag_documents')
        .select('metadata');

    if (error) throw new Error(error.message);

    const groupMap = new Map<string, number>();
    for (const doc of allDocs || []) {
        const key = `${doc.metadata?.niveau || 'inconnu'}|${doc.metadata?.type_doc || ''}|${doc.metadata?.filename || ''}`;
        groupMap.set(key, (groupMap.get(key) || 0) + 1);
    }

    return Array.from(groupMap.entries()).map(([key, chunks]) => {
        const [niveau, type_doc, filename] = key.split('|');
        return {
            niveau,
            type_doc: type_doc || null,
            filename: filename || null,
            chunks
        };
    }).sort((a, b) => a.niveau.localeCompare(b.niveau) || (a.filename || '').localeCompare(b.filename || ''));
}

// ── Add a document ────────────────────────────────────────────────────
export async function addRagDocument(content: string, metadata: Record<string, any>) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured on the server.');
        }

        const embedding = await getEmbedding(content);

        const { data, error } = await supabase.from('rag_documents').insert({
            content,
            metadata,
            embedding
        }).select('id, content, metadata, created_at').single();

        if (error) throw new Error(`Failed to insert: ${error.message}`);
        return data;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

// ── Delete a single document ──────────────────────────────────────────
export async function deleteRagDocument(id: string) {
    const { error } = await supabase.from('rag_documents').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete: ${error.message}`);
    return { success: true };
}

// ── Bulk delete by filename pattern ───────────────────────────────────
export async function bulkDeleteByFilename(filename: string) {
    const { data, error } = await supabase
        .from('rag_documents')
        .delete()
        .eq('metadata->>filename', filename)
        .select('id');

    if (error) throw new Error(`Bulk delete failed: ${error.message}`);
    return { deleted: data?.length || 0 };
}

// ── Bulk delete by list of IDs ────────────────────────────────────────
export async function bulkDeleteByIds(ids: string[]) {
    const { data, error } = await supabase
        .from('rag_documents')
        .delete()
        .in('id', ids)
        .select('id');

    if (error) throw new Error(`Bulk delete failed: ${error.message}`);
    return { deleted: data?.length || 0 };
}

// ── Update a document ─────────────────────────────────────────────────
export async function updateRagDocument(id: string, content: string, metadata: Record<string, any>) {
    try {
        const embedding = await getEmbedding(content);

        const { data, error } = await supabase.from('rag_documents').update({
            content,
            metadata,
            embedding
        }).eq('id', id).select('id, content, metadata, created_at').single();

        if (error) throw new Error(`Failed to update: ${error.message}`);
        return data;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

// ── Bulk update metadata (e.g. fix niveau) ────────────────────────────
export async function bulkUpdateMetadata(filename: string, newMetadata: Record<string, any>) {
    // Get all docs with this filename
    const { data: docs, error: fetchErr } = await supabase
        .from('rag_documents')
        .select('id, metadata')
        .eq('metadata->>filename', filename);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!docs || docs.length === 0) return { updated: 0 };

    let updated = 0;
    for (const doc of docs) {
        const merged = { ...doc.metadata, ...newMetadata };
        const { error } = await supabase
            .from('rag_documents')
            .update({ metadata: merged })
            .eq('id', doc.id);
        if (!error) updated++;
    }

    return { updated };
}

// ── AI Magic LaTeX Fixer ──────────────────────────────────────────────
export async function fixRagContentWithAI(content: string) {
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Tu es un expert en conversion LaTeX vers Markdown + KaTeX. Ta mission est de transformer un document LaTeX complet ou partiel (incluant preambles, environnements, et commandes complexes) en un document Markdown propre, lisible et parfaitement rendu par KaTeX.

Règles de conversion :
1. STRUCTURE : Supprime le préambule (\\documentclass, \\usepackage, etc.) et le \\begin{document}. Ne garde que le contenu utile.
2. TITRES : Convertis \\section, \\subsection, \\subsubsection en #, ##, ###.
3. LISTES : Convertis \\begin{enumerate} en listes numérotées (1., 2.) et \\begin{itemize} en puces (-).
4. MATHÉMATIQUES (CRITIQUE) : 
   - Convertis TOUS les délimiteurs \\( ... \\) en $ ... $.
   - Convertis TOUS les délimiteurs \\[ ... \\] en $$ ... $$.
   - Assure-toi que TOUTE formule mathématique est entourée de symboles monétaires ($).
5. TABLEAUX, GRAPHIQUES & GÉOMÉTRIE (MIMIMATHS PRO) : 
   - Utilise EXCLUSIVEMENT les balises suivantes :
     A) <mathtable data='...' /> :
        { "xValues": ["xi", "xj"], "rows": [{"label": "f", "type": "variation", "content": ["val", "nearrow", "val"]}] }
        IMPORTANT : "content" pour variation DOIT alterner valeur et flèche (ex: 2N-1 items pour N valeurs de x).
     B) <mathgraph data='...' /> :
        { "functions": [{"fn": "sin(x)", "color": "#ff0000"}], "title": "Courbe" }
     C) <geometryfigure data='...' /> :
        { "objects": [{"id": "A", "kind": "point", "x": 1, "y": 2}], "title": "Figure" }
6. NETTOYAGE : Supprime les commandes LaTeX inutiles (préambule).
7. NE METS JAMAIS de balises de bloc de code markdown (\`\`\`markdown).`
                    },
                    {
                        role: 'user',
                        content: content
                    }
                ],
                temperature: 0.1
            })
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error.message);
        
        let fixed = result.choices[0].message.content;
        
        // Nettoyage des balises de blocs de code markdown si l'IA en a mis
        fixed = fixed.replace(/^```markdown\n/i, '').replace(/^```\n/i, '').replace(/\n```$/i, '').trim();
        
        return fixed;
    } catch (error: any) {
        throw new Error(error.message);
    }
}
