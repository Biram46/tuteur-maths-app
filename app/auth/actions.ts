'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseAction'

const ADMIN_EMAIL = 'biram26@yahoo.fr'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Email ou mot de passe incorrect')
  }

  // Récupérer ou créer le profil utilisateur
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    // Si le profil n'existe pas, le créer
    if (!profile) {
      const role = authData.user.email === ADMIN_EMAIL ? 'admin' : 'student'
      await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: authData.user.email,
          role: role
        }])
    }
  }

  revalidatePath('/', 'layout')
  
  // Redirection selon le rôle
  if (authData.user?.email === ADMIN_EMAIL) {
    redirect('/admin')
  } else {
    redirect('/assistant')
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Bloquer l'inscription si c'est l'email admin
  if (email === ADMIN_EMAIL) {
    redirect('/signup?error=Cet email est réservé')
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  // Créer le profil utilisateur avec le rôle student
  if (authData.user) {
    await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: authData.user.email,
        role: 'student'
      }])
  }

  revalidatePath('/', 'layout')
  redirect('/assistant')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}

// Fonction utilitaire pour récupérer l'utilisateur actuel avec son rôle
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    role: profile?.role || 'student'
  }
}
