'use server'

import { createServerClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'

export async function resetPassword(formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        redirect('/forgot-password?error=Email requis')
    }

    const supabase = createServerClient()

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
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

    const supabase = createServerClient()

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        console.error('Error updating password:', error)
        redirect('/auth/reset-password?error=Erreur lors de la mise à jour du mot de passe')
    }

    redirect('/login?message=Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.')
}
