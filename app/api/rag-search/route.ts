import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authWithRateLimit } from '@/lib/api-auth';

/**
 * API Route: POST /api/rag-search
 * 
 * Performs vector similarity search on programme officiel documents.
 * 1. Generates an embedding for the query using OpenAI
 * 2. Calls match_documents() in Supabase to find similar chunks
 * 
 * Body: { query: string, level?: string, match_count?: number }
 * Returns: { results: [{ content, metadata, similarity }] }
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: 'text-embedding-ada-002', input: text }),
            signal: controller.signal,
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error.message);
        return result.data[0].embedding;
    } finally {
        clearTimeout(timeout);
    }
}

export async function POST(req: NextRequest) {
    const auth = await authWithRateLimit(req, 30, 60_000);
    if (auth instanceof NextResponse) return auth;

    try {
        const { query, level, match_count = 5 } = await req.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        // 1. Generate embedding for the query (1536 dimensions)
        const queryEmbedding = await getEmbedding(query);

        // 2. Build filter based on level
        const filter: Record<string, string> = {};
        if (level) {
            // Map common level names to our metadata values
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
            const mappedLevel = levelMap[level.toLowerCase()] || level.toLowerCase();
            filter.niveau = mappedLevel;
        }

        // 3. Call match_documents() in Supabase
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            filter: Object.keys(filter).length > 0 ? filter : {},
            match_count: match_count,
        });

        if (error) {
            console.error('[RAG API] Supabase RPC error:', error);
            return NextResponse.json({ error: 'Database search failed', details: error.message }, { status: 500 });
        }

        return NextResponse.json({
            results: data || [],
            query_length: query.length,
            filter_used: filter,
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[RAG API] Error:', errorMessage);
        return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
    }
}
