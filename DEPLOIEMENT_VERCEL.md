# 🚀 Guide de Déploiement Vercel - Tuteur Maths App

**Date** : 28 janvier 2026  
**Objectif** : Déployer l'application sur Vercel et la rendre accessible en ligne

---

## 📋 Prérequis

Avant de déployer, assurez-vous d'avoir :

- ✅ Un compte GitHub (pour héberger le code)
- ✅ Un compte Vercel (gratuit sur https://vercel.com)
- ✅ Les variables d'environnement Supabase
- ✅ La clé API Perplexity

---

## 🔧 Étape 1 : Préparer le Projet

### 1.1 Vérifier que tout est commité

```bash
# Vérifier l'état Git
git status

# Ajouter tous les fichiers
git add .

# Commiter les changements
git commit -m "Préparation déploiement Vercel - Authentification complète"
```

### 1.2 Pousser vers GitHub

```bash
# Pousser vers GitHub
git push origin main
```

**⚠️ Si vous n'avez pas encore de repository GitHub** :

1. Allez sur https://github.com
2. Cliquez sur "New repository"
3. Nom : `tuteur-maths-app`
4. Visibilité : Private (recommandé)
5. Ne cochez PAS "Initialize with README"
6. Cliquez sur "Create repository"

Puis dans votre terminal :
```bash
git remote add origin https://github.com/VOTRE_USERNAME/tuteur-maths-app.git
git branch -M main
git push -u origin main
```

---

## 🌐 Étape 2 : Déployer sur Vercel

### 2.1 Créer un compte Vercel

1. Allez sur https://vercel.com
2. Cliquez sur "Sign Up"
3. Choisissez "Continue with GitHub"
4. Autorisez Vercel à accéder à votre GitHub

### 2.2 Importer le Projet

1. Sur le dashboard Vercel, cliquez sur **"Add New..."** > **"Project"**
2. Trouvez votre repository `tuteur-maths-app`
3. Cliquez sur **"Import"**

### 2.3 Configurer le Projet

**Framework Preset** : Next.js (détecté automatiquement)

**Build Settings** :
- Build Command : `npm run build` (par défaut)
- Output Directory : `.next` (par défaut)
- Install Command : `npm install` (par défaut)

**Root Directory** : `.` (par défaut)

---

## 🔐 Étape 3 : Configurer les Variables d'Environnement

**TRÈS IMPORTANT** : Avant de déployer, ajoutez vos variables d'environnement.

### 3.1 Dans l'interface Vercel

1. Cliquez sur **"Environment Variables"**
2. Ajoutez les variables suivantes :

#### **Variables Supabase**

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://votre-projet.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (votre clé anon) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (votre clé service) | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `ressources-cours` | Production, Preview, Development |

#### **Variable Perplexity**

| Name | Value | Environment |
|------|-------|-------------|
| `PERPLEXITY_API_KEY` | `pplx-...` (votre clé API) | Production, Preview, Development |

#### **Variable Admin**

| Name | Value | Environment |
|------|-------|-------------|
| `ADMIN_EMAIL` | `biram26@yahoo.fr` | Production, Preview, Development |

### 3.2 Où trouver vos clés Supabase ?

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 3.3 Où trouver votre clé Perplexity ?

1. Allez sur https://www.perplexity.ai/settings/api
2. Copiez votre clé API → `PERPLEXITY_API_KEY`

---

## 🚀 Étape 4 : Déployer !

1. Une fois les variables d'environnement configurées
2. Cliquez sur **"Deploy"**
3. Attendez que le build se termine (2-5 minutes)

Vous verrez :
```
Building...
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Deployment Complete!
```

---

## 🎉 Étape 5 : Accéder à Votre Site

### 5.1 URL de Production

Vercel vous donnera une URL comme :
```
https://tuteur-maths-app.vercel.app
```

ou

```
https://tuteur-maths-app-votre-username.vercel.app
```

### 5.2 Tester l'Application

1. Cliquez sur **"Visit"** ou ouvrez l'URL
2. Vous devriez être redirigé vers `/login`
3. Testez la connexion élève
4. Testez la connexion professeur (`biram26@yahoo.fr`)

---

## 🔧 Configuration Supabase pour la Production

### 6.1 Ajouter le domaine Vercel dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Authentication** > **URL Configuration**
4. Ajoutez votre URL Vercel dans **Site URL** :
   ```
   https://tuteur-maths-app.vercel.app
   ```

5. Ajoutez aussi dans **Redirect URLs** :
   ```
   https://tuteur-maths-app.vercel.app/auth/callback
   https://tuteur-maths-app.vercel.app/**
   ```

### 6.2 Configurer les Emails

Dans **Authentication** > **Email Templates**, vérifiez que les liens de confirmation pointent vers votre domaine Vercel.

---

## 🎨 Étape 7 : Nom de Domaine Personnalisé (Optionnel)

Si vous voulez un nom de domaine personnalisé (ex: `tuteur-maths.com`) :

1. Dans Vercel, allez dans **Settings** > **Domains**
2. Cliquez sur **"Add"**
3. Entrez votre domaine
4. Suivez les instructions pour configurer les DNS

---

## 📊 Monitoring et Logs

### Voir les Logs

1. Dans Vercel, allez dans **Deployments**
2. Cliquez sur votre déploiement
3. Cliquez sur **"View Function Logs"**

### Analytics

Vercel fournit des analytics gratuits :
- Nombre de visiteurs
- Pages les plus visitées
- Performance

---

## 🐛 Dépannage

### Problème 1 : Build Failed

**Cause** : Erreur de compilation

**Solution** :
1. Vérifiez les logs de build dans Vercel
2. Testez localement : `npm run build`
3. Corrigez les erreurs
4. Poussez les corrections sur GitHub
5. Vercel redéploiera automatiquement

### Problème 2 : Variables d'environnement manquantes

**Cause** : Variables non configurées

**Solution** :
1. Allez dans **Settings** > **Environment Variables**
2. Vérifiez que toutes les variables sont présentes
3. Cliquez sur **"Redeploy"** après avoir ajouté les variables

### Problème 3 : Erreur d'authentification

**Cause** : URL Supabase mal configurée

**Solution** :
1. Vérifiez que l'URL Vercel est dans Supabase
2. Vérifiez les Redirect URLs
3. Attendez quelques minutes (propagation DNS)

### Problème 4 : 404 sur certaines pages

**Cause** : Problème de routing

**Solution** :
1. Vérifiez que le middleware est bien déployé
2. Vérifiez les logs Vercel
3. Testez localement en mode production :
   ```bash
   npm run build
   npm start
   ```

---

## ✅ Checklist de Déploiement

Avant de déployer, vérifiez :

- [ ] Code commité et poussé sur GitHub
- [ ] Variables d'environnement configurées dans Vercel
- [ ] URL Vercel ajoutée dans Supabase
- [ ] Compte `biram26@yahoo.fr` existe dans Supabase
- [ ] Build local réussi (`npm run build`)
- [ ] Tous les tests passent localement

---

## 🔄 Mises à Jour Futures

Pour mettre à jour votre site après le déploiement :

1. Faites vos modifications localement
2. Testez : `npm run dev`
3. Commitez : `git add . && git commit -m "Description"`
4. Poussez : `git push origin main`
5. **Vercel déploiera automatiquement** ! 🎉

---

## 📈 Optimisations Post-Déploiement

### Performance

1. **Activer Edge Functions** (dans Vercel Settings)
2. **Configurer le cache** pour les ressources statiques
3. **Optimiser les images** avec Next.js Image

### Sécurité

1. **Activer HTTPS** (automatique avec Vercel)
2. **Configurer CSP** (Content Security Policy)
3. **Rate limiting** pour l'API Perplexity

### Monitoring

1. **Configurer Sentry** pour le tracking d'erreurs
2. **Activer Vercel Analytics**
3. **Surveiller les coûts** Perplexity

---

## 💰 Coûts

### Vercel

- **Hobby Plan** : Gratuit
  - Bande passante : 100 GB/mois
  - Builds : Illimités
  - Domaine personnalisé : Oui

- **Pro Plan** : $20/mois
  - Plus de bande passante
  - Plus de membres d'équipe
  - Analytics avancés

### Supabase

- **Free Plan** : Gratuit
  - 500 MB base de données
  - 1 GB stockage fichiers
  - 50,000 utilisateurs actifs/mois

### Perplexity

- Selon votre plan Pro
- Surveillez l'usage sur https://www.perplexity.ai/settings/api

---

## 🎯 URLs Importantes

| Service | URL |
|---------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Perplexity API** | https://www.perplexity.ai/settings/api |
| **GitHub Repo** | https://github.com/VOTRE_USERNAME/tuteur-maths-app |
| **Votre Site** | https://tuteur-maths-app.vercel.app |

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Documentation Vercel** : https://vercel.com/docs
2. **Documentation Next.js** : https://nextjs.org/docs/deployment
3. **Support Vercel** : https://vercel.com/support

---

**Prêt à déployer ? Suivez les étapes ci-dessus ! 🚀**

*Guide créé le 28 janvier 2026*
