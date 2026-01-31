import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Vérifier d'abord si c'est une route publique (avant d'appeler getUser)
    const isStudentLoginPage = request.nextUrl.pathname === '/login'
    const isAdminLoginPage = request.nextUrl.pathname === '/admin/login'
    const isForgotPasswordPage = request.nextUrl.pathname === '/forgot-password'
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
    const isPublicRoute = isStudentLoginPage || isAdminLoginPage || isForgotPasswordPage || isAuthRoute

    // Si c'est une route publique, laisser passer sans vérifier l'authentification
    if (isPublicRoute) {
        return response
    }

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

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && !isAdminLoginPage

    // 1. Rediriger vers /login si non connecté
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. Si connecté et sur une page de login, rediriger selon le rôle
    if (isStudentLoginPage || isAdminLoginPage) {
        const url = request.nextUrl.clone()

        // Si c'est le professeur, rediriger vers /admin
        if (user.email === 'biram26@yahoo.fr') {
            url.pathname = '/admin'
        } else {
            // Sinon, c'est un élève, rediriger vers /
            url.pathname = '/'
        }

        return NextResponse.redirect(url)
    }

    // 3. Protection stricte de la route /admin (uniquement biram26@yahoo.fr)
    if (isAdminRoute) {
        if (user.email !== 'biram26@yahoo.fr') {
            const url = request.nextUrl.clone()
            // Rediriger vers la page de login admin si pas le bon utilisateur
            url.pathname = '/admin/login'
            return NextResponse.redirect(url)
        }
    }

    return response

}
