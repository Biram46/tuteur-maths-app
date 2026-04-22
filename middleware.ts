import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware Next.js — protection des routes et fichiers statiques sensibles.
 *
 * Périmètre :
 *  - /eam/*           → fichiers EAM (sujets + corrigés) — élève connecté requis
 *  - /admin/*         → tableau de bord admin — rôle admin requis
 *  - /prof/*          → espace professeur — connecté requis
 *  - /mon-compte/*    → compte élève — connecté requis
 *  - /assistant/*     → mimimaths@i — connecté requis
 *  - /sujets/*        → page annales — connecté requis
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value, options }) => {
                    response.cookies.set(name, value, options);
                });
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // ── Routes admin : rôle admin obligatoire ───────────────────────────────
    if (pathname.startsWith('/admin')) {
        if (!user || user.app_metadata?.role !== 'admin') {
            return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(pathname), request.url));
        }
        return response;
    }

    // ── Routes nécessitant une connexion simple ──────────────────────────────
    const protectedPaths = ['/eam/', '/prof/', '/mon-compte/', '/assistant/', '/sujets'];
    const needsAuth = protectedPaths.some(p => pathname.startsWith(p));

    if (needsAuth && !user) {
        return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(pathname), request.url));
    }

    return response;
}

export const config = {
    matcher: [
        '/eam/:path*',
        '/admin/:path*',
        '/prof/:path*',
        '/mon-compte/:path*',
        '/assistant/:path*',
        '/sujets/:path*',
    ],
};
