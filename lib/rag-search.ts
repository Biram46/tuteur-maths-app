import { RAW_PROGRAMMES } from "./programmes-raw";
import { createClient } from '@supabase/supabase-js';

/**
 * RAG Search Module for Programmes Officiels
 * 
 * Two strategies:
 * 1. Supabase Vector Search (when embeddings are available) — uses Gemini embeddings + pgvector
 * 2. Lexical fallback (TF-IDF inspired) — works without any API calls
 * 
 * The system automatically falls back to lexical search if vector search fails.
 */

// ═══════════════════════════════════════════════════════════════════
// STRATEGY 1: Supabase Vector Search
// ═══════════════════════════════════════════════════════════════════

async function vectorSearch(query: string, level?: string): Promise<string | null> {
    try {
        // Sécuriser level : garantir que c'est une string
        const safeLevel = typeof level === 'string' ? level : '';
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
            console.warn("[RAG] Missing API keys for vector search. Falling back to lexical.");
            return null;
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. Generate embedding with OpenAI
        let queryEmbedding;
        try {
            const res = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'text-embedding-ada-002',
                    input: query
                })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error.message);
            queryEmbedding = result.data[0].embedding;
        } catch (embErr) {
            console.warn("[RAG] OpenAI embedding failed:", embErr);
            return null;
        }

        // 2. Build filter
        const filter: Record<string, string> = {};
        if (safeLevel) {
            const levelMap: Record<string, string> = {
                'seconde': 'seconde',
                '2nde': 'seconde',
                '1spe': '1spe',
                'première': '1spe',
                'premiere': '1spe',
                '1stmg': '1stmg',
                'tle_spe': 'tle_spe',
                'terminale': 'tle_spe',
                'tle_comp': 'tle_comp',
                'tle_expert': 'tle_expert',
                'tle_stmg': 'tle_stmg',
            };
            const mappedLevel = levelMap[safeLevel.toLowerCase()] || safeLevel.toLowerCase();
            filter.niveau = mappedLevel;
        }

        // 3. Search Supabase
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            filter: Object.keys(filter).length > 0 ? filter : {},
            match_count: 8,
        });

        if (error || !data || data.length === 0) {
            console.warn("[RAG] Supabase search returned no results or error:", error);
            return null;
        }

        const topContexts = data.map((r: { content: string; similarity: number; metadata: any }) => {
            const docType = r.metadata?.type_doc ? r.metadata.type_doc.toUpperCase() : "PROGRAMME OFFICIEL";
            return `[Document: ${docType} | Similarité: ${(r.similarity * 100).toFixed(0)}%]\n${r.content}`;
        });

        return [
            "EXTRAITS PERTINENTS (Base de Connaissance RAG: Programme, Cours, Exercices):",
            "---",
            ...topContexts,
            "---"
        ].join('\n\n');
    } catch (error) {
        console.warn("[RAG] Vector search error:", error);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════
// STRATEGY 2: Lexical Fallback (TF-IDF inspired, in-memory)
// ═══════════════════════════════════════════════════════════════════

type Chunk = {
    id: string;
    level: string;
    text: string;
    tokens: string[];
};

let db: Chunk[] = [];

function initDB() {
    if (db.length > 0) return;

    for (const [level, content] of Object.entries(RAW_PROGRAMMES)) {
        const paragraphs = content.split(/\n\s*\n|(?=−)/g).filter(p => p.trim().length > 30);

        let currentChunk = "";
        for (const p of paragraphs) {
            if (currentChunk.length + p.length > 800 && currentChunk.length > 0) {
                db.push(createChunk(level, currentChunk.trim()));
                currentChunk = "";
            }
            currentChunk += p + "\n";
        }
        if (currentChunk.trim().length > 0) {
            db.push(createChunk(level, currentChunk.trim()));
        }
    }
    console.log(`[RAG] Lexical DB initialized with ${db.length} chunks.`);
}

const STOP_WORDS = ['pour', 'avec', 'dans', 'sont', 'être', 'avoir', 'plus', 'moins',
    'cette', 'fonction', 'point', 'nombre', 'deux', 'peut', 'classe',
    'élèves', 'programme', 'mathématiques'];

function tokenize(text: string): string[] {
    return text.toLowerCase()
        .replace(/[.,;!?()]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !STOP_WORDS.includes(w));
}

function createChunk(level: string, text: string): Chunk {
    return {
        id: Math.random().toString(36).substring(7),
        level,
        text,
        tokens: tokenize(text)
    };
}

function lexicalSearch(query: string, level?: string): string {
    initDB();

    const safeLevel = typeof level === 'string' ? level : '';
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return "";

    const scored = db.map(chunk => {
        let levelScore = 1;
        if (safeLevel && chunk.level.toLowerCase().includes(safeLevel.toLowerCase())) {
            levelScore = 2;
        }

        let matchCount = 0;
        for (const qt of queryTokens) {
            if (chunk.tokens.includes(qt) || chunk.text.toLowerCase().includes(qt)) {
                matchCount++;
            }
        }

        return { chunk, score: matchCount * levelScore };
    });

    scored.sort((a, b) => b.score - a.score);

    if (scored[0].score === 0) return "";

    const topContexts = scored.slice(0, 3).map(s => s.chunk.text);

    return [
        "EXTRAITS PERTINENTS DU PROGRAMME OFFICIEL (Recherche RAG Lexicale):",
        "---",
        ...topContexts,
        "---"
    ].join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Recherche les chunks pertinents dans les programmes officiels.
 * Essaie d'abord la recherche vectorielle (Supabase + Gemini embeddings),
 * puis tombe en fallback lexical si indisponible.
 * 
 * @param query La requête de l'utilisateur ou du contexte
 * @param level Niveau scolaire pour filtrer (ex: 'seconde', '1spe', etc)
 * @returns Le texte des programmes les plus pertinents
 */
export async function searchProgrammeRAG(query: string, level?: string): Promise<string> {
    // Try vector search first
    const vectorResult = await vectorSearch(query, level);
    if (vectorResult) {
        return vectorResult;
    }
    
    // Fallback to lexical search
    return lexicalSearch(query, level);
}

/**
 * Version synchrone pour la rétrocompatibilité.
 * Utilise uniquement la recherche lexicale (pas d'embeddings).
 */
export function searchProgrammeRAGSync(query: string, level?: string): string {
    return lexicalSearch(query, level);
}
