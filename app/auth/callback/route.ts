import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (code) {
        const supabase = await createClient()

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Error exchanging code for session:', error)
            // Redirect to login with error
            return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
        }
    }

    // URL to redirect to after sign in process completes
    // Redirect to the main page (middleware will handle role-based routing)
    return NextResponse.redirect(`${origin}/`)
}
