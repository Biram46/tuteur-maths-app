import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    const isPublicRoute = isStudentLoginPage || isAdminLoginPage || isForgotPasswordPage || isAuthRoute || isApiRoute

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && !isAdminLoginPage

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
        if (user.email === 'biram26@yahoo.fr') {
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
        if (!user || user.email !== 'biram26@yahoo.fr') {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/login'
            const redirectResponse = NextResponse.redirect(url)
            response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
            return redirectResponse
        }
    }

    return response
}
