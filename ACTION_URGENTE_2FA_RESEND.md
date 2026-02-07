# ⚠️ ACTION URGENTE : Configurer RESEND_API_KEY dans Vercel

**Problème Identifié** : Vous ne recevez pas le code 2FA par email en production car la clé API Resend n'a pas été configurée dans le tableau de bord Vercel.

---

## ✅ Solution : Ajouter la Variable d'Environnement

### Étape 1 : Récupérer votre clé API
Ouvrez votre fichier `.env.local` et copiez la valeur de :
`RESEND_API_KEY=re_CY5ZFU8a_L7t38pA4CrTHkNzHbAWLchZn`

### Étape 2 : Aller sur Vercel Dashboard
1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet **tuteur-maths-app**
3. Allez dans **Settings** → **Environment Variables**

### Étape 3 : Ajouter la Variable
Cliquez sur **"Add New"** et remplissez comme suit :

- **Variable Name** : `RESEND_API_KEY`
- **Value** : `re_CY5ZFU8a_L7t38pA4CrTHkNzHbAWLchZn`
- **Environments** : Cochez **Production**, **Preview**, et **Development**

Cliquez sur **"Save"**.

---

## 🔄 Redéploiement (Indispensable)

Les variables d'environnement ne sont prises en compte qu'après un nouveau déploiement.

1. Allez dans l'onglet **Deployments** sur Vercel.
2. Cliquez sur les trois petits points **"..."** à côté de votre dernier déploiement.
3. Cliquez sur **"Redeploy"**.
4. Attendez que le statut passe à **"Ready"**.

---

## 📧 Note sur Resend (Mode Test)

Si vous utilisez un compte Resend gratuit sans domaine configuré :
1. Vous ne pouvez envoyer des emails qu'à l'adresse qui a servi à créer le compte.
2. Si vous essayez de vous connecter avec `biram26@yahoo.fr` en admin, assurez-vous que c'est bien cet email qui est lié à votre compte Resend.
3. Si ce n'est pas le cas, vous devrez vérifier votre domaine dans Resend ou utiliser le même email pour les deux.

---

## 🎯 Résumé des variables à vérifier dans Vercel

Assurez-vous d'avoir TOUTES ces variables dans Vercel :
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
5. `PERPLEXITY_API_KEY`
6. `ADMIN_EMAIL`
7. `RESEND_API_KEY` 👈 **Celle qui manque probablement**
8. `NEXT_PUBLIC_SITE_URL` (Optionnel mais recommandé pour les redirections)

---

**PRIORITÉ** : 🔴 CRITIQUE  
**TEMPS ESTIMÉ** : 3 minutes
