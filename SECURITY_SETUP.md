# Configuration de la sécurité - Tuteur Maths App

## Vue d'ensemble

Votre application dispose maintenant d'un système d'authentification complet avec :
- ✅ Inscription pour les élèves
- ✅ Connexion sécurisée
- ✅ Un seul compte administrateur (biram26@yahoo.fr)
- ✅ Protection des routes par rôle
- ✅ Déconnexion

## Étape 1 : Configuration de la base de données Supabase

### 1.1 Accéder à votre projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans le menu de gauche

### 1.2 Exécuter le script SQL

1. Cliquez sur "New Query"
2. Copiez tout le contenu du fichier `DATABASE_SETUP.sql`
3. Collez-le dans l'éditeur SQL
4. Cliquez sur "Run" pour exécuter le script

Ce script va :
- Créer la table `profiles` pour stocker les rôles des utilisateurs
- Configurer les politiques de sécurité (RLS)
- Créer un trigger pour créer automatiquement un profil lors de l'inscription

### 1.3 Vérifier la création

Dans l'onglet "Table Editor", vous devriez voir la table `profiles` avec les colonnes :
- `id` (UUID)
- `email` (TEXT)
- `role` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Étape 2 : Créer le compte administrateur

### Option A : Via l'interface Supabase (Recommandé)

1. Allez dans "Authentication" > "Users"
2. Cliquez sur "Add user" > "Create new user"
3. Entrez :
   - Email : `biram26@yahoo.fr`
   - Password : Choisissez un mot de passe sécurisé (minimum 6 caractères)
   - Cochez "Auto Confirm User" pour éviter la validation par email
4. Cliquez sur "Create user"

### Option B : Via la page de connexion

1. Allez sur votre site : https://tuteur-maths-app.vercel.app/login
2. Si le compte admin n'existe pas encore, créez-le manuellement via Supabase (Option A)

## Étape 3 : Configuration des variables d'environnement

Assurez-vous que ces variables sont configurées dans Vercel :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
```

Pour les trouver :
1. Dans Supabase, allez dans "Settings" > "API"
2. Copiez "Project URL" et "anon public"
3. Ajoutez-les dans Vercel : Settings > Environment Variables

## Étape 4 : Test du système

### 4.1 Tester l'inscription élève

1. Allez sur https://tuteur-maths-app.vercel.app/signup
2. Créez un compte avec un email de test
3. Vous devriez être redirigé vers `/assistant`
4. Vérifiez dans Supabase que :
   - L'utilisateur est créé dans "Authentication" > "Users"
   - Un profil avec `role = 'student'` est créé dans la table `profiles`

### 4.2 Tester la connexion admin

1. Déconnectez-vous (bouton "Se déconnecter")
2. Allez sur https://tuteur-maths-app.vercel.app/login
3. Connectez-vous avec `biram26@yahoo.fr` et votre mot de passe
4. Vous devriez être redirigé vers `/admin`

### 4.3 Tester la protection des routes

Essayez d'accéder manuellement à ces URLs :
- En tant qu'élève : `/admin` → Vous serez redirigé vers `/assistant`
- En tant qu'admin : `/assistant` → Vous serez redirigé vers `/admin`
- Sans connexion : `/admin` ou `/assistant` → Vous serez redirigé vers `/login`

## Étape 5 : Intégrer le bouton de déconnexion

### Dans la page Admin

Ajoutez ce code dans `app/admin/page.tsx` :

```tsx
import LogoutButton from '@/app/components/LogoutButton'

export default function AdminPage() {
  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <h1>Interface Administrateur</h1>
        <LogoutButton />
      </header>
      {/* Reste de votre contenu */}
    </div>
  )
}
```

### Dans la page Assistant (Élève)

Ajoutez ce code dans `app/assistant/page.tsx` :

```tsx
import LogoutButton from '@/app/components/LogoutButton'

export default function AssistantPage() {
  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <h1>Assistant Mathématiques</h1>
        <LogoutButton />
      </header>
      {/* Reste de votre contenu */}
    </div>
  )
}
```

## Fonctionnalités de sécurité

### Protection implémentée

1. **Email admin réservé** : Impossible de s'inscrire avec `biram26@yahoo.fr`
2. **Redirection automatique** : Les utilisateurs connectés sont redirigés selon leur rôle
3. **Routes protégées** : `/admin` uniquement pour l'admin, `/assistant` pour les élèves
4. **Validation des mots de passe** : Minimum 6 caractères
5. **Row Level Security** : Les élèves ne peuvent voir que leur profil

### Flux d'authentification

```
Utilisateur non connecté
  │
  ├── Visite / → Affiche page d'accueil avec boutons
  ├── Visite /login → Affiche formulaire de connexion
  ├── Visite /signup → Affiche formulaire d'inscription
  └── Visite /admin ou /assistant → Redirigé vers /login

Après connexion :
  │
  ├── Admin (biram26@yahoo.fr) → Redirigé vers /admin
  └── Élève → Redirigé vers /assistant
```

## Dépannage

### Problème : "Email already registered"

**Solution** : Cet email existe déjà. Utilisez la page de connexion ou réinitialisez le mot de passe.

### Problème : "Invalid login credentials"

**Solution** : Vérifiez l'email et le mot de passe. Si vous avez oublié le mot de passe, vous pouvez le réinitialiser via Supabase.

### Problème : Redirection infinie

**Solution** : 
1. Vérifiez que la table `profiles` existe
2. Vérifiez que le trigger `on_auth_user_created` est actif
3. Vérifiez les variables d'environnement dans Vercel

### Problème : RLS Policy Error

**Solution** : Exécutez à nouveau le script `DATABASE_SETUP.sql` pour récréer les politiques.

## Sécurité supplémentaire (Optionnel)

### 1. Activer la vérification par email

Dans Supabase :
1. Allez dans "Authentication" > "Settings"
2. Désactivez "Confirm email" pour le développement
3. Activez-le en production pour plus de sécurité

### 2. Ajouter une réinitialisation de mot de passe

Créez une page `/reset-password` pour permettre aux utilisateurs de réinitialiser leur mot de passe.

### 3. Ajouter l'authentification à deux facteurs (2FA)

Supabase supporte le 2FA. Vous pouvez l'activer dans les paramètres d'authentification.

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Vercel : Settings > Logs
2. Vérifiez les logs dans Supabase : Logs > API Logs
3. Vérifiez que tous les fichiers ont été correctement déployés sur GitHub

---

**Votre application est maintenant sécurisée ! 🔒**
