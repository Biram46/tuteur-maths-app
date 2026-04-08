import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as EmailOtpType | null
    const next = requestUrl.searchParams.get('next') ?? '/'

    const isLocalEnv = process.env.NODE_ENV === 'development'
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

    function getRedirectUrl(path: string) {
        if (isLocalEnv) {
            return `${requestUrl.origin}${path}`
        } else if (forwardedHost) {
            return `${forwardedProto}://${forwardedHost}${path}`
        }
        return `${requestUrl.origin}${path}`
    }

    if (token_hash && type) {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // Ignore errors from Server Components
                        }
                    },
                },
            }
        )

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            console.log(`[Auth Confirm] ✅ Email confirmé avec succès (type: ${type})`)
            return NextResponse.redirect(getRedirectUrl(next))
        } else {
            console.error(`[Auth Confirm] ❌ Erreur vérification OTP:`, error.message)
            return NextResponse.redirect(
                getRedirectUrl(`/login?error=${encodeURIComponent('Le lien de confirmation est expiré ou invalide. Veuillez vous réinscrire.')}`)
            )
        }
    }

    // Pas de token_hash — rediriger vers login avec erreur
    return NextResponse.redirect(
        getRedirectUrl('/login?error=' + encodeURIComponent('Lien de confirmation invalide.'))
    )
}
