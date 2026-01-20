# 🚀 Guide de Déploiement Vercel

## Prérequis

✅ Compte Vercel
✅ Compte Supabase (base de données)
✅ Clés API configurées

## Étapes de Déploiement

### 1. Configuration des Variables d'Environnement sur Vercel

Allez sur votre projet Vercel → Settings → Environment Variables et ajoutez :

```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role_supabase
PERPLEXITY_API_KEY=votre_clé_perplexity (optionnel)
```

### 2. Déploiement

#### Option A : Déploiement Automatique (Recommandé)
1. Mergez cette PR dans `main`
2. Vercel détecte automatiquement les changements
3. Le déploiement démarre automatiquement

#### Option B : Déploiement Manuel
```bash
npm install -g vercel
vercel --prod
```

### 3. Vérifications Post-Déploiement

✅ Vérifiez que le site est accessible
✅ Testez l'authentification
✅ Testez l'upload d'images (OCR)
✅ Vérifiez les logs Vercel pour les erreurs

## Problèmes Courants

### Erreur : "Missing environment variables"
➡️ Vérifiez que toutes les variables sont configurées dans Vercel

### Erreur : "Function timeout"
➡️ L'OCR peut prendre du temps. Le timeout est configuré à 60s dans vercel.json

### Erreur : "Module not found: tesseract.js"
➡️ Le module est configuré comme externe dans next.config.ts

### Erreur de Build TypeScript
➡️ Exécutez `npm run build` localement pour identifier les erreurs

## Configuration Locale

Pour tester en local avant déploiement :

```bash
# 1. Copier le fichier d'exemple
cp .env.example .env.local

# 2. Remplir vos vraies clés dans .env.local

# 3. Installer les dépendances
npm install

# 4. Lancer en mode développement
npm run dev

# 5. Tester le build de production
npm run build
npm start
```

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs Vercel
2. Vérifiez les logs de la console navigateur
3. Créez une issue GitHub avec les détails de l'erreur
