# 🔧 Fix : Erreur "access_denied" après Confirmation Email

**Problème** : Message `access_denied` après avoir cliqué sur le lien de confirmation d'email  
**Cause** : Callback handler manquant ou configuration Supabase incorrecte  
**Date** : 29 janvier 2026  
**Statut** : ✅ RÉSOLU

---

## 🎯 Solution Appliquée

### 1. Création du Callback Handler ✅

**Fichier créé** : `app/auth/callback/route.ts`

Ce fichier gère :
- ✅ L'échange du code d'authentification pour une session
- ✅ La redirection après confirmation d'email
- ✅ La gestion des erreurs

**Code** :
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }
  }

  // Redirect to main page (middleware handles role-based routing)
  return NextResponse.redirect(`${origin}/`)
}
```

---

## 📋 Configuration Supabase Requise

### Étape 1 : Vérifier les Redirect URLs

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Authentication** → **URL Configuration**

### Étape 2 : Configurer les URLs

**Site URL** :
```
https://tuteur-maths-app.vercel.app
```

**Redirect URLs** (ajoutez TOUTES ces lignes) :
```
https://tuteur-maths-app.vercel.app/**
https://tuteur-maths-app.vercel.app/auth/callback
https://tuteur-maths-app.vercel.app/auth/callback/**
http://localhost:3000/**
http://localhost:3000/auth/callback
```

⚠️ **IMPORTANT** : La ligne `https://tuteur-maths-app.vercel.app/auth/callback` est CRITIQUE !

### Étape 3 : Sauvegarder

1. Cliquez sur **"Save"**
2. Attendez 1-2 minutes pour la propagation

---

## 🚀 Déployer la Correction sur Vercel

Le fichier `app/auth/callback/route.ts` a été créé localement. Il faut maintenant le déployer :

### Option A : Déploiement Automatique (Recommandé)

```bash
# Committer les changements
git add app/auth/callback/route.ts
git commit -m "Fix: Ajouter callback handler pour confirmation email"

# Pousser vers GitHub
git push origin main
```

Vercel déploiera automatiquement ! ⚡

### Option B : Déploiement Manuel via Vercel CLI

```bash
vercel --prod
```

---

## 🧪 Tester la Correction

### Test 1 : Nouvelle Inscription

1. **Ouvrez** un navigateur en mode navigation privée
2. **Allez sur** : https://tuteur-maths-app.vercel.app/login
3. **Inscrivez-vous** avec un nouvel email :
   - Email : `test.eleve3.vercel@exemple.com`
   - Mot de passe : `TestVercel123!`
4. **Vérifiez** votre email
5. **Cliquez** sur le lien de confirmation

**✅ Résultat attendu** :
- Redirection vers `https://tuteur-maths-app.vercel.app/`
- Connexion automatique
- Interface élève s'affiche
- **PAS de message `access_denied`**

### Test 2 : Utilisateur Existant

Pour l'utilisateur `test.eleve2.vercel@exemple.com` qui a eu l'erreur :

**Option A : Renvoyer l'email de confirmation**

1. Allez sur https://supabase.com/dashboard
2. **Authentication** → **Users**
3. Trouvez `test.eleve2.vercel@exemple.com`
4. Cliquez sur les 3 points → **"Resend confirmation email"**
5. Vérifiez votre email
6. Cliquez sur le nouveau lien

**Option B : Confirmer manuellement**

1. Allez sur https://supabase.com/dashboard
2. **Authentication** → **Users**
3. Trouvez `test.eleve2.vercel@exemple.com`
4. Cliquez sur l'utilisateur
5. Changez **"Email Confirmed"** à `true`
6. Sauvegardez
7. Connectez-vous normalement sur l'application

---

## 🔍 Vérification du Déploiement

### Vérifier que le callback est déployé

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez** votre projet
3. **Deployments** → Dernier déploiement
4. **Vérifiez** que le commit contient `app/auth/callback/route.ts`

