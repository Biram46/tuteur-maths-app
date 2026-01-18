'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabaseAction'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?error=L\'email ou le mot de passe est incorrect')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    // URL de redirection après confirmation email (si activé)
    // Pour l'instant on suppose auto-confirm ou pas de confirm requise en dev
    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?error=' + error.message)
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/', 'layout')
    redirect('/login')
}
