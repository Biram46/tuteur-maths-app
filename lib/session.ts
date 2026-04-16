import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/api-auth'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: On récupère l'utilisateur
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isStudentLoginPage = request.nextUrl.pathname === '/login'
    const isAdminLoginPage = request.nextUrl.pathname === '/admin/login'
    const isForgotPasswordPage = request.nextUrl.pathname === '/forgot-password'
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')
    const isAssistantRoute = request.nextUrl.pathname === '/assistant'
    const isGraphRoute = request.nextUrl.pathname === '/graph'
    const isTestRoute = request.nextUrl.pathname.startsWith('/test')
    const isResourceRoute = request.nextUrl.pathname === '/resource'
    const isPublicRoute = isStudentLoginPage || isAdminLoginPage || isForgotPasswordPage || isAuthRoute || isApiRoute || isAssistantRoute || isGraphRoute || isTestRoute || isResourceRoute

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && !isAdminLoginPage
    const isProfRoute = request.nextUrl.pathname.startsWith('/prof')

    // 1. Rediriger vers /login si non connecté et tente d'accéder à une route privée
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const redirectResponse = NextResponse.redirect(url)
        // On s'assure de copier les cookies (refresh possible) dans la redirection
        response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
        return redirectResponse
    }

    // 2. Si déjà connecté et sur une page de login public, rediriger vers l'espace approprié
    if (user && (isStudentLoginPage || isAdminLoginPage)) {
        const url = request.nextUrl.clone()
        if (isAdmin(user)) {
            url.pathname = '/admin'
        } else {
            url.pathname = '/'
        }
        const redirectResponse = NextResponse.redirect(url)
        response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
        return redirectResponse
    }

    // 3. Protection de la route /admin
    if (isAdminRoute) {
        if (!user || !isAdmin(user)) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/login'
            const redirectResponse = NextResponse.redirect(url)
            response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
            return redirectResponse
        }
    }

    // 4. Protection de la route /prof (espace professeur)
    // Pour l'instant : seuls les admins y ont accès
    // Futur : vérifier le rôle 'teacher' dans la table eleves
    if (isProfRoute) {
        if (!user || !isAdmin(user)) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            const redirectResponse = NextResponse.redirect(url)
            response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
            return redirectResponse
        }
    }

    // ── Headers de sécurité ──
    const cspHeader = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.supabase.co",
        "font-src 'self' https://cdn.jsdelivr.net",
        "connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.deepseek.com https://generativelanguage.googleapis.com https://firebasestorage.googleapis.com https://*.firebaseio.com https://*.supabase.co https://tuteur-maths-app-api.onrender.com",
        "frame-src https://*.supabase.co https://docs.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join('; ')

    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    if (request.nextUrl.protocol === 'https:') {
        response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }

    return response
}
