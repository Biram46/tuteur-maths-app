'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabaseAction'
import { isAdmin } from '@/lib/api-auth'
import { headers } from 'next/headers'
import { logAdminAction } from '@/lib/audit-logger'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('Login Error:', error)
        redirect('/login?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const isLocal = process.env.NODE_ENV === 'development'

    // Détection dynamique du domaine via les headers
    const headerList = await headers()
    const host = headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') || 'https'

    const origin = isLocal
        ? 'http://localhost:3000'
        : `${proto}://${host}`

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // /auth/confirm utilise verifyOtp (token_hash) — fonctionne même si l'élève
            // ouvre le lien de confirmation sur un autre appareil/navigateur
            emailRedirectTo: `${origin}/auth/confirm`,
        }
    })

    if (error) {
        console.error('Signup Error:', error)
        redirect('/login?error=' + encodeURIComponent(error.message))
    }

    // Ne pas rediriger vers / car l'utilisateur doit confirmer son email
    redirect('/login?message=' + encodeURIComponent('🎉 Compte créé ! Vérifiez votre boîte email pour confirmer votre inscription.'))
}

export async function adminLogin(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        logAdminAction({ userEmail: email, action: 'admin_login', success: false, metadata: { reason: 'bad_credentials' } }).catch(() => {});
        redirect('/admin/login?error=' + encodeURIComponent('Email ou mot de passe incorrect'))
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdmin(user)) {
        logAdminAction({ userEmail: email, action: 'admin_login', success: false, metadata: { reason: 'not_admin' } }).catch(() => {});
        await supabase.auth.signOut()
        redirect('/admin/login?error=' + encodeURIComponent('Accès refusé. Seul le professeur peut se connecter ici.'))
    }

    logAdminAction({ userId: user!.id, userEmail: email, action: 'admin_login', success: true }).catch(() => {});
    revalidatePath('/', 'layout')
    redirect('/admin')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function deleteAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Supprimer les données personnelles liées à cet email
    const adminClient = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from('qcm_results').delete().eq('student_email', user.email!)
    await adminClient.from('quiz_results').delete().eq('student_email', user.email!)

    // Supprimer le compte auth
    await adminClient.auth.admin.deleteUser(user.id)

    revalidatePath('/', 'layout')
    redirect('/login?message=' + encodeURIComponent('Votre compte a été supprimé.'))
}
