import { supabaseServer } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next')
    const origin = requestUrl.origin

    if (code) {
        const supabase = supabaseServer

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Error exchanging code for session:', error)
            // Redirect to login with error
            return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
        }
    }

    // Si un paramètre 'next' est présent, rediriger vers cette URL
    // Cela permet de gérer la réinitialisation de mot de passe
    if (next) {
        return NextResponse.redirect(`${origin}${next}`)
    }

    // URL to redirect to after sign in process completes
    // Redirect to the main page (middleware will handle role-based routing)
    return NextResponse.redirect(`${origin}/`)
}
