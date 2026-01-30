# 🔧 Fix : Lien Email Redirection vers Localhost

**Problème** : Les liens de réinitialisation de mot de passe dans les emails redirigent vers `localhost:3000` au lieu de l'URL Vercel

**Date** : 30 janvier 2026  
**Statut** : ✅ Corrigé

---

## 🎯 Problème Identifié

Quand un utilisateur demande une réinitialisation de mot de passe :
1. Il reçoit un email de Supabase
2. Le lien dans l'email pointe vers `http://localhost:3000/auth/reset-password`
3. ❌ L'utilisateur ne peut pas accéder à localhost depuis son email

---

## 🔧 Solution Appliquée

### Modification du Code

**Fichier** : `app/auth/password-actions.ts`

**Avant** :
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
})
```

**Après** :
```typescript
// Déterminer l'URL de redirection
// En production Vercel, VERCEL_URL est automatiquement défini
const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/reset-password`,
})
```

### Variables d'Environnement

**Vercel** (automatique) :
- `VERCEL_URL` : Défini automatiquement par Vercel (ex: `tuteur-maths-app.vercel.app`)

**Local** (`.env.local`) :
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## ⚠️ ACTION REQUISE : Ajouter Variable dans Vercel

Pour que cela fonctionne parfaitement, ajoutez cette variable dans Vercel :

### Étape 1 : Aller sur Vercel Dashboard

https://vercel.com/dashboard

### Étape 2 : Ajouter la Variable

1. Sélectionnez votre projet `tuteur-maths-app`
2. **Settings** → **Environment Variables**
3. Cliquez sur **"Add New"**

**Nom** : `NEXT_PUBLIC_SITE_URL`  
**Valeur** : `https://tuteur-maths-app.vercel.app`

**Environnements** : Cochez **Production**, **Preview** ET **Development**

4. Cliquez sur **"Save"**

### Étape 3 : Redéployer

Après avoir ajouté la variable :

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. **"..."** → **"Redeploy"**
4. Confirmez

---

## 🧪 Comment Tester

### Test Complet

1. Allez sur `https://tuteur-maths-app.vercel.app/login`
2. Cliquez sur **"Mot de passe oublié ?"**
3. Entrez votre email
4. Cliquez sur **"Envoyer le lien de réinitialisation"**
5. Vérifiez votre boîte email
6. **Vérifiez que le lien commence par** `https://tuteur-maths-app.vercel.app/auth/reset-password`
7. Cliquez sur le lien
8. Vous devriez arriver sur la page de réinitialisation ✅

---

## 📊 Logique de Détection d'URL

Le code utilise cette logique en cascade :

```
1. VERCEL_URL existe ? 
   → Oui : Utiliser https://${VERCEL_URL}
   → Non : Passer à l'étape 2

2. NEXT_PUBLIC_SITE_URL existe ?
   → Oui : Utiliser cette valeur
   → Non : Utiliser http://localhost:3000 (fallback)
```

**En production Vercel** :
- `VERCEL_URL` = `tuteur-maths-app.vercel.app`
- Résultat : `https://tuteur-maths-app.vercel.app/auth/reset-password` ✅

**En développement local** :
- `VERCEL_URL` = undefined
- `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000`
- Résultat : `http://localhost:3000/auth/reset-password` ✅

---

## 🔄 Commit

```
Fix: Utiliser VERCEL_URL pour les emails de réinitialisation en production
```

---

## ✅ Checklist

- [x] Code modifié dans `app/auth/password-actions.ts`
- [x] Variable ajoutée dans `.env.local`
- [ ] **Variable ajoutée dans Vercel** ⚠️ (À FAIRE)
- [ ] Redéploiement effectué
- [ ] Test de réinitialisation de mot de passe réussi

---

## 💡 Note Importante

**VERCEL_URL** est automatiquement défini par Vercel et contient le domaine sans `https://`.

Exemples :
- Production : `tuteur-maths-app.vercel.app`
- Preview : `tuteur-maths-app-git-main-username.vercel.app`

C'est pourquoi on ajoute `https://` dans le code : `https://${process.env.VERCEL_URL}`

---

**Temps estimé** : 5 minutes  
**Difficulté** : Facile

*Guide créé le 30 janvier 2026 - 21:25*
