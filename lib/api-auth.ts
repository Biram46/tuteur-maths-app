/**
 * Helper d'authentification pour les API routes Next.js
 * ──────────────────────────────────────────────────────
 * Fournit des fonctions réutilisables pour vérifier
 * l'authentification et les rôles admin.
 */

import { createClient } from '@/lib/supabaseAction';
import { NextRequest, NextResponse } from 'next/server';

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

// ─── Rate limiting simple (en mémoire, par utilisateur) ───────

interface RateLimitEntry { count: number; resetAt: number; }

declare global {
    // eslint-disable-next-line no-var
    var _rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getRateLimitStore(): Map<string, RateLimitEntry> {
    if (!global._rateLimitStore) {
        global._rateLimitStore = new Map();
    }
    return global._rateLimitStore;
}

/**
 * Rate limiting par utilisateur.
 * @param userId - ID de l'utilisateur (ou IP si non authentifié)
 * @param maxRequests - Max requêtes par fenêtre
 * @param windowMs - Fenêtre en millisecondes
 * @returns { allowed: boolean, remaining: number }
 */
export function checkRateLimit(
    userId: string,
    maxRequests = 30,
    windowMs = 60_000
): { allowed: boolean; remaining: number } {
    const store = getRateLimitStore();
    const now = Date.now();

    // Nettoyer les entrées expirées
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }

    const entry = store.get(userId);
    if (!entry || now > entry.resetAt) {
        store.set(userId, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
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

    const { allowed, remaining } = checkRateLimit(user.id, maxRequests, windowMs);
    if (!allowed) {
        return NextResponse.json(
            { success: false, error: 'Trop de requêtes. Réessayez dans un instant.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
        );
    }

    return { user };
}

/**
 * Vérifie si un utilisateur est admin.
 * Priorité :
 *   1. Rôle dans app_metadata (mis à jour via la table user_roles + trigger)
 *   2. Fallback sur ADMIN_EMAILS dans .env (rétrocompatible)
 */
export function isAdmin(
    user: { email?: string; app_metadata?: Record<string, unknown> } | null
): boolean {
    if (!user) return false;

    // 1. Vérifier le rôle dans les claims JWT (source de vérité)
    const role = user.app_metadata?.role;
    if (role === 'admin') return true;

    // 2. Fallback : vérification par email (rétrocompatible)
    return isAdminEmail(user.email);
}

/**
 * Vérifie si un email correspond à un admin (fallback legacy).
 * Utilise la variable d'environnement ADMIN_EMAILS (séparés par des virgules).
 * Fallback sur biram26@yahoo.fr si la variable n'est pas définie.
 */
export function isAdminEmail(email: string | undefined): boolean {
    if (!email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS || 'biram26@yahoo.fr')
        .split(',')
        .map(e => e.trim().toLowerCase());
    return adminEmails.includes(email.toLowerCase());
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
