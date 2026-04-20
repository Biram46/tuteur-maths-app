/**
 * TABLE INJECT API — Injection directe d'un @@@table depuis Python
 * ================================================================
 * POST /api/table-inject
 *
 * Ton script Python envoie un bloc @@@table déjà calculé.
 * L'API le valide, le stocke en session, et le retourne directement
 * au frontend sans passer par l'IA.
 *
 * Entrée :
 *   {
 *     aaaBlock: string,       // Le bloc @@@...@@@ complet
 *     sessionId?: string,     // Optionnel : ID de session chat
 *     question?: string,      // La question posée (pour le contexte IA)
 *   }
 *
 * Sortie :
 *   {
 *     success: boolean,
 *     aaaBlock: string,       // Bloc validé
 *     parsed: object,         // Données parsées (pour vérification)
 *     error?: string
 *   }
 *
 * Exemple d'appel Python :
 *   import requests
 *   res = requests.post('http://localhost:3000/api/table-inject', json={
 *       'aaaBlock': '@@@\ntable\nx: -inf, 3/2, 5/3, +inf ...',
 *       'question': 'Étudier le signe de (2x-3)(-3x+5)'
 *   })
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Validation du format @@@table ───────────────────────────────────────────

interface ParsedTable {
    xValues: string[];
    rows: {
        label: string;
        type: 'sign' | 'variation';
        content: string[];
    }[];
}

function parseAAATable(aaaBlock: string): { success: boolean; data?: ParsedTable; error?: string } {
    try {
        const inner = aaaBlock.replace(/@@@/g, '').trim();
        const sections = inner.split(/\s*\|\s*/).map(s => s.trim()).filter(s => s.length > 0);

        let xValues: string[] = [];
        const rows: ParsedTable['rows'] = [];
        let tableFound = false;

        for (const sec of sections) {
            const low = sec.toLowerCase();

            if (low === 'table') {
                tableFound = true;
                continue;
            }

            if (low.startsWith('x:')) {
                const valPart = sec.substring(2).trim();
                xValues = valPart.split(',').map(v => v.trim()).filter(v => v.length > 0);
                continue;
            }

            if (low.startsWith('sign:') || low.startsWith('variation:')) {
                const isVar = low.startsWith('variation:');
                const rest = sec.substring(isVar ? 10 : 5).trim();
                const colonIdx = rest.indexOf(':');
                if (colonIdx === -1) continue;

                const label = rest.substring(0, colonIdx).trim();
                const contentStr = rest.substring(colonIdx + 1).trim();
                const content = contentStr.split(',').map(v => v.trim()).filter(v => v.length > 0);

                rows.push({ label, type: isVar ? 'variation' : 'sign', content });
            }
        }

        if (!tableFound) return { success: false, error: 'Bloc @@@ ne contient pas "table"' };
        if (xValues.length === 0) return { success: false, error: 'Pas de ligne x: dans le bloc' };
        if (rows.length === 0) return { success: false, error: 'Pas de lignes sign:/variation:' };

        // Validation format 2N-3 pour les lignes sign
        const N = xValues.length;
        for (const row of rows) {
            if (row.type === 'sign') {
                const expected = 2 * N - 3;
                if (row.content.length !== expected) {
                    return {
                        success: false,
                        error: `Ligne sign "${row.label}" : ${row.content.length} éléments, attendu ${expected} (format 2N-3 avec N=${N})`,
                    };
                }
            }
        }

        return { success: true, data: { xValues, rows } };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const secret = process.env.PYTHON_INJECT_SECRET;
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { aaaBlock, question } = body;

        if (!aaaBlock || typeof aaaBlock !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Champ "aaaBlock" manquant ou invalide' },
                { status: 400 }
            );
        }

        // Valider le bloc
        const parsed = parseAAATable(aaaBlock);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error },
                { status: 422 }
            );
        }

        return NextResponse.json({
            success: true,
            aaaBlock: aaaBlock.trim(),
            parsed: parsed.data,
        });

    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}

// ─── GET : vérification que l'API est disponible ──────────────────────────────

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'POST /api/table-inject',
        description: 'Injection directe de blocs @@@table depuis Python/SymPy',
        format: {
            aaaBlock: '@@@\\ntable\\nx: -inf, x1, x2, +inf |\\nsign: f(x) : -, 0, +, 0, - |\\n@@@',
            note: 'Format 2N-3 pour les lignes sign : [s0, v1, s1, v2, s2, ..., vN-2, sN-2]',
        },
    });
}
