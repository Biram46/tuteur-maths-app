# 🚀 Guide Rapide de Déploiement Vercel

## ✅ Étape 1 : Code poussé sur GitHub
Le code a été poussé avec succès sur GitHub !

## 📋 Étape 2 : Déployer sur Vercel

### Option 1 : Via l'interface web (RECOMMANDÉ pour la première fois)

1. **Aller sur Vercel**
   - Ouvrez votre navigateur
   - Allez sur : https://vercel.com
   - Cliquez sur "Sign Up" ou "Log In"
   - Connectez-vous avec votre compte GitHub

2. **Importer le projet**
   - Une fois connecté, cliquez sur le bouton **"Add New..."** en haut à droite
   - Sélectionnez **"Project"**
   - Vous verrez la liste de vos repositories GitHub
   - Cherchez **"tuteur-maths-app"**
   - Cliquez sur **"Import"** à côté du repository

3. **Configurer le projet**
   - **Project Name** : `tuteur-maths-app` (ou un nom de votre choix)
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Root Directory** : `./` (laisser par défaut)
   - **Build Command** : `next build` (laisser par défaut)
   - **Output Directory** : `.next` (laisser par défaut)

4. **⚠️ IMPORTANT : Ajouter les variables d'environnement**
   
   Cliquez sur **"Environment Variables"** pour les déplier, puis ajoutez UNE PAR UNE les variables suivantes :

   **Variable 1 :**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://yhicloevjgwpvlmzoifx.supabase.co`
   - Environment: Cochez **Production**, **Preview**, et **Development**

   **Variable 2 :**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWNsb2V2amd3cHZsbXpvaWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgyOTksImV4cCI6MjA4NDA4NDI5OX0.JzbFl3B3znUNZxaYxGgQnaFcO6zWKIN5-QgmplOZvRY`
   - Environment: Cochez **Production**, **Preview**, et **Development**

   **Variable 3 :**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWNsb2V2amd3cHZsbXpvaWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUwODI5OSwiZXhwIjoyMDg0MDg0Mjk5fQ.QKY4WXemY88Kb1tyLG1iIXDr9yAm8o9T_MHS0JAXMt8`
   - Environment: Cochez **Production**, **Preview**, et **Development**

   **Variable 4 :**
   - Name: `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
   - Value: `ressources-cours`
   - Environment: Cochez **Production**, **Preview**, et **Development**

   **Variable 5 :**
   - Name: `PERPLEXITY_API_KEY`
   - Value: `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`
   - Environment: Cochez **Production**, **Preview**, et **Development**

   **Variable 6 :**
   - Name: `ADMIN_EMAIL`
   - Value: `biram26@yahoo.fr`
   - Environment: Cochez **Production**, **Preview**, et **Development**

5. **Déployer**
   - Une fois toutes les variables ajoutées, cliquez sur le bouton **"Deploy"**
   - Attendez que le déploiement se termine (environ 2-5 minutes)
   - Vous verrez une animation de confettis quand c'est terminé ! 🎉

6. **Récupérer l'URL de production**
   - Une fois le déploiement terminé, vous verrez votre URL de production
   - Elle ressemblera à : `https://tuteur-maths-app.vercel.app` ou `https://tuteur-maths-app-xxx.vercel.app`
   - **COPIEZ CETTE URL** - vous en aurez besoin pour l'étape suivante

---

## 🔧 Étape 3 : Configurer Supabase

Maintenant que votre app est déployée, vous devez configurer Supabase pour accepter les connexions depuis votre URL Vercel.

1. **Aller sur Supabase**
   - Ouvrez : https://supabase.com
   - Connectez-vous à votre compte
   - Sélectionnez votre projet (celui avec l'URL `yhicloevjgwpvlmzoifx.supabase.co`)

2. **Configurer les URLs d'authentification**
   - Dans le menu de gauche, cliquez sur **"Authentication"** (icône de cadenas)
   - Cliquez sur **"URL Configuration"**
   
3. **Modifier le Site URL**
   - Dans le champ **"Site URL"**, remplacez l'URL actuelle par votre URL Vercel
   - Exemple : `https://tuteur-maths-app.vercel.app`

4. **Ajouter les Redirect URLs**
   - Dans le champ **"Redirect URLs"**, ajoutez les URLs suivantes (une par ligne) :
   ```
   https://votre-url-vercel.vercel.app/*
   https://votre-url-vercel.vercel.app/auth/callback
   https://votre-url-vercel.vercel.app/login
   http://localhost:3000/*
   http://localhost:3000/auth/callback
   ```
   - Remplacez `votre-url-vercel` par votre vraie URL Vercel

5. **Sauvegarder**
   - Cliquez sur **"Save"** en bas de la page

---

## ✅ Étape 4 : Tester votre application

1. **Ouvrir l'application**
   - Allez sur votre URL Vercel dans votre navigateur
   - Exemple : `https://tuteur-maths-app.vercel.app`

2. **Tester la connexion étudiant**
   - Vous devriez voir la page de login
   - Créez un compte étudiant ou connectez-vous
   - Vérifiez que vous pouvez accéder aux cours et exercices

3. **Tester la connexion admin**
   - Déconnectez-vous
   - Connectez-vous avec : `biram26@yahoo.fr`
   - Vous devriez accéder au dashboard admin

4. **Tester l'assistant AI**
   - Connectez-vous en tant qu'étudiant
   - Testez l'assistant AI en posant une question de maths

---

## 🎯 Mises à jour futures

Pour déployer des mises à jour à l'avenir :

1. Faites vos modifications dans le code
2. Committez et poussez sur GitHub :
   ```bash
   git add .
   git commit -m "Description des changements"
   git push origin main
   ```
3. Vercel redéploiera automatiquement ! 🚀

---

## 🆘 Aide en cas de problème

### L'application ne se charge pas
- Vérifiez les logs dans Vercel Dashboard → votre projet → "Logs"
- Vérifiez que toutes les variables d'environnement sont bien définies

### Erreur de connexion
- Vérifiez que les URLs de redirection sont correctement configurées dans Supabase
- Vérifiez que l'URL Vercel est bien ajoutée dans Supabase

### L'assistant AI ne fonctionne pas
- Vérifiez que `PERPLEXITY_API_KEY` est bien définie dans Vercel
- Vérifiez les logs pour voir s'il y a des erreurs d'API

### Les ressources ne se chargent pas
- Vérifiez que `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` est bien défini
- Vérifiez les permissions du bucket dans Supabase Storage

---

## 📞 Support

- **Documentation Vercel** : https://vercel.com/docs
- **Documentation Supabase** : https://supabase.com/docs
- **Support Vercel** : https://vercel.com/support

---

**Bon déploiement ! 🚀**
