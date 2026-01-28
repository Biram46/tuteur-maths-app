# 🔧 Comment nettoyer le cache Vercel

Si vous voyez toujours des warnings sur `eslint` dans `next.config.ts` alors que le fichier est propre, c'est que Vercel utilise un cache obsolète.

## Solution 1 : Nettoyer le cache via Vercel Dashboard (RECOMMANDÉ)

1. **Aller sur Vercel Dashboard**
   - Ouvrez : https://vercel.com/dashboard
   - Connectez-vous si nécessaire

2. **Sélectionner votre projet**
   - Cliquez sur votre projet `tuteur-maths-app`

3. **Aller dans les Settings**
   - Cliquez sur l'onglet **"Settings"** en haut

4. **Nettoyer le cache**
   - Dans le menu de gauche, cliquez sur **"General"**
   - Descendez jusqu'à la section **"Build & Development Settings"**
   - Cherchez l'option **"Clear Build Cache"** ou **"Ignore Build Cache"**
   - Cliquez sur le bouton pour nettoyer le cache

5. **Redéployer**
   - Retournez à l'onglet **"Deployments"**
   - Cliquez sur le dernier déploiement
   - Cliquez sur les trois points **"..."** en haut à droite
   - Sélectionnez **"Redeploy"**
   - Cochez l'option **"Use existing Build Cache"** et décochez-la (ou cherchez "Skip Build Cache")
   - Cliquez sur **"Redeploy"**

## Solution 2 : Forcer un redéploiement sans cache

Si l'option ci-dessus n'est pas disponible :

1. **Créer un commit vide**
   ```bash
   git commit --allow-empty -m "chore: force rebuild without cache"
   git push origin main
   ```

2. **Vercel va automatiquement redéployer**

## Solution 3 : Via Vercel CLI

Si vous avez installé Vercel CLI :

```bash
vercel --force
```

## Vérification

Après le redéploiement, vérifiez les logs de build dans Vercel. Les warnings sur `eslint` devraient avoir disparu.

## Note sur le warning "middleware"

Le warning sur `middleware.ts` est normal et n'empêche PAS le déploiement. Next.js recommande d'utiliser le nouveau système de routing, mais `middleware.ts` fonctionne parfaitement. Vous pouvez ignorer ce warning en toute sécurité.

Si vous voulez vraiment le supprimer, nous devrons migrer vers le nouveau système de routing de Next.js 15, ce qui nécessite des changements plus importants dans l'architecture de l'application.
