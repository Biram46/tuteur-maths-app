/**
 * MATH ROUTER API — Pré-calcul déterministe des tableaux
 * =======================================================
 * POST /api/math-router
 *
 * Prend le message utilisateur, détecte les intentions mathématiques
 * et retourne les blocs @@@ pré-calculés par les moteurs déterministes.
 *
 * Entrée : { message: string, niveau: string }
 * Sortie : { aaaBlocks: string[], contextForAI: string, hasResults: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeQuestion } from '@/lib/math-router/router';

export async function POST(req: NextRequest) {
    try {
        const { message, niveau = 'Seconde' } = await req.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ hasResults: false, aaaBlocks: [], contextForAI: '' });
        }

        const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
        const routerOutput = await routeQuestion(message, niveau, baseUrl);

        // Extraire les blocs @@@ des résultats
        const aaaBlocks = routerOutput.results
            .filter(r => r.mathBlock)
            .map(r => r.mathBlock as string);

        return NextResponse.json({
            hasResults: routerOutput.hasResults,
            aaaBlocks,
            prerenderedBlocks: routerOutput.prerenderedBlocks,
            contextForAI: routerOutput.contextForAI,
            discriminantSteps: routerOutput.results
                .flatMap(r => r.discriminantSteps ?? []),
        });
    } catch (err: any) {
        console.error('[MathRouter] Erreur:', err);
        return NextResponse.json({ hasResults: false, aaaBlocks: [], contextForAI: '' });
    }
}
