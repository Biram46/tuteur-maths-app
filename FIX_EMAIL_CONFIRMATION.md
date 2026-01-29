# 🔧 Fix : Email de Confirmation Redirige vers Vercel Dashboard

**Problème** : Le lien de confirmation d'email redirige vers le dashboard Vercel au lieu de l'application  
**Cause** : Configuration incorrecte des URLs dans Supabase  
**Date** : 29 janvier 2026

---

## 🎯 Solution Rapide (5 minutes)

### Étape 1 : Configurer les URLs dans Supabase

1. **Allez sur** : https://supabase.com/dashboard
2. **Sélectionnez** votre projet
3. **Naviguez vers** : **Authentication** > **URL Configuration**

### Étape 2 : Modifier la Site URL

Dans le champ **Site URL**, remplacez la valeur actuelle par :

```
https://tuteur-maths-app.vercel.app
```

⚠️ **IMPORTANT** : 
- Pas de slash `/` à la fin
- Utilisez exactement votre URL Vercel de production

### Étape 3 : Configurer les Redirect URLs

Dans le champ **Redirect URLs**, ajoutez ces URLs (une par ligne) :

```
https://tuteur-maths-app.vercel.app/**
https://tuteur-maths-app.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

**Explication** :
- `/**` : Autorise toutes les pages de votre domaine
- `/auth/callback` : URL de callback après authentification
- Les URLs localhost sont pour le développement local

### Étape 4 : Sauvegarder

1. Cliquez sur **"Save"** en bas de la page
2. Attendez quelques secondes pour la propagation

---

## 🧪 Tester la Correction

### Test 1 : Nouvelle Inscription

1. **Ouvrez** un navigateur en mode navigation privée
2. **Allez sur** : https://tuteur-maths-app.vercel.app/login
3. **Inscrivez-vous** avec un nouvel email :
   - Email : `test.eleve2.vercel@exemple.com`
   - Mot de passe : `TestVercel123!`
4. **Vérifiez** votre email
5. **Cliquez** sur le lien de confirmation

**✅ Résultat attendu** :
- Le lien vous redirige vers `https://tuteur-maths-app.vercel.app`
- Vous êtes automatiquement connecté
- L'interface élève s'affiche

### Test 2 : Ancien Email de Confirmation

Si vous avez encore l'ancien email :

1. **Copiez** le lien de confirmation
2. **Remplacez** la partie du domaine manuellement :
   
   **Avant** :
   ```
   https://vercel.com/...?token=...
   ```
   
   **Après** :
   ```
   https://tuteur-maths-app.vercel.app/auth/callback?token=...
   ```

3. **Collez** le nouveau lien dans votre navigateur

---

## 🔍 Vérification de la Configuration

### Vérifier que tout est correct

Dans Supabase, votre configuration devrait ressembler à :

```
┌─────────────────────────────────────────────────────────┐
│ URL Configuration                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Site URL                                                │
│ https://tuteur-maths-app.vercel.app                    │
│                                                         │
│ Redirect URLs                                           │
│ https://tuteur-maths-app.vercel.app/**                 │
│ https://tuteur-maths-app.vercel.app/auth/callback      │
│ http://localhost:3000/**                                │
│ http://localhost:3000/auth/callback                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📧 Configuration des Email Templates (Optionnel)

Si vous voulez personnaliser les emails, vous pouvez aussi :

1. **Allez dans** : **Authentication** > **Email Templates**
2. **Sélectionnez** : "Confirm signup"
3. **Vérifiez** que le lien utilise bien `{{ .SiteURL }}`

Le template par défaut devrait contenir :

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">
  Confirmer mon email
</a>
```

⚠️ **Ne modifiez pas** si vous n'êtes pas sûr, le template par défaut fonctionne bien.

---

## 🎯 Alternative : Désactiver la Confirmation Email (Pour les Tests)

Si vous voulez tester rapidement **sans confirmation email** :

### Option A : Désactiver Globalement

1. **Allez dans** : **Authentication** > **Providers** > **Email**
2. **Décochez** : "Confirm email"
3. **Sauvegardez**

⚠️ **Attention** : Tous les nouveaux utilisateurs seront automatiquement confirmés (pas recommandé en production)

### Option B : Créer des Utilisateurs Manuellement

1. **Allez dans** : **Authentication** > **Users**
2. **Cliquez sur** : "Add User"
3. **Remplissez** :
   - Email : `test.eleve.vercel@exemple.com`
   - Password : `TestVercel123!`
4. **Cochez** : "Auto Confirm User"
5. **Cliquez sur** : "Create User"

---

## ✅ Checklist de Résolution

- [ ] Site URL configurée : `https://tuteur-maths-app.vercel.app`
- [ ] Redirect URLs ajoutées (4 URLs)
- [ ] Configuration sauvegardée
- [ ] Attendu 1-2 minutes pour la propagation
- [ ] Testé avec une nouvelle inscription
- [ ] Email de confirmation reçu
- [ ] Lien de confirmation fonctionne
- [ ] Redirection vers l'application (pas Vercel Dashboard)
- [ ] Utilisateur automatiquement connecté

---

## 🐛 Si le Problème Persiste

### Vérification 1 : Cache Email

Les emails peuvent être mis en cache. Essayez :
- Attendez 5 minutes
- Inscrivez-vous avec un **nouvel email**
- Vérifiez le nouveau lien de confirmation

### Vérification 2 : Variables d'Environnement Vercel

Vérifiez que dans Vercel :
1. **Settings** > **Environment Variables**
2. `NEXT_PUBLIC_SUPABASE_URL` est correct
3. Pas de variable `SITE_URL` ou `REDIRECT_URL` qui pourrait interférer

### Vérification 3 : Logs Supabase

1. **Allez dans** : **Logs** > **Auth Logs**
2. Cherchez les erreurs liées à la confirmation
3. Vérifiez les URLs utilisées

---

## 📊 Résumé

| Élément | Avant | Après |
|---------|-------|-------|
| **Site URL** | ❌ Vercel Dashboard | ✅ `https://tuteur-maths-app.vercel.app` |
| **Redirect URLs** | ❌ Non configurées | ✅ 4 URLs ajoutées |
| **Lien confirmation** | ❌ Pointe vers Vercel | ✅ Pointe vers l'app |
| **Connexion auto** | ❌ Non | ✅ Oui |

---

## 🎉 Après la Correction

Une fois corrigé, vous pourrez :

1. ✅ Inscrire de nouveaux élèves
2. ✅ Recevoir l'email de confirmation
3. ✅ Cliquer sur le lien
4. ✅ Être redirigé vers l'application
5. ✅ Être automatiquement connecté
6. ✅ Accéder à l'interface élève

---

**Temps estimé** : 5 minutes  
**Difficulté** : Facile  
**Impact** : Critique (bloque les inscriptions)

*Guide créé le 29 janvier 2026*
