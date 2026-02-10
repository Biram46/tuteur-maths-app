'use server'

import { supabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'

export async function resetPassword(formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        redirect('/forgot-password?error=Email requis')
    }

    const supabase = supabaseServer

    // Détection dynamique du domaine via les headers pour la redirection
    const { headers } = await import('next/headers')
    const headerList = await headers()
    const host = headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') || 'https'

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_ENV === 'production'
            ? `${proto}://${host}`
            : 'http://localhost:3000')

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
        console.error('Error sending reset email:', error)
        redirect('/forgot-password?error=Erreur lors de l\'envoi de l\'email')
    }

    redirect('/forgot-password?message=Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.')
}

export async function updatePassword(formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        redirect('/auth/reset-password?error=Tous les champs sont requis')
    }

    if (password !== confirmPassword) {
        redirect('/auth/reset-password?error=Les mots de passe ne correspondent pas')
    }

    if (password.length < 6) {
        redirect('/auth/reset-password?error=Le mot de passe doit contenir au moins 6 caractères')
    }

    // Utiliser createServerClient pour avoir accès à la session de l'utilisateur
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')

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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                },
            },
        }
    )

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        console.error('Error updating password:', error)
        redirect('/auth/reset-password?error=Erreur lors de la mise à jour du mot de passe')
    }

    redirect('/login?message=Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.')
}
