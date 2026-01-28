# Guide de Déploiement sur Vercel

## Prérequis
- Un compte Vercel (gratuit)
- Un compte GitHub
- Le projet doit être poussé sur GitHub

## Étape 1 : Préparer le projet

### 1.1 Vérifier que tous les fichiers sont commités
```bash
git status
git add .
git commit -m "Préparation pour déploiement Vercel"
git push origin main
```

### 1.2 Vérifier le fichier package.json
Le fichier `package.json` doit contenir les scripts suivants :
- `"build": "next build"`
- `"start": "next start"`

✅ Ces scripts sont déjà présents dans le projet.

## Étape 2 : Déployer sur Vercel

### Option A : Via l'interface web Vercel (Recommandé)

1. **Aller sur Vercel**
   - Visitez [vercel.com](https://vercel.com)
   - Connectez-vous avec votre compte GitHub

2. **Importer le projet**
   - Cliquez sur "Add New..." → "Project"
   - Sélectionnez votre repository `tuteur-maths-app`
   - Cliquez sur "Import"

3. **Configurer le projet**
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Root Directory** : `./` (par défaut)
   - **Build Command** : `next build` (par défaut)
   - **Output Directory** : `.next` (par défaut)

4. **Ajouter les variables d'environnement**
   
   Dans la section "Environment Variables", ajoutez les variables suivantes :

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yhicloevjgwpvlmzoifx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWNsb2V2amd3cHZsbXpvaWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgyOTksImV4cCI6MjA4NDA4NDI5OX0.JzbFl3B3znUNZxaYxGgQnaFcO6zWKIN5-QgmplOZvRY
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWNsb2V2amd3cHZsbXpvaWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODI5OSwiZXhwIjoyMDg0MDg0Mjk5fQ.QKY4WXemY88Kb1tyLG1iIXDr9yAm8o9T_MHS0JAXMt8
   NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=ressources-cours
   PERPLEXITY_API_KEY=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
   ADMIN_EMAIL=biram26@yahoo.fr
   ```

   **Important** : Ajoutez ces variables pour tous les environnements (Production, Preview, Development)

5. **Déployer**
   - Cliquez sur "Deploy"
   - Attendez que le déploiement se termine (environ 2-5 minutes)

### Option B : Via Vercel CLI

1. **Installer Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Se connecter**
   ```bash
   vercel login
   ```

3. **Déployer**
   ```bash
   vercel
   ```

4. **Configurer les variables d'environnement**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
   vercel env add PERPLEXITY_API_KEY
   vercel env add ADMIN_EMAIL
   ```

5. **Redéployer avec les variables**
   ```bash
   vercel --prod
   ```

## Étape 3 : Configurer Supabase

Une fois le déploiement terminé, vous obtiendrez une URL de production (ex: `https://tuteur-maths-app.vercel.app`)

1. **Aller dans Supabase Dashboard**
   - Visitez [supabase.com](https://supabase.com)
   - Sélectionnez votre projet

2. **Configurer l'authentification**
   - Allez dans "Authentication" → "URL Configuration"
   - **Site URL** : `https://votre-app.vercel.app`
   - **Redirect URLs** : Ajoutez :
     ```
     https://votre-app.vercel.app/auth/callback
     https://votre-app.vercel.app/login
     https://votre-app.vercel.app/*
     ```

3. **Sauvegarder les modifications**

## Étape 4 : Vérifier le déploiement

1. **Tester l'application**
   - Visitez votre URL de production
   - Testez la connexion étudiant
   - Testez la connexion admin avec `biram26@yahoo.fr`
   - Vérifiez que les ressources se chargent correctement
   - Testez l'assistant AI

2. **Vérifier les logs**
   - Dans Vercel Dashboard → votre projet → "Logs"
   - Vérifiez qu'il n'y a pas d'erreurs

## Dépannage

### Erreur de build
- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez les logs de build dans Vercel

### Erreur d'authentification
- Vérifiez que les URLs de redirection sont correctement configurées dans Supabase
- Vérifiez que les variables d'environnement sont correctement définies

### Erreur 500
- Vérifiez les logs de fonction dans Vercel
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est définie

### Les ressources ne se chargent pas
- Vérifiez que `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` est correctement défini
- Vérifiez les permissions du bucket dans Supabase Storage

## Mises à jour futures

Pour déployer des mises à jour :
1. Committez et poussez vos changements sur GitHub
2. Vercel redéploiera automatiquement

Ou utilisez :
```bash
vercel --prod
```

## URLs importantes

- **Dashboard Vercel** : https://vercel.com/dashboard
- **Documentation Vercel** : https://vercel.com/docs
- **Support Vercel** : https://vercel.com/support
