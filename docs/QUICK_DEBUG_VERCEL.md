# 🚀 Guide Rapide - Débogage Déploiement Vercel

**Dernière mise à jour** : 30 janvier 2026

---

## ✅ Vérification Rapide

Avant de débugger, lancez le script de vérification :

```bash
node verify-deployment.js
```

Ce script vérifie automatiquement :
- ✅ Configuration package.json
- ✅ Dépendances installées
- ✅ Variables d'environnement
- ✅ Structure du projet
- ✅ Fichiers essentiels

---

## 🔍 Problèmes Courants

### 1. Build Failed sur Vercel

**Symptômes** : Déploiement échoue avec erreur de build

**Diagnostic** :
1. Allez sur Vercel Dashboard → Deployments
2. Cliquez sur le déploiement échoué
3. Regardez les "Build Logs"

**Solutions** :

#### A. Erreur TypeScript
```bash
# Tester localement
npx tsc --noEmit
```

#### B. Variable d'environnement manquante
- Allez dans Vercel → Settings → Environment Variables
- Ajoutez la variable manquante
- Redéployez

#### C. Dépendance manquante
```bash
npm install
npm run build
```

---

### 2. Modifications Non Visibles

**Symptômes** : Le site ne montre pas vos dernières modifications

**Solutions** :

1. **Vider le cache navigateur**
   - Windows : `Ctrl + Shift + R`
   - Mac : `Cmd + Shift + R`

2. **Vérifier le commit**
   ```bash
   git log --oneline -3
   ```

3. **Vérifier le déploiement**
   - Vercel Dashboard → Deployments
   - Le dernier déploiement doit être "Ready"

4. **Attendre la propagation CDN**
   - Attendez 5 minutes après le déploiement

5. **Forcer un redéploiement**
   ```bash
   git commit --allow-empty -m "Force redeploy"
   git push origin main
   ```

---

### 3. Erreur d'Authentification

**Symptômes** : Impossible de se connecter, erreur de redirection

**Solutions** :

1. **Vérifier Supabase URLs**
   - Supabase Dashboard → Authentication → URL Configuration
   - **Site URL** : `https://tuteur-maths-app.vercel.app`
   - **Redirect URLs** :
     ```
     https://tuteur-maths-app.vercel.app/auth/callback
     https://tuteur-maths-app.vercel.app/**
     ```

2. **Vérifier les variables Vercel**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Vider les cookies**
   - DevTools (F12) → Application → Cookies
   - Supprimez tous les cookies du site

---

### 4. Erreur 500 (Internal Server Error)

**Symptômes** : Page blanche ou erreur 500

**Solutions** :

1. **Vérifier les Function Logs**
   - Vercel Dashboard → Deployments → View Function Logs

2. **Vérifier SUPABASE_SERVICE_ROLE_KEY**
   - Doit être dans Vercel Environment Variables
   - Pour Production, Preview ET Development

3. **Vérifier le middleware**
   ```bash
   # Le fichier middleware.ts doit exister
   ls middleware.ts
   ```

---

### 5. Admin Access Denied

**Symptômes** : Impossible d'accéder à /admin

**Solutions** :

1. **Vérifier ADMIN_EMAIL**
   - Vercel → Settings → Environment Variables
   - `ADMIN_EMAIL=biram26@yahoo.fr`

2. **Vérifier l'email de connexion**
   - Vous devez être connecté avec `biram26@yahoo.fr`

3. **Redéployer après ajout de variable**
   - Si vous venez d'ajouter `ADMIN_EMAIL`, redéployez

---

## 🛠️ Commandes Utiles

### Diagnostic Git
```bash
# Voir les commits récents
git log --oneline -5

# Voir les fichiers modifiés
git status

# Voir la branche actuelle
git branch
```

### Test Local
```bash
# Vérifier TypeScript
npx tsc --noEmit

# Tester le build (avec CMD, pas PowerShell)
npm run build

# Lancer en mode production
npm start
```

### Forcer Redéploiement
```bash
# Option 1 : Commit vide
git commit --allow-empty -m "Force redeploy"
git push origin main

# Option 2 : Via Vercel Dashboard
# Deployments → ... → Redeploy (décochez "Use existing Build Cache")
```

---

## 📋 Checklist Rapide

Avant de demander de l'aide :

- [ ] ✅ Script de vérification passé (`node verify-deployment.js`)
- [ ] ✅ Dernier commit sur GitHub (`git log`)
- [ ] ✅ Déploiement Vercel en statut "Ready"
- [ ] ✅ Variables d'environnement dans Vercel
- [ ] ✅ URLs Supabase configurées
- [ ] ✅ Cache navigateur vidé (Ctrl+Shift+R)
- [ ] ✅ Attendu 5 minutes après déploiement
- [ ] ✅ Testé en navigation privée

---

## 🎯 Variables d'Environnement Requises

Dans **Vercel → Settings → Environment Variables**, ajoutez :

| Variable | Exemple | Environnements |
|----------|---------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | All |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `ressources-cours` | All |
| `PERPLEXITY_API_KEY` | `pplx-...` | All |
| `ADMIN_EMAIL` | `biram26@yahoo.fr` | All |

**All** = Production, Preview, Development

---

## 🆘 Besoin d'Aide ?

1. **Logs de build** : Vercel Dashboard → Deployments → Build Logs
2. **Logs de fonction** : Vercel Dashboard → Deployments → Function Logs
3. **Guide complet** : Consultez `DEBUG_VERCEL_DEPLOYMENT.md`
4. **Script de vérification** : `node verify-deployment.js`

---

## 📚 Documentation

- [Guide complet de débogage](DEBUG_VERCEL_DEPLOYMENT.md)
- [Guide de déploiement](DEPLOIEMENT_VERCEL.md)
- [Workflow de déploiement](.agent/workflows/deploy-vercel.md)

---

**Temps de résolution** : 5-15 minutes  
**Difficulté** : Facile

*Guide créé le 30 janvier 2026*
