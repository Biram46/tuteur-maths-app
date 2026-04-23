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

        // 1. Generate embedding — même modèle que l'ingestion (text-embedding-3-small)
        let queryEmbedding;
        try {
            const res = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
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

        // 2. Pas de filtre niveau — le préfixe contextuel dans chaque chunk
        //    (ex: "[Niveau: Terminale | Chapitre: ...]") suffit pour la similarité sémantique.
        //    Un filtre par niveau crée un mismatch avec les labels bruts stockés en metadata.

        // 3. Search Supabase
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            filter: {},
            match_count: 8,
        });

        if (error || !data || data.length === 0) {
            console.warn("[RAG] Supabase search returned no results or error:", error);
            return null;
        }

        console.log(`[RAG] Vector search OK: ${data.length} chunks retrieved (top similarity: ${(data[0]?.similarity * 100).toFixed(0)}%)`);

        const topContexts = data.map((r: { content: string; similarity: number; metadata: any }) => {
            const docType = r.metadata?.kind ?? r.metadata?.type_doc ?? 'cours';
            return `[Document: ${docType.toUpperCase()} | Similarité: ${(r.similarity * 100).toFixed(0)}%]\n${r.content}`;
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
// NIVEAU NORMALIZATION — shared by both strategies
// ═══════════════════════════════════════════════════════════════════

const LEVEL_MAP: Record<string, string> = {
    'seconde': 'seconde',
    '2nde': 'seconde',
    '2de': 'seconde',
    '1spe': '1spe',
    'première': '1spe',
    'premiere': '1spe',
    '1ère': '1spe',
    '1ere': '1spe',
    'première spécialité': '1spe',
    'premiere specialite': '1spe',
    '1stmg': '1stmg',
    'première stmg': '1stmg',
    'tle_spe': 'tle_spe',
    'terminale': 'tle_spe',
    'tle': 'tle_spe',
    'terminale spécialité': 'tle_spe',
    'terminale specialite': 'tle_spe',
    'tle_comp': 'tle_comp',
    'terminale complémentaire': 'tle_comp',
    'terminale complementaire': 'tle_comp',
    'tle_expert': 'tle_expert',
    'terminale expert': 'tle_expert',
    'terminale maths expertes': 'tle_expert',
    'tle_stmg': 'tle_stmg',
    'terminale stmg': 'tle_stmg',
};

function normalizeLevelLabel(label: string): string {
    const lower = label.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents for matching
        .replace(/[^\w\s]/g, '').trim();

    // Exact match first (with accents stripped)
    const stripped = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim();
    if (LEVEL_MAP[stripped]) return LEVEL_MAP[stripped];

    // Original lowercase exact match
    const orig = label.toLowerCase().trim();
    if (LEVEL_MAP[orig]) return LEVEL_MAP[orig];

    // Partial match: find any key contained in the label
    for (const [key, val] of Object.entries(LEVEL_MAP)) {
        if (lower.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ''))) {
            return val;
        }
    }

    return lower;
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
}

const STOP_WORDS = new Set(['pour', 'avec', 'dans', 'sont', 'etre', 'avoir', 'plus', 'moins',
    'cette', 'point', 'nombre', 'deux', 'peut', 'classe',
    'eleves', 'programme', 'mathematiques', 'faire', 'tout', 'comme']);

// Termes maths courts à conserver impérativement même si ≤ 3 chars
const MATH_TERMS = new Set(['sin', 'cos', 'tan', 'log', 'exp', 'inf', 'sup', 'det', 'deg',
    'ln', 'pi', 'abs', 'gcd', 'dim', 'ker', 'mod']);

function tokenize(text: string): string[] {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,;!?()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(w => (w.length > 3 || MATH_TERMS.has(w)) && !STOP_WORDS.has(w));
}

function createChunk(level: string, text: string): Chunk {
    return {
        id: Math.random().toString(36).substring(7),
        level,
        text,
        tokens: tokenize(text)
    };
}

// _LEVEL_MAP replaced by normalizeLevelLabel() above

function lexicalSearch(query: string, level?: string): string {
    initDB();
    if (db.length === 0) return "";

    const safeLevel = typeof level === 'string' ? level.trim() : '';
    const mappedLevel = safeLevel ? normalizeLevelLabel(safeLevel) : '';
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return "";

    const scored = db.map(chunk => {
        let levelScore = 1;
        if (mappedLevel && chunk.level.toLowerCase() === mappedLevel) {
            levelScore = 3;
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

    if (!scored[0] || scored[0].score === 0) return "";

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
