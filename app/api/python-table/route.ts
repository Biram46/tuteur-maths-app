/**
 * PYTHON TABLE API — Injection depuis le script Python
 * ====================================================
 * POST /api/python-table
 *   → Python envoie aaaBlock + question
 *   → Stocke en mémoire avec un token
 *   → Le frontend le récupère via polling GET /api/python-table
 *
 * GET /api/python-table?token=xxx
 *   → Retourne et EFFACE le bloc (usage unique)
 *
 * GET /api/python-table/pending
 *   → Vérifie s'il y a un bloc en attente (pour le polling frontend)
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Store en mémoire simple ─────────────────────────────────
// (TTL 10 minutes, auto-nettoyage)

interface PendingTable {
    aaaBlock: string;
    question: string;
    createdAt: number;
    token: string;
}

declare global {
    // eslint-disable-next-line no-var
    var _pythonTableStore: Map<string, PendingTable> | undefined;
    // eslint-disable-next-line no-var
    var _pythonTableStoreLock: boolean | undefined;
}

function getStore(): Map<string, PendingTable> {
    if (!global._pythonTableStore) {
        global._pythonTableStore = new Map();
    }
    // Nettoyer les entrées > 10 minutes (sans mutation concurrente)
    const now = Date.now();
    const toDelete: string[] = [];
    for (const [key, val] of global._pythonTableStore) {
        if (now - val.createdAt > 10 * 60 * 1000) {
            toDelete.push(key);
        }
    }
    for (const key of toDelete) {
        global._pythonTableStore.delete(key);
    }
    return global._pythonTableStore;
}

// ─── Validation du bloc @@@table ─────────────────────────────

function validateAAABlock(aaaBlock: string): { ok: boolean; error?: string } {
    if (!aaaBlock.includes('@@@')) return { ok: false, error: 'Bloc doit contenir @@@' };
    if (!aaaBlock.toLowerCase().includes('table')) return { ok: false, error: 'Bloc doit contenir "table"' };
    if (!aaaBlock.toLowerCase().includes('x:')) return { ok: false, error: 'Bloc doit contenir "x:"' };
    if (!aaaBlock.toLowerCase().includes('sign:')) return { ok: false, error: 'Bloc doit contenir au moins une ligne "sign:"' };
    return { ok: true };
}

// ─── POST : Python envoie le bloc ───────────────────────────

export async function POST(req: NextRequest) {
    const secret = process.env.PYTHON_INJECT_SECRET;
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { aaaBlock, question = 'Tableau de signes' } = body;

        if (!aaaBlock || typeof aaaBlock !== 'string') {
            return NextResponse.json(
                { success: false, error: '"aaaBlock" manquant' },
                { status: 400 }
            );
        }

        const validation = validateAAABlock(aaaBlock);
        if (!validation.ok) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 422 }
            );
        }

        const token = Math.random().toString(36).substring(2, 10);
        const store = getStore();
        store.set(token, {
            aaaBlock: aaaBlock.trim(),
            question: question.trim(),
            createdAt: Date.now(),
            token,
        });

        return NextResponse.json({
            success: true,
            token,
            message: 'Bloc @@@table reçu. Le chat va l\'afficher dans quelques secondes.',
            pending_url: `/api/python-table?token=${token}`,
        });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// ─── GET : Frontend poll ou récupère par token ───────────────

export async function GET(req: NextRequest) {
    const store = getStore();
    const token = req.nextUrl.searchParams.get('token');

    // Avec token : récupérer et effacer (usage unique)
    if (token) {
        const entry = store.get(token);
        if (!entry) {
            return NextResponse.json({ found: false }, { status: 404 });
        }
        store.delete(token);
        return NextResponse.json({
            found: true,
            aaaBlock: entry.aaaBlock,
            question: entry.question,
            token: entry.token,
        });
    }

    // Sans token : retourner LE PLUS RECENT bloc en attente (pour polling)
    let latest: PendingTable | null = null;
    for (const entry of store.values()) {
        if (!latest || entry.createdAt > latest.createdAt) {
            latest = entry;
        }
    }

    if (!latest) {
        return NextResponse.json({ pending: false });
    }

    // Retourner et effacer
    store.delete(latest.token);
    return NextResponse.json({
        pending: true,
        aaaBlock: latest.aaaBlock,
        question: latest.question,
        token: latest.token,
    });
}
