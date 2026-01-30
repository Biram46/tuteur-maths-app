# 🔍 Guide de Débogage Déploiement Vercel

**Date** : 30 janvier 2026  
**Objectif** : Diagnostiquer et résoudre les problèmes de déploiement Vercel

---

## 📊 État Actuel du Projet

### ✅ Configuration Correcte

- **Next.js** : Version 16.1.2 (stable)
- **Middleware** : Configuré correctement dans `middleware.ts`
- **Build Scripts** : `npm run build` et `npm start` présents
- **TypeScript** : Configuration valide
- **Supabase** : Intégration complète

### ⚠️ Points à Vérifier

1. **Variables d'environnement Vercel**
2. **Logs de build Vercel**
3. **Configuration Supabase (URLs de redirection)**
4. **Cache Vercel**

---

## 🚀 Checklist de Déploiement

### Étape 1 : Vérifier les Variables d'Environnement Vercel

Allez sur **Vercel Dashboard** → **Votre Projet** → **Settings** → **Environment Variables**

Vérifiez que **TOUTES** ces variables sont présentes :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yhicloevjgwpvlmzoifx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `ressources-cours` | Production, Preview, Development |
| `PERPLEXITY_API_KEY` | `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` | Production, Preview, Development |
| `ADMIN_EMAIL` | `biram26@yahoo.fr` | Production, Preview, Development |

**⚠️ IMPORTANT** : Si une variable manque, ajoutez-la et **redéployez** !

---

### Étape 2 : Vérifier le Statut du Dernier Déploiement

1. Allez sur **Vercel Dashboard** → **Deployments**
2. Regardez le dernier déploiement

**Statuts possibles** :

- ✅ **Ready** : Déploiement réussi
- 🔄 **Building** : En cours (attendez 2-5 minutes)
- ❌ **Failed** : Échec (voir Étape 3)
- ⚠️ **Canceled** : Annulé (relancez)

---

### Étape 3 : Analyser les Logs de Build (si Failed)

Si le statut est **Failed** :

1. Cliquez sur le déploiement échoué
2. Cliquez sur **"View Build Logs"**
3. Cherchez les lignes avec ❌ ou `Error:`

**Erreurs courantes** :

#### A. Erreur TypeScript

```
Type error: ...
```

**Solution** :
```bash
# Tester localement
npx tsc --noEmit
```

#### B. Variable d'environnement manquante

```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**Solution** : Ajoutez la variable dans Vercel Settings → Environment Variables

#### C. Erreur de dépendance

```
Cannot find module '...'
```

**Solution** :
```bash
# Vérifier package.json
npm install
```

#### D. Avertissement Middleware (NON BLOQUANT)

```
The "middleware" file convention is deprecated
```

**Solution** : ⚠️ **Ignorez cet avertissement** - il n'empêche PAS le déploiement !

---

### Étape 4 : Vérifier la Configuration Supabase

1. Allez sur **Supabase Dashboard** → **Authentication** → **URL Configuration**

2. Vérifiez que votre URL Vercel est configurée :

**Site URL** :
```
https://tuteur-maths-app.vercel.app
```

**Redirect URLs** (ajoutez toutes ces lignes) :
```
https://tuteur-maths-app.vercel.app/auth/callback
https://tuteur-maths-app.vercel.app/login
https://tuteur-maths-app.vercel.app/admin/login
https://tuteur-maths-app.vercel.app/**
http://localhost:3000/**
```

3. **Sauvegardez** les modifications

---

### Étape 5 : Tester le Déploiement

1. **Visitez l'URL de production** : `https://tuteur-maths-app.vercel.app`

2. **Testez la redirection** :
   - Vous devriez être redirigé vers `/login`
   - ✅ Si oui : Authentification fonctionne
   - ❌ Si non : Voir Étape 6

3. **Testez la connexion élève** :
   - Créez un compte ou connectez-vous
   - Vérifiez que vous accédez au tableau de bord

4. **Testez la connexion admin** :
   - Allez sur `/admin/login`
   - Connectez-vous avec `biram26@yahoo.fr`
   - Vérifiez que vous accédez à `/admin`

---

### Étape 6 : Problèmes Courants et Solutions

#### Problème A : "Page Not Found" (404)

**Cause** : Build incomplet ou erreur de routing

**Solutions** :
1. Vérifiez les logs de build
2. Redéployez depuis Vercel Dashboard
3. Vérifiez que `middleware.ts` est bien déployé

#### Problème B : "Internal Server Error" (500)

**Cause** : Variable d'environnement manquante ou erreur serveur

**Solutions** :
1. Vérifiez **toutes** les variables d'environnement
2. Consultez les **Function Logs** dans Vercel
3. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est définie

#### Problème C : Redirection infinie

**Cause** : Problème de middleware ou session

**Solutions** :
1. Videz le cache : Ctrl+Shift+R
2. Essayez en navigation privée
3. Vérifiez les cookies (DevTools → Application → Cookies)

