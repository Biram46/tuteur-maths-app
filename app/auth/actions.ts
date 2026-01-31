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
        redirect('/login?error=' + encodeURIComponent('L\'email ou le mot de passe est incorrect'))
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tuteur-maths-app.vercel.app'}/auth/callback`,
        }
    })

    if (error) {
        redirect('/login?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/login?message=Compte créé ! Veuillez vérifier votre email pour confirmer votre inscription.')
}

export async function adminLogin(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Vérifier que l'email est celui du professeur
    if (email !== 'biram26@yahoo.fr') {
        redirect('/admin/login?error=' + encodeURIComponent('Accès refusé. Seul le professeur peut se connecter ici.'))
    }

    const data = {
        email,
        password,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/admin/login?error=' + encodeURIComponent('Email ou mot de passe incorrect'))
    }

    revalidatePath('/', 'layout')
    redirect('/admin')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/', 'layout')
    redirect('/login')
}
