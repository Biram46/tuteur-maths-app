# 🔧 Configuration Supabase pour Vercel

Votre application est déployée sur : **https://tuteur-maths-app.vercel.app/**

Pour que l'authentification fonctionne correctement, vous devez configurer Supabase avec cette URL.

## 📋 Étapes de configuration

### 1. Aller sur Supabase Dashboard

1. Ouvrez votre navigateur
2. Allez sur : **https://supabase.com**
3. Connectez-vous à votre compte
4. Cliquez sur votre projet (celui avec l'URL `yhicloevjgwpvlmzoifx.supabase.co`)

### 2. Configurer les URLs d'authentification

1. **Dans le menu de gauche**, cliquez sur **"Authentication"** (icône de cadenas 🔒)
2. **Cliquez sur "URL Configuration"**

### 3. Modifier le Site URL

Dans le champ **"Site URL"** :
- **Supprimez** l'ancienne URL (probablement `http://localhost:3000`)
- **Remplacez par** : `https://tuteur-maths-app.vercel.app`

### 4. Ajouter les Redirect URLs

Dans le champ **"Redirect URLs"**, ajoutez les URLs suivantes (une par ligne) :

```
https://tuteur-maths-app.vercel.app/*
https://tuteur-maths-app.vercel.app/auth/callback
https://tuteur-maths-app.vercel.app/login
https://tuteur-maths-app.vercel.app/admin/login
http://localhost:3000/*
http://localhost:3000/auth/callback
http://localhost:3000/login
```

**Note** : Les URLs `localhost` permettent de continuer à développer en local.

### 5. Sauvegarder

- Descendez en bas de la page
- Cliquez sur le bouton **"Save"** (vert)
- Attendez la confirmation

## ✅ Vérification

Une fois la configuration sauvegardée :

### Test 1 : Page d'accueil
1. Allez sur : https://tuteur-maths-app.vercel.app/
2. Vous devriez être redirigé vers la page de login
3. ✅ Si vous voyez la page de login, c'est bon !

### Test 2 : Créer un compte étudiant
1. Sur la page de login, cliquez sur "S'inscrire" ou "Sign Up"
2. Créez un compte avec un email de test
3. Vérifiez votre email pour confirmer le compte
4. Connectez-vous
5. ✅ Vous devriez voir le dashboard étudiant avec les cours

### Test 3 : Connexion admin
1. Déconnectez-vous
2. Allez sur : https://tuteur-maths-app.vercel.app/admin/login
3. Connectez-vous avec : `biram26@yahoo.fr`
4. ✅ Vous devriez accéder au dashboard admin

### Test 4 : Assistant AI
1. Connectez-vous en tant qu'étudiant
2. Cliquez sur "Assistant IA" ou naviguez vers `/assistant`
3. Posez une question de maths (ex: "Comment résoudre x² + 2x + 1 = 0 ?")
4. ✅ L'assistant devrait répondre

### Test 5 : Ressources
1. Dans le dashboard étudiant, sélectionnez un niveau (ex: "Première")
2. Sélectionnez un chapitre (ex: "Second Degré")
3. ✅ Vous devriez voir les cours, exercices et exercices interactifs

## 🐛 Dépannage

### Problème : "Invalid login credentials"
- Vérifiez que vous avez bien confirmé votre email
- Vérifiez que les URLs sont correctement configurées dans Supabase

### Problème : Redirection infinie
- Vérifiez que le **Site URL** est bien `https://tuteur-maths-app.vercel.app` (sans slash à la fin)
- Vérifiez que les **Redirect URLs** incluent bien `https://tuteur-maths-app.vercel.app/*`

### Problème : "Auth session missing"
- Nettoyez les cookies de votre navigateur
- Réessayez de vous connecter

### Problème : L'assistant AI ne répond pas
- Vérifiez que la variable `PERPLEXITY_API_KEY` est bien définie dans Vercel
- Allez dans Vercel Dashboard → votre projet → Settings → Environment Variables
- Vérifiez que `PERPLEXITY_API_KEY` existe et est correcte

### Problème : Les ressources ne se chargent pas
- Vérifiez que `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` est défini dans Vercel
- Vérifiez les permissions du bucket dans Supabase Storage

## 📊 Variables d'environnement Vercel

Pour vérifier que toutes les variables sont bien configurées :

1. Allez sur : https://vercel.com/dashboard
2. Cliquez sur votre projet `tuteur-maths-app`
3. Allez dans **Settings** → **Environment Variables**
4. Vérifiez que ces 6 variables existent :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yhicloevjgwpvlmzoifx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `ressources-cours` |
| `PERPLEXITY_API_KEY` | `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` |
| `ADMIN_EMAIL` | `biram26@yahoo.fr` |

Si une variable manque, ajoutez-la et redéployez.

## 🎯 Récapitulatif

- ✅ Application déployée : https://tuteur-maths-app.vercel.app/
- ⏳ Configuration Supabase : À faire maintenant
- ⏳ Tests : À faire après la configuration

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Vercel Dashboard → Deployments → Logs
2. Vérifiez les logs dans Supabase Dashboard → Logs
3. Testez d'abord en navigation privée pour éviter les problèmes de cache

---

**Bon déploiement ! 🚀**