#### Problème D : "Access Denied" sur /admin

**Cause** : Email non reconnu comme admin

**Solutions** :
1. Vérifiez que `ADMIN_EMAIL=biram26@yahoo.fr` est dans Vercel
2. Vérifiez que vous êtes connecté avec le bon email
3. Redéployez si vous venez d'ajouter la variable

#### Problème E : Modifications non visibles

**Cause** : Cache CDN ou build non déployé

**Solutions** :
1. **Videz le cache navigateur** : Ctrl+Shift+R
2. **Attendez 5 minutes** (propagation CDN)
3. **Vérifiez le commit** sur GitHub
4. **Forcez un redéploiement** (voir Étape 7)

---

### Étape 7 : Forcer un Redéploiement

Si rien ne fonctionne, forcez un nouveau déploiement :

#### Option A : Via Vercel Dashboard

1. **Deployments** → Dernier déploiement
2. Cliquez sur **"..."** → **"Redeploy"**
3. Cochez **"Use existing Build Cache"** = **NON** (décochez)
4. Cliquez sur **"Redeploy"**

#### Option B : Via Git (Commit vide)

```bash
git commit --allow-empty -m "Force redeploy - debug Vercel"
git push origin main
```

#### Option C : Nettoyer le Cache Vercel

1. **Settings** → **General**
2. Cherchez **"Build & Development Settings"**
3. Cliquez sur **"Clear Build Cache"**
4. Redéployez

---

## 🔧 Commandes de Diagnostic

### Vérifier l'état Git

```bash
# Voir les commits récents
git log --oneline -5

# Voir les fichiers modifiés
git status

# Voir la branche actuelle
git branch

# Voir le remote GitHub
git remote -v
```

### Tester le Build Localement

**Note** : Si PowerShell bloque npm, utilisez CMD :

```cmd
# Ouvrir CMD (pas PowerShell)
cd C:\Users\HP\Documents\projet\tuteur-maths-app

# Tester le build
npm run build

# Si succès, tester en mode production
npm start
```

### Vérifier TypeScript

```bash
npx tsc --noEmit
```

---

## 📋 Checklist Complète

Avant de demander de l'aide, vérifiez :

- [ ] Toutes les variables d'environnement sont dans Vercel
- [ ] Le dernier commit est sur GitHub (`git log`)
- [ ] Le dernier déploiement est en statut "Ready"
- [ ] L'URL Vercel est dans Supabase (Redirect URLs)
- [ ] Le cache navigateur est vidé (Ctrl+Shift+R)
- [ ] Testé en navigation privée
- [ ] Attendu 5 minutes après le déploiement
- [ ] Les logs de build ne montrent pas d'erreur (seulement warnings)
- [ ] Le build local fonctionne (`npm run build`)

---

## 🆘 Informations à Fournir pour le Support

Si vous avez toujours un problème, fournissez :

1. **URL de déploiement** : `https://...vercel.app`
2. **Statut du déploiement** : Ready / Building / Failed
3. **Logs de build** : Copiez les lignes d'erreur (pas les warnings)
4. **Comportement observé** : Que se passe-t-il exactement ?
5. **Comportement attendu** : Que devrait-il se passer ?
6. **Étapes déjà tentées** : Qu'avez-vous déjà essayé ?

---

## 🎯 URLs Importantes

| Service | URL |
|---------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Vercel Deployments** | https://vercel.com/[username]/tuteur-maths-app/deployments |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **GitHub Repository** | https://github.com/Biram46/tuteur-maths-app |
| **Site de Production** | https://tuteur-maths-app.vercel.app |

---

## 💡 Notes Importantes

### Avertissement vs Erreur

- ⚠️ **Warning** (Avertissement) : N'empêche PAS le déploiement
- ❌ **Error** (Erreur) : Bloque le déploiement

**L'avertissement middleware est un WARNING, pas une erreur !**

### Temps de Propagation

Après un déploiement réussi :
- **Build** : 2-5 minutes
- **Propagation CDN** : 2-5 minutes supplémentaires
- **Total** : Attendez jusqu'à 10 minutes

### Cache

Le cache peut causer des problèmes :
- **Cache navigateur** : Ctrl+Shift+R
- **Cache Vercel** : Settings → Clear Build Cache
- **Cache CDN** : Attendez 5 minutes

---

## 🚀 Prochaines Étapes

Une fois le déploiement réussi :

1. ✅ Testez toutes les fonctionnalités
2. ✅ Vérifiez les analytics Vercel
3. ✅ Configurez un domaine personnalisé (optionnel)
4. ✅ Activez les alertes de monitoring
5. ✅ Documentez l'URL de production

---

**Temps estimé** : 15-30 minutes  
**Difficulté** : Intermédiaire  
**Impact** : Déploiement réussi

*Guide créé le 30 janvier 2026*
