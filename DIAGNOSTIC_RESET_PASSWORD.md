# 🔍 Diagnostic : Réinitialisation Mot de Passe

**Date** : 30 janvier 2026 - 22:28  
**Problème** : Redirection vers `/login` au lieu de `/auth/reset-password`

---

## 📋 Informations Nécessaires

Pour diagnostiquer le problème, j'ai besoin de ces informations :

### 1️⃣ URL dans l'Email

Quand vous recevez l'email de réinitialisation, **copiez l'URL complète du lien** et envoyez-la moi.

**Format attendu** :
```
https://tuteur-maths-app.vercel.app/auth/reset-password#access_token=XXXX&expires_in=3600&refresh_token=YYYY&token_type=bearer&type=recovery
```

**Votre URL** : `_____________________________`

### 2️⃣ Comportement Observé

Quand vous cliquez sur le lien :

- [ ] Je vois un loader "Vérification..."
- [ ] Je suis redirigé immédiatement vers `/login`
- [ ] Je vois une page blanche
- [ ] Je vois une erreur
- [ ] Autre : `_____________________________`

### 3️⃣ Configuration Supabase

Dans Supabase Dashboard → Authentication → URL Configuration :

**Site URL** : `_____________________________`

**Redirect URLs** (listez toutes) :
```
1. _____________________________
2. _____________________________
3. _____________________________
...
```

---

## 🧪 Tests à Effectuer

### Test 1 : Vérifier le Middleware

Testez cette URL directement dans votre navigateur :
```
https://tuteur-maths-app.vercel.app/auth/reset-password
```

**Résultat attendu** : Vous devriez voir la page de réinitialisation (même sans token, elle devrait s'afficher puis rediriger après 3 secondes)

**Votre résultat** : `_____________________________`

### Test 2 : Vérifier forgot-password

Testez cette URL :
```
https://tuteur-maths-app.vercel.app/forgot-password
```

**Résultat attendu** : Page de demande de réinitialisation

**Votre résultat** : `_____________________________`

### Test 3 : Console du Navigateur

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Console**
3. Cliquez sur le lien de réinitialisation dans l'email
4. Regardez s'il y a des erreurs dans la console

**Erreurs observées** : `_____________________________`

### Test 4 : Onglet Network

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Network**
3. Cliquez sur le lien de réinitialisation
4. Regardez les redirections (status 302/307)

**Redirections observées** :
```
1. URL initiale → _____________________________
2. Redirection 1 → _____________________________
3. Redirection 2 → _____________________________
...
```

---

## 🔧 Solutions Possibles

### Solution A : Redirect URLs Manquantes

**Si** : L'URL dans l'email ne pointe pas vers `https://tuteur-maths-app.vercel.app/auth/reset-password`

**Alors** : Configurez les Redirect URLs dans Supabase (voir `CONFIG_SUPABASE_RESET_PASSWORD.md`)

### Solution B : Middleware Trop Strict

**Si** : L'URL est correcte mais vous êtes quand même redirigé

**Alors** : Le middleware bloque encore. Vérifiez que le déploiement Vercel est bien à jour.

### Solution C : Token Expiré

**Si** : Le lien a plus d'1 heure

**Alors** : Demandez un nouveau lien de réinitialisation

### Solution D : Cache Navigateur

**Si** : Vous avez testé plusieurs fois

**Alors** : 
1. Videz le cache (Ctrl+Shift+Delete)
2. Testez en navigation privée
3. Demandez un nouveau lien

---

## 🎯 Plan d'Action

### Étape 1 : Configuration Supabase ⚠️ PRIORITÉ

1. Allez sur https://supabase.com/dashboard
2. Authentication → URL Configuration
3. Ajoutez toutes les Redirect URLs (voir `CONFIG_SUPABASE_RESET_PASSWORD.md`)
4. Sauvegardez

### Étape 2 : Nouveau Lien

1. Allez sur https://tuteur-maths-app.vercel.app/forgot-password
2. Entrez votre email
3. Demandez un NOUVEAU lien (les anciens utilisent l'ancienne config)

### Étape 3 : Test

1. Vérifiez l'email
2. Vérifiez que l'URL commence par `https://tuteur-maths-app.vercel.app/auth/reset-password`
3. Cliquez sur le lien
4. Observez le comportement

### Étape 4 : Rapport

Remplissez ce document avec les informations demandées et envoyez-le moi.

---

## 📊 État Actuel du Code

### Middleware

✅ Routes publiques vérifiées AVANT `getUser()`  
✅ `/auth/*` est une route publique  
✅ Pas de redirection pour les routes publiques

### Page reset-password

✅ Détection du hash token  
✅ Vérification `type=recovery`  
✅ Affichage du loader  
✅ Gestion des erreurs

### Actions

✅ URL de redirection : `${baseUrl}/auth/reset-password`  
✅ Utilisation de VERCEL_URL en production

---

## 🤔 Hypothèses

### Hypothèse 1 : Redirect URLs Non Configurées ⭐ PROBABLE

Supabase ne sait pas qu'il doit rediriger vers `https://tuteur-maths-app.vercel.app/auth/reset-password` et utilise une URL par défaut.

**Test** : Vérifiez l'URL dans l'email

### Hypothèse 2 : Cache Vercel

Le déploiement n'est pas encore propagé sur tous les edge nodes.

**Test** : Attendez 5-10 minutes et réessayez

### Hypothèse 3 : Ancien Lien

Vous utilisez un lien généré avant les corrections.

**Test** : Demandez un nouveau lien

---

## ✅ Checklist de Vérification

- [ ] Redirect URLs configurées dans Supabase
- [ ] Nouveau lien demandé (après configuration)
- [ ] URL dans l'email vérifiée
- [ ] Test en navigation privée
- [ ] Cache vidé
- [ ] Déploiement Vercel terminé (attendu 5 min)
- [ ] Console du navigateur vérifiée
- [ ] Network tab vérifié

---

**PROCHAINE ÉTAPE** : Configurez les Redirect URLs dans Supabase et demandez un NOUVEAU lien !

---

*Document de diagnostic créé le 30 janvier 2026 - 22:28*
