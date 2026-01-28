---
description: Déployer l'application sur Vercel
---

# Workflow de Déploiement Vercel

Ce workflow guide le déploiement de l'application Tuteur Maths sur Vercel.

## Étapes

### 1. Vérifier l'état du projet
```bash
git status
```

### 2. Committer tous les changements
// turbo
```bash
git add .
```

// turbo
```bash
git commit -m "Préparation pour déploiement"
```

### 3. Pousser sur GitHub
// turbo
```bash
git push origin main
```

### 4. Déployer sur Vercel

**Option A : Via l'interface web (Première fois)**

1. Aller sur https://vercel.com
2. Se connecter avec GitHub
3. Cliquer sur "Add New..." → "Project"
4. Sélectionner le repository `tuteur-maths-app`
5. Cliquer sur "Import"
6. Ajouter les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
   - `PERPLEXITY_API_KEY`
   - `ADMIN_EMAIL`
7. Cliquer sur "Deploy"

**Option B : Via CLI (Déploiements suivants)**

// turbo
```bash
vercel --prod
```

### 5. Configurer Supabase (Première fois uniquement)

1. Aller sur https://supabase.com
2. Sélectionner le projet
3. Aller dans "Authentication" → "URL Configuration"
4. Ajouter l'URL Vercel dans :
   - Site URL
   - Redirect URLs

### 6. Vérifier le déploiement

1. Visiter l'URL de production
2. Tester la connexion
3. Tester les fonctionnalités principales
4. Vérifier les logs dans Vercel Dashboard

## Variables d'environnement requises

```
NEXT_PUBLIC_SUPABASE_URL=https://yhicloevjgwpvlmzoifx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWNsb2V2amd3cHZsbXpvaWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgyOTksImV4cCI6MjA4NDA4NDI5OX0.JzbFl3B3znUNZxaYxGgQnaFcO6zWKIN5-QgmplOZvRY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWNsb2V2amd3cHZsbXpvaWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODI5OSwiZXhwIjoyMDg0MDg0Mjk5fQ.QKY4WXemY88Kb1tyLG1iIXDr9yAm8o9T_MHS0JAXMt8
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=ressources-cours
PERPLEXITY_API_KEY=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
ADMIN_EMAIL=biram26@yahoo.fr
```

## Dépannage

- **Erreur de build** : Vérifier les logs dans Vercel Dashboard
- **Erreur 500** : Vérifier que toutes les variables d'environnement sont définies
- **Problème d'auth** : Vérifier les URLs de redirection dans Supabase
