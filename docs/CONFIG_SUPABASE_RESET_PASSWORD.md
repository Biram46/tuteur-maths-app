# 🔧 Configuration Supabase OBLIGATOIRE pour Reset Password

**IMPORTANT** : Sans cette configuration, la réinitialisation de mot de passe NE FONCTIONNERA PAS !

---

## ⚠️ Problème Actuel

Le lien de réinitialisation redirige vers `/login` au lieu de `/auth/reset-password`.

**Cause probable** : Les URLs de redirection ne sont pas configurées dans Supabase.

---

## ✅ Solution : Configurer Supabase Dashboard

### Étape 1 : Aller sur Supabase Dashboard

1. Allez sur : **https://supabase.com/dashboard**
2. Connectez-vous
3. Sélectionnez votre projet

### Étape 2 : Configuration Authentication

1. Dans le menu de gauche, cliquez sur **"Authentication"**
2. Cliquez sur **"URL Configuration"**

### Étape 3 : Configurer les URLs

#### Site URL

Dans le champ **"Site URL"**, entrez :
```
https://tuteur-maths-app.vercel.app
```

#### Redirect URLs

Dans le champ **"Redirect URLs"**, ajoutez ces lignes (une par ligne) :

```
https://tuteur-maths-app.vercel.app/auth/callback
https://tuteur-maths-app.vercel.app/auth/reset-password
https://tuteur-maths-app.vercel.app/login
https://tuteur-maths-app.vercel.app/admin/login
https://tuteur-maths-app.vercel.app/**
http://localhost:3000/**
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

**IMPORTANT** : Ajoutez **TOUTES** ces URLs !

### Étape 4 : Sauvegarder

1. Cliquez sur **"Save"** en bas de la page
2. Attendez la confirmation

---

## 🧪 Test Après Configuration

### Test Complet

1. Allez sur `https://tuteur-maths-app.vercel.app/login`
2. Cliquez sur **"Mot de passe oublié ?"**
3. Entrez votre email
4. Cliquez sur **"Envoyer le lien de réinitialisation"**
5. Vérifiez votre email
6. **Vérifiez l'URL dans l'email** :
   - Elle devrait commencer par `https://tuteur-maths-app.vercel.app/auth/reset-password`
   - Elle devrait avoir un hash `#access_token=...&type=recovery`
7. Cliquez sur le lien
8. Vous devriez voir la page de réinitialisation ✅

---

## 🔍 Vérification de l'Email

### Format Attendu du Lien

Le lien dans l'email devrait ressembler à :

```
https://tuteur-maths-app.vercel.app/auth/reset-password#access_token=XXXX&expires_in=3600&refresh_token=YYYY&token_type=bearer&type=recovery
```

**Si le lien pointe vers autre chose** (comme `/auth/confirm` ou autre), c'est que Supabase n'utilise pas la bonne URL de redirection.

---

## 🛠️ Configuration Email Template (Optionnel)

Si les URLs de redirection ne suffisent pas, vous pouvez aussi modifier le template d'email :

### Étape 1 : Email Templates

1. Dans Supabase Dashboard → **Authentication** → **Email Templates**
2. Sélectionnez **"Reset Password"**

### Étape 2 : Vérifier le Template

Le template devrait contenir :

```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

**NE PAS MODIFIER** ce template sauf si vous savez ce que vous faites.

---

## 📊 Diagnostic

### Si Ça Ne Marche Toujours Pas

Vérifiez dans l'email reçu :

1. **L'URL complète du lien**
2. **Vers quelle page il redirige**
3. **S'il y a un hash token** (`#access_token=...`)

**Envoyez-moi ces informations** pour que je puisse diagnostiquer le problème exact.

---

## 🔐 Sécurité

### Password Recovery Settings

Dans **Authentication** → **Policies** :

- **Enable email confirmations** : ✅ Activé
- **Secure email change** : ✅ Activé  
- **Enable phone confirmations** : ❌ Désactivé (sauf si vous utilisez SMS)

---

## ⏱️ Expiration du Token

Par défaut, le token de réinitialisation expire après **1 heure**.

Si vous testez avec un ancien email, demandez un nouveau lien !

---

## 📝 Checklist Complète

- [ ] Site URL configuré : `https://tuteur-maths-app.vercel.app`
- [ ] Redirect URLs ajoutées (toutes les 8 URLs)
- [ ] Configuration sauvegardée
- [ ] Nouveau lien de réinitialisation demandé (ancien expiré)
- [ ] Email reçu
- [ ] Lien vérifié (commence par `https://tuteur-maths-app.vercel.app/auth/reset-password`)
- [ ] Hash token présent (`#access_token=...`)
- [ ] Clic sur le lien
- [ ] Page de réinitialisation affichée ✅

---

## 🆘 Si Ça Ne Marche Toujours Pas

### Option Alternative : Utiliser le Flow PKCE

Supabase supporte aussi le flow PKCE qui est plus moderne. Mais cela nécessite des modifications de code plus importantes.

**Pour l'instant, concentrons-nous sur la configuration des Redirect URLs.**

---

**IMPORTANT** : Après avoir configuré les Redirect URLs dans Supabase, **demandez un NOUVEAU lien de réinitialisation** (les anciens liens utilisent l'ancienne configuration).

---

*Guide créé le 30 janvier 2026 - 22:28*
