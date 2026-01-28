# 🔧 Guide Rapide : Corriger l'Erreur de Création de Compte

**Problème** : "Database error saving new user"  
**Solution** : Exécuter un script SQL dans Supabase (2 minutes)

---

## 📋 Étapes à Suivre

### Étape 1 : Ouvrir Supabase Dashboard
1. Allez sur https://supabase.com
2. Connectez-vous avec votre compte
3. Sélectionnez votre projet **Tuteur Maths App**

---

### Étape 2 : Ouvrir SQL Editor
1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur le bouton **"New query"** (en haut à droite)

---

### Étape 3 : Copier le Script SQL

Ouvrez le fichier `supabase_setup_profiles.sql` dans votre projet et copiez TOUT son contenu.

Ou copiez directement ce script :

```sql
-- Script SQL pour créer la table users/profiles dans Supabase
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Créer la table profiles (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activer Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Créer une politique pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 4. Créer une politique pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 5. Créer une fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 7. Créer le trigger pour appeler la fonction lors de la création d'un utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Vérifier que tout fonctionne
SELECT * FROM public.profiles LIMIT 5;
```

---

### Étape 4 : Exécuter le Script
1. Collez le script dans l'éditeur SQL
2. Cliquez sur le bouton **"Run"** (ou appuyez sur `Ctrl+Enter`)
3. Attendez quelques secondes

---

### Étape 5 : Vérifier le Résultat

Vous devriez voir :
```
✅ Success. No rows returned
```

Ou une liste vide (c'est normal, aucun profil n'existe encore).

**Pas d'erreur = Succès !** ✅

---

### Étape 6 : Vérifier la Table

1. Dans le menu de gauche, cliquez sur **"Table Editor"**
2. Cherchez la table **"profiles"** dans la liste
3. Vérifiez qu'elle existe avec les colonnes :
   - `id` (uuid)
   - `email` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

---

### Étape 7 : Tester la Création de Compte

1. Retournez sur votre application : http://localhost:3000
2. Cliquez sur **"Créer un compte"**
3. Remplissez le formulaire :
   - Email : `test@example.com`
   - Mot de passe : `Test123456!`
4. Cliquez sur **"S'inscrire"**

**Résultat attendu** :
```
✅ Compte créé ! Veuillez vérifier votre email pour confirmer votre inscription.
```

---

## 🐛 En Cas de Problème

### Erreur : "relation already exists"
**Cause** : La table ou le trigger existe déjà  
**Solution** : C'est normal ! Le script utilise `IF NOT EXISTS` et `DROP TRIGGER IF EXISTS`

---

### Erreur : "permission denied"
**Cause** : Vous n'avez pas les droits  
**Solution** : Vérifiez que vous êtes bien connecté en tant que propriétaire du projet

---

### Erreur : "syntax error"
**Cause** : Le script n'a pas été copié correctement  
**Solution** : Recopiez le script en entier, y compris les commentaires

---

## ✅ Checklist de Vérification

Après avoir exécuté le script :

- [ ] Aucune erreur dans SQL Editor
- [ ] Table `profiles` visible dans Table Editor
- [ ] Colonnes `id`, `email`, `created_at`, `updated_at` présentes
- [ ] Test de création de compte réussi
- [ ] Pas d'erreur "Database error saving new user"

---

## 🎯 Résultat Final

Une fois le script exécuté :

1. ✅ La table `profiles` est créée
2. ✅ Les politiques de sécurité (RLS) sont activées
3. ✅ Le trigger automatique est créé
4. ✅ Chaque nouvel utilisateur aura automatiquement un profil
5. ✅ La création de compte fonctionne !

---

## 📞 Besoin d'Aide ?

Si le problème persiste après avoir suivi ces étapes :

1. Vérifiez les logs Supabase :
   - Menu de gauche → **Logs**
   - Regardez les erreurs récentes

2. Exécutez cette requête dans SQL Editor :
```sql
-- Vérifier que tout est en place
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'profiles') as table_exists,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') as trigger_exists,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'handle_new_user') as function_exists;
```

**Résultat attendu** :
```
table_exists: 1
trigger_exists: 1
function_exists: 1
```

---

**🚀 Allez-y, exécutez le script maintenant ! Ça prend 2 minutes !**

---

*Guide créé le 28 janvier 2026*
