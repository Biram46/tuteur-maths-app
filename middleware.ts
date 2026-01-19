import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAIL = 'biram26@yahoo.fr'

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
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

  const { pathname } = request.nextUrl

  // Routes publiques
  const publicRoutes = ['/login', '/signup', '/']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une route protégée
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Si l'utilisateur est connecté
  if (user) {
    // Récupérer le rôle de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || (user.email === ADMIN_EMAIL ? 'admin' : 'student')

    // Redirection selon le rôle si l'utilisateur est sur la page d'accueil
    if (pathname === '/') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = role === 'admin' ? '/admin' : '/assistant'
      return NextResponse.redirect(redirectUrl)
    }

    // Protection de la route /admin
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/assistant'
      return NextResponse.redirect(redirectUrl)
    }

    // Protection de la route /assistant (seulement pour les étudiants)
    if (pathname.startsWith('/assistant') && role === 'admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin'
      return NextResponse.redirect(redirectUrl)
    }

    // Rediriger les utilisateurs connectés qui tentent d'accéder aux pages de connexion/inscription
    if (pathname === '/login' || pathname === '/signup') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = role === 'admin' ? '/admin' : '/assistant'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
