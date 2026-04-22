/**
 * Helper d'authentification pour les API routes Next.js
 * ──────────────────────────────────────────────────────
 * Fournit des fonctions réutilisables pour vérifier
 * l'authentification et les rôles admin.
 */

import { createClient } from '@/lib/supabaseAction';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Récupère l'utilisateur authentifié depuis les cookies.
 * Retourne null si non authentifié.
 */
export async function getAuthUser() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return user;
    } catch {
        return null;
    }
}

// ─── Rate limiting distribué via Supabase RPC ───────────────

/**
 * Rate limiting par utilisateur — persistant et partagé entre toutes les instances Vercel.
 * Utilise la fonction RPC `check_api_rate_limit` en base Supabase.
 * Fallback permissif si la DB est indisponible (ne bloque jamais par erreur).
 */
export async function checkRateLimit(
    identifier: string,
    maxRequests = 30,
    windowMs = 60_000
): Promise<{ allowed: boolean; remaining: number }> {
    try {
        const { data, error } = await supabaseServer
            .rpc('check_api_rate_limit', {
                p_identifier: identifier,
                p_max_requests: maxRequests,
                p_window_ms: windowMs,
            });
        if (error || !data?.[0]) return { allowed: true, remaining: maxRequests };
        return { allowed: data[0].allowed, remaining: data[0].remaining };
    } catch {
        return { allowed: true, remaining: maxRequests };
    }
}

/**
 * Helper combiné : auth + rate limit pour les routes API.
 * Retourne une réponse d'erreur si non autorisé, ou l'utilisateur si OK.
 */
export async function authWithRateLimit(
    request: NextRequest,
    maxRequests = 30,
    windowMs = 60_000
): Promise<{ user: any } | NextResponse> {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 });
    }

    // Les admins ne sont jamais limités
    if (!isAdmin(user)) {
        const { allowed } = await checkRateLimit(user.id, maxRequests, windowMs);
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: 'Trop de requêtes. Réessayez dans un instant.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
            );
        }
    }

    return { user };
}

export function isAdmin(
    user: { email?: string; app_metadata?: Record<string, unknown> } | null
): boolean {
    if (!user) return false;
    return user.app_metadata?.role === 'admin';
}

/**
 * Sanitise le contexte RAG pour prévenir l'injection de prompt.
 * - Supprime les tentatives d'injection connues
 * - Encapsule le contexte dans une section clairement délimitée
 */
export function sanitizeRagContext(context: string): string {
    if (!context || context.trim().length === 0) return '';

    // Supprimer les patterns d'injection de prompt courants
    const injectionPatterns = [
        /ignore\s+(all\s+)?previous\s+instructions?/gi,
        /forget\s+(all\s+)?previous\s+instructions?/gi,
        /you\s+are\s+now\s+/gi,
        /new\s+instructions?\s*:/gi,
        /system\s*:\s*/gi,
        /assistant\s*:\s*/gi,
        /\[SYSTEM\]/gi,
        /<\/?system>/gi,
        /override\s+(your|the)\s+(role|instructions?|constraints?)/gi,
        /pretend\s+(you\s+are|to\s+be)/gi,
        /act\s+as\s+(if\s+you\s+(are|were)|a|an)/gi,
        /jailbreak/gi,
        /DAN\s+mode/gi,
    ];

    let sanitized = context;
    for (const pattern of injectionPatterns) {
        sanitized = sanitized.replace(pattern, '[CONTENU FILTRÉ]');
    }

    // Limiter la taille pour éviter les contextes abusivement longs
    const MAX_RAG_LENGTH = 15000;
    if (sanitized.length > MAX_RAG_LENGTH) {
        sanitized = sanitized.substring(0, MAX_RAG_LENGTH) + '\n[...contenu tronqué pour raisons de sécurité...]';
    }

    return sanitized;
}

/**
 * Valide une URL pour prévenir les attaques SSRF.
 * Bloque les URLs internes, les schémas dangereux, etc.
 */
export function isUrlSafe(url: string): { safe: boolean; reason?: string } {
    try {
        const parsed = new URL(url);

        // Seuls HTTP et HTTPS sont autorisés
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { safe: false, reason: 'Seuls les protocoles HTTP(S) sont autorisés' };
        }

        // Bloquer les adresses internes
        const hostname = parsed.hostname.toLowerCase();
        const blockedHosts = [
            'localhost', '127.0.0.1', '0.0.0.0',
            '::1', '169.254.169.254', // AWS metadata
            'metadata.google.internal', // GCP metadata
        ];
        if (blockedHosts.includes(hostname)) {
            return { safe: false, reason: 'Les URLs internes ne sont pas autorisées' };
        }

        // Bloquer les IP privées (10.x, 172.16-31.x, 192.168.x)
        const privateIpRegex = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
        if (privateIpRegex.test(hostname)) {
            return { safe: false, reason: 'Les adresses privées ne sont pas autorisées' };
        }

        // Bloquer les ports non standard
        const port = parsed.port;
        if (port && !['80', '443', ''].includes(port)) {
            return { safe: false, reason: 'Seuls les ports 80 et 443 sont autorisés' };
        }

        return { safe: true };
    } catch {
        return { safe: false, reason: 'URL invalide' };
    }
}
