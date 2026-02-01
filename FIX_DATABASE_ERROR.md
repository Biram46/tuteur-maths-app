# 🔧 Correction : Erreur "Database error saving new user"

## 🐛 Problème

Erreur lors de la création d'un compte étudiant :
```
Database error saving new user
```

## 🔍 Cause

Cette erreur se produit car :
1. Supabase Auth crée bien l'utilisateur dans `auth.users`
2. Mais un trigger essaie de créer un profil dans une table `profiles` qui n'existe pas ou a un problème
3. Le trigger échoue, ce qui génère l'erreur

## ✅ Solution

### Option 1 : Créer la table profiles (RECOMMANDÉ)

#### Étape 1 : Aller sur Supabase SQL Editor

1. **Allez sur** : https://supabase.com
2. **Connectez-vous** et sélectionnez votre projet
3. **Dans le menu de gauche**, cliquez sur **"SQL Editor"**
4. **Cliquez sur** "New query"

#### Étape 2 : Exécuter le script SQL

1. **Copiez** tout le contenu du fichier `supabase_setup_profiles.sql`
2. **Collez** dans l'éditeur SQL
3. **Cliquez sur** "Run" ou appuyez sur Ctrl+Enter
4. **Vérifiez** qu'il n'y a pas d'erreur

Le script va :
- ✅ Créer la table `profiles`
- ✅ Activer la sécurité (RLS)
- ✅ Créer les politiques d'accès
- ✅ Créer un trigger automatique pour créer un profil à chaque inscription

#### Étape 3 : Vérifier

1. **Allez dans** "Table Editor" (menu de gauche)
2. **Vérifiez** que la table `profiles` existe
3. **Retestez** la création de compte

---

### Option 2 : Désactiver le trigger existant (TEMPORAIRE)

Si vous voulez juste tester rapidement sans créer la table :

#### Étape 1 : Trouver le trigger

1. **Allez sur** Supabase → SQL Editor
2. **Exécutez** cette requête :
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';
```

#### Étape 2 : Désactiver le trigger

Si vous voyez un trigger, désactivez-le temporairement :
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

⚠️ **Attention** : Cette solution est temporaire. Les utilisateurs n'auront pas de profil.

---

### Option 3 : Simplifier le code de signup

Si vous ne voulez pas de table profiles, modifiez le code :

#### Modifier `app/auth/actions.ts`

Remplacez la fonction `signup` par :

```typescript
export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tuteur-maths-app.vercel.app'}/auth/callback`,
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        console.error('Signup error:', error)
        redirect('/login?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/login?message=Compte créé ! Veuillez vérifier votre email pour confirmer votre inscription.')
}
```

---

## 🎯 Solution Recommandée

**Je recommande l'Option 1** : Créer la table profiles

**Pourquoi ?**
- ✅ Vous pourrez stocker des informations supplémentaires sur les utilisateurs
- ✅ C'est la bonne pratique Supabase
- ✅ Vous en aurez besoin pour les fonctionnalités futures (progression, badges, etc.)

---

## 📋 Étapes à Suivre MAINTENANT

### 1. Exécuter le script SQL

1. ✅ Allez sur https://supabase.com
2. ✅ SQL Editor → New query
3. ✅ Copiez le contenu de `supabase_setup_profiles.sql`
4. ✅ Exécutez (Run)
5. ✅ Vérifiez qu'il n'y a pas d'erreur

### 2. Vérifier la table

1. ✅ Table Editor → Vérifiez que `profiles` existe
2. ✅ Vérifiez les colonnes : `id`, `email`, `created_at`, `updated_at`

### 3. Retester

1. ✅ Retournez sur https://tuteur-maths-app.vercel.app/
2. ✅ Essayez de créer un compte étudiant
3. ✅ Vérifiez que ça fonctionne

---                                                              

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier les logs Supabase

1. **Allez sur** Supabase → Logs
2. **Regardez** les erreurs récentes
3. **Notez** le message d'erreur exact

### Vérifier les triggers

```sql
-- Voir tous les triggers sur auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';
```

### Vérifier les fonctions

```sql
-- Voir toutes les fonctions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';
```

---

## 📞 Besoin d'aide ?

Si le problème persiste :

1. **Exécutez** ces requêtes dans SQL Editor :
```sql
-- Vérifier la table profiles
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Vérifier les triggers
SELECT * FROM information_schema.triggers WHERE event_object_table = 'users';

-- Vérifier les dernières erreurs
SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 5;
```

2. **Partagez** les résultats avec moi
3. **Je vous aiderai** à corriger

---

## ✅ Checklist de Correction

- [ ] Script SQL exécuté sans erreur
- [ ] Table `profiles` créée
- [ ] Trigger `on_auth_user_created` créé
- [ ] Fonction `handle_new_user()` créée
- [ ] Politiques RLS activées
- [ ] Test de création de compte réussi

---

**🚀 Exécutez le script SQL maintenant et dites-moi si ça fonctionne !**
