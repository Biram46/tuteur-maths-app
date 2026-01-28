# 🔧 Configuration Supabase - Guide Pas à Pas

## 📍 Vous êtes ici : Configuration de l'authentification Supabase pour Vercel

**Temps estimé** : 5 minutes

---

## 🎯 Objectif

Configurer Supabase pour accepter les connexions depuis votre application Vercel déployée sur :
**https://tuteur-maths-app.vercel.app/**

---

## 📋 Étapes Détaillées

### Étape 1 : Accéder à Supabase Dashboard

1. **Ouvrez votre navigateur**
2. **Allez sur** : https://supabase.com
3. **Connectez-vous** avec votre compte
4. **Cliquez sur votre projet** (celui qui a l'URL `yhicloevjgwpvlmzoifx.supabase.co`)

---

### Étape 2 : Accéder aux paramètres d'authentification

1. Dans le **menu de gauche**, cherchez l'icône **🔒 "Authentication"**
2. **Cliquez sur "Authentication"**
3. Dans le sous-menu qui apparaît, **cliquez sur "URL Configuration"**

Vous devriez voir une page avec deux champs principaux :
- **Site URL**
- **Redirect URLs**

---

### Étape 3 : Configurer le Site URL

1. **Trouvez le champ "Site URL"**
2. **Supprimez** l'URL actuelle (probablement `http://localhost:3000`)
3. **Remplacez par** : `https://tuteur-maths-app.vercel.app`

⚠️ **IMPORTANT** : 
- Pas de slash `/` à la fin
- Utilisez `https://` (pas `http://`)
- Vérifiez qu'il n'y a pas d'espace avant ou après

**Exemple correct** :
```
https://tuteur-maths-app.vercel.app
```

---

### Étape 4 : Configurer les Redirect URLs

1. **Trouvez le champ "Redirect URLs"**
2. **Supprimez** les anciennes URLs (si présentes)
3. **Copiez-collez** exactement ces lignes (une par ligne) :

```
https://tuteur-maths-app.vercel.app/*
https://tuteur-maths-app.vercel.app/auth/callback
https://tuteur-maths-app.vercel.app/login
https://tuteur-maths-app.vercel.app/admin/login
http://localhost:3000/*
http://localhost:3000/auth/callback
http://localhost:3000/login
```

⚠️ **IMPORTANT** :
- Chaque URL sur une **nouvelle ligne**
- Les URLs `localhost` permettent de continuer à développer en local
- L'astérisque `*` est important (wildcard)

**Exemple de ce que vous devriez voir** :
```
https://tuteur-maths-app.vercel.app/*
https://tuteur-maths-app.vercel.app/auth/callback
https://tuteur-maths-app.vercel.app/login
https://tuteur-maths-app.vercel.app/admin/login
http://localhost:3000/*
http://localhost:3000/auth/callback
http://localhost:3000/login
```

---

### Étape 5 : Sauvegarder

1. **Descendez en bas de la page**
2. **Cliquez sur le bouton "Save"** (vert)
3. **Attendez** la confirmation (un message de succès devrait apparaître)

✅ **Configuration terminée !**

---

## ✅ Vérification

Pour vérifier que la configuration est correcte :

1. **Retournez sur la page "URL Configuration"**
2. **Vérifiez que** :
   - Site URL = `https://tuteur-maths-app.vercel.app`
   - Redirect URLs contient toutes les URLs listées ci-dessus

---

## 🎯 Prochaine Étape

Maintenant que Supabase est configuré, nous allons **tester l'application** !

Passez au fichier : **`TESTS_APPLICATION.md`**

---

## 🆘 Problèmes Courants

### Problème : "Invalid redirect URL"
**Solution** : Vérifiez que toutes les URLs sont exactement comme indiqué, sans espaces

### Problème : "Site URL must be a valid URL"
**Solution** : Assurez-vous d'utiliser `https://` et pas d'espace

### Problème : Impossible de sauvegarder
**Solution** : Vérifiez votre connexion internet et réessayez

---

## 📞 Besoin d'aide ?

Si vous rencontrez un problème :
1. Vérifiez que vous êtes sur le bon projet Supabase
2. Vérifiez que vous avez les droits d'administration
3. Essayez de rafraîchir la page
4. Contactez-moi pour assistance

---

**✅ Une fois cette configuration terminée, dites-moi "C'est fait" et nous passerons aux tests !**