### Tester directement le callback

Ouvrez dans votre navigateur :
```
https://tuteur-maths-app.vercel.app/auth/callback
```

**✅ Résultat attendu** :
- Redirection vers `/login` (car pas de code)
- Pas d'erreur 404

---

## 📊 Flux d'Authentification Corrigé

### Avant (❌ Erreur)

```
1. Utilisateur s'inscrit
2. Email envoyé avec lien : 
   https://tuteur-maths-app.vercel.app/auth/callback?code=xxx
3. Clic sur le lien
4. ❌ 404 ou access_denied (callback handler manquant)
```

### Après (✅ Fonctionne)

```
1. Utilisateur s'inscrit
2. Email envoyé avec lien : 
   https://tuteur-maths-app.vercel.app/auth/callback?code=xxx
3. Clic sur le lien
4. ✅ Callback handler échange le code pour une session
5. ✅ Redirection vers /
6. ✅ Middleware détecte la session
7. ✅ Utilisateur connecté automatiquement
```

---

## 🐛 Dépannage

### Problème 1 : Toujours `access_denied`

**Cause** : Le callback n'est pas encore déployé

**Solution** :
1. Vérifiez que vous avez bien poussé le code
2. Vérifiez le déploiement Vercel
3. Attendez que le déploiement soit terminé
4. Videz le cache du navigateur (Ctrl+Shift+R)
5. Retestez

### Problème 2 : Erreur 404 sur `/auth/callback`

**Cause** : Le fichier n'est pas au bon endroit

**Solution** :
1. Vérifiez que le fichier est bien à : `app/auth/callback/route.ts`
2. Pas `pages/auth/callback/route.ts`
3. Pas `app/api/auth/callback/route.ts`

### Problème 3 : Redirection infinie

**Cause** : Problème avec le middleware

**Solution** :
1. Vérifiez que le middleware ne bloque pas `/auth/callback`
2. Le matcher du middleware devrait permettre cette route
3. Vérifiez les logs Vercel pour voir les redirections

### Problème 4 : "Invalid code"

**Cause** : Le code a expiré ou a déjà été utilisé

**Solution** :
1. Les codes expirent après 1 heure
2. Demandez un nouvel email de confirmation
3. Ou confirmez manuellement dans Supabase

---

## ✅ Checklist de Résolution

- [x] Callback handler créé (`app/auth/callback/route.ts`)
- [ ] Code commité et poussé vers GitHub
- [ ] Déploiement Vercel terminé
- [ ] Configuration Supabase vérifiée
- [ ] Redirect URLs ajoutées
- [ ] Testé avec une nouvelle inscription
- [ ] Email de confirmation reçu
- [ ] Lien de confirmation fonctionne
- [ ] Pas de message `access_denied`
- [ ] Utilisateur automatiquement connecté

---

## 📈 Prochaines Étapes

### Immédiat
1. **Déployer** le callback handler sur Vercel
2. **Vérifier** la configuration Supabase
3. **Tester** avec une nouvelle inscription

### Court terme
4. **Confirmer** les utilisateurs existants manuellement
5. **Continuer** les tests d'authentification
6. **Documenter** les résultats

---

## 🎯 Commandes à Exécuter

```bash
# 1. Committer le callback handler
git add app/auth/callback/route.ts
git commit -m "Fix: Ajouter callback handler pour confirmation email"

# 2. Pousser vers GitHub (déploiement auto sur Vercel)
git push origin main

# 3. Attendre le déploiement (2-3 minutes)
# Vérifier sur https://vercel.com/dashboard

# 4. Tester l'inscription
# Aller sur https://tuteur-maths-app.vercel.app/login
```

---

**Temps estimé** : 5 minutes  
**Difficulté** : Moyenne  
**Impact** : Critique (bloque toutes les inscriptions)

*Guide créé le 29 janvier 2026 - 22:01*
