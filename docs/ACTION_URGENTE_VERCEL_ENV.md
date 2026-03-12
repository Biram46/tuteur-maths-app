# ⚠️ ACTION URGENTE : Ajouter NEXT_PUBLIC_SITE_URL dans Vercel

**Problème Identifié** : L'URL dans les emails de réinitialisation pointe vers une URL de preview Vercel au lieu de l'URL de production.

**URL actuelle dans l'email** :
```
https://tuteur-maths-app-birams-projects-c82c4f82.vercel.app/
```

**URL attendue** :
```
https://tuteur-maths-app.vercel.app/auth/reset-password
```

---

## ✅ Solution : Ajouter Variable d'Environnement

### Étape 1 : Aller sur Vercel Dashboard

https://vercel.com/dashboard

### Étape 2 : Ajouter la Variable

1. Sélectionnez votre projet **tuteur-maths-app**
2. **Settings** → **Environment Variables**
3. Cliquez sur **"Add New"**

### Étape 3 : Configuration

**Variable Name** :
```
NEXT_PUBLIC_SITE_URL
```

**Value** :
```
https://tuteur-maths-app.vercel.app
```

**Environments** : Cochez **UNIQUEMENT** :
- ✅ **Production**

**NE PAS cocher** :
- ❌ Preview
- ❌ Development

### Étape 4 : Sauvegarder

Cliquez sur **"Save"**

---

## 🔄 Redéploiement

Après avoir ajouté la variable :

### Option 1 : Automatique (Recommandé)

Le prochain push déclenchera un nouveau déploiement avec la variable.

### Option 2 : Manuel

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. **"..."** → **"Redeploy"**
4. Confirmez

---

## 🧪 Test Après Déploiement

### Attendez le Déploiement

1. Attendez que le statut soit **"Ready"** (2-3 minutes)

### Demandez un NOUVEAU Lien

**IMPORTANT** : Les anciens liens utilisent l'ancienne configuration !

1. Allez sur `https://tuteur-maths-app.vercel.app/forgot-password`
2. Entrez votre email
3. Demandez un **NOUVEAU** lien
4. Vérifiez votre email

### Vérifiez l'URL

L'URL dans le nouvel email devrait maintenant être :
```
https://yhicloevjgwpvlmzoifx.supabase.co/auth/v1/verify?token=XXX&type=recovery&redirect_to=https://tuteur-maths-app.vercel.app/auth/reset-password
```

**Vérifiez que** :
- ✅ `redirect_to` pointe vers `https://tuteur-maths-app.vercel.app`
- ✅ Le chemin se termine par `/auth/reset-password`

### Testez le Lien

1. Cliquez sur le lien dans l'email
2. Vous devriez voir la page de réinitialisation ✅
3. Entrez votre nouveau mot de passe
4. Succès ! 🎉

---

## 📊 Pourquoi Ça Ne Marchait Pas

### Problème

`VERCEL_URL` contient l'URL du déploiement actuel, qui peut être :
- **Production** : `tuteur-maths-app.vercel.app`
- **Preview** : `tuteur-maths-app-birams-projects-c82c4f82.vercel.app`
- **Branch** : `tuteur-maths-app-git-main-username.vercel.app`

Quand vous déployez, Vercel peut utiliser une URL de preview, et cette URL est utilisée dans les emails !

### Solution

Utiliser `NEXT_PUBLIC_SITE_URL` qui est **fixe** et pointe toujours vers l'URL de production.

---

## 🔧 Code Modifié

**Fichier** : `app/auth/password-actions.ts`

**Avant** :
```typescript
const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
```

**Après** :
```typescript
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
    || (process.env.VERCEL_ENV === 'production' 
        ? 'https://tuteur-maths-app.vercel.app' 
        : 'http://localhost:3000')
```

**Logique** :
1. Si `NEXT_PUBLIC_SITE_URL` existe → Utiliser cette valeur
2. Sinon, si en production Vercel → Utiliser l'URL fixe
3. Sinon → Utiliser localhost

---

## ✅ Checklist

- [ ] Variable `NEXT_PUBLIC_SITE_URL` ajoutée dans Vercel (Production uniquement)
- [ ] Variable sauvegardée
- [ ] Redéploiement effectué (ou push pour déclencher)
- [ ] Déploiement terminé (statut "Ready")
- [ ] Nouveau lien de réinitialisation demandé
- [ ] URL dans l'email vérifiée
- [ ] Lien testé
- [ ] Réinitialisation réussie ✅

---

## 🎯 Résumé

**Problème** : URL de preview Vercel dans les emails  
**Cause** : `VERCEL_URL` change selon le déploiement  
**Solution** : Variable `NEXT_PUBLIC_SITE_URL` fixe  
**Action** : Ajouter la variable dans Vercel Dashboard

---

**TEMPS ESTIMÉ** : 5 minutes  
**PRIORITÉ** : 🔴 CRITIQUE

---

*Guide créé le 30 janvier 2026 - 22:33*
