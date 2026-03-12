# ⚡ Guide de démarrage rapide - Perplexity AI

## 🎯 Objectif

Configurer et tester l'intégration Perplexity AI en **moins de 10 minutes** !

---

## ✅ Checklist de démarrage

- [ ] **Étape 1** : Obtenir la clé API Perplexity (2 min)
- [ ] **Étape 2** : Configurer `.env.local` (1 min)
- [ ] **Étape 3** : Démarrer le serveur (1 min)
- [ ] **Étape 4** : Tester l'API (2 min)
- [ ] **Étape 5** : Tester l'interface (2 min)
- [ ] **Étape 6** : Poser votre première question (2 min)

**Temps total : ~10 minutes**

---

## 📋 Étape 1 : Obtenir la clé API (2 min)

### Actions :

1. **Connectez-vous** à Perplexity AI
   ```
   🔗 https://www.perplexity.ai
   ```

2. **Accédez aux paramètres API**
   ```
   🔗 https://www.perplexity.ai/settings/api
   ```

3. **Générez une clé**
   - Cliquez sur "Generate API Key"
   - Donnez-lui un nom : `tuteur-maths-app`
   - Copiez la clé (commence par `pplx-`)

### ✅ Vérification :
```
Vous avez une clé qui ressemble à :
pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📋 Étape 2 : Configurer .env.local (1 min)

### Actions :

1. **Ouvrez** le fichier `.env.local`

2. **Trouvez** la ligne :
   ```bash
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

3. **Remplacez** par votre vraie clé :
   ```bash
   PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Sauvegardez** le fichier

### ✅ Vérification :
```bash
# Votre .env.local devrait contenir :
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=ressources-cours

# Perplexity API Configuration
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📋 Étape 3 : Démarrer le serveur (1 min)

### Actions :

1. **Ouvrez** un terminal dans le dossier du projet

2. **Exécutez** :
   ```bash
   npm run dev
   ```

3. **Attendez** le message :
   ```
   ✓ Ready in Xs
   ○ Local: http://localhost:3000
   ```

### ✅ Vérification :
```
Le serveur tourne sur http://localhost:3000
```

---

## 📋 Étape 4 : Tester l'API (2 min)

### Option A : Via le navigateur

1. **Visitez** :
   ```
   http://localhost:3000/api/test-perplexity
   ```

2. **Vérifiez** la réponse JSON :
   ```json
   {
     "success": true,
     "message": "✅ Tous les tests sont passés !",
     "tests": [
       {
         "name": "Configuration de la clé API",
         "status": "passed",
         "message": "Clé API configurée (pplx-xxxxx...)"
       },
       {
         "name": "Connexion à l'API Perplexity",
         "status": "passed",
         "message": "Connexion réussie (XXXms) - Réponse: \"OK\""
       },
       {
         "name": "Route API locale /api/perplexity",
         "status": "passed",
         "message": "Route API fonctionnelle"
       }
     ],
     "summary": {
       "total": 3,
       "passed": 3,
       "failed": 0
     }
   }
   ```

### Option B : Via curl

```bash
curl http://localhost:3000/api/test-perplexity
```

### ✅ Vérification :
```
✓ "success": true
✓ "passed": 3
✓ "failed": 0
```

---

## 📋 Étape 5 : Tester l'interface (2 min)

### Actions :

1. **Visitez** :
   ```
   http://localhost:3000/assistant
   ```

2. **Observez** l'interface :
   - ✓ Header "Tuteur Maths"
   - ✓ Badge "IA Active" (vert)
   - ✓ 3 cartes d'information
   - ✓ Composant assistant avec 3 onglets
   - ✓ Exemples de questions

### ✅ Vérification :
```
L'interface s'affiche correctement
Les 3 onglets sont cliquables
```

---

## 📋 Étape 6 : Poser votre première question (2 min)

### Actions :

1. **Sélectionnez** un onglet (ex: "Question générale")

2. **Tapez** une question simple :
   ```
   Comment résoudre x² = 9 ?
   ```

3. **Cliquez** sur "Obtenir de l'aide"

4. **Attendez** la réponse (2-5 secondes)

5. **Lisez** la réponse de l'IA

### Exemple de réponse attendue :

```
💡 Réponse :

Pour résoudre l'équation x² = 9, voici les étapes :

1. On cherche les valeurs de x telles que x² = 9
2. On prend la racine carrée des deux côtés : x = ±√9
3. Donc x = ±3

Les solutions sont : x = 3 ou x = -3

Vérification :
- 3² = 9 ✓
- (-3)² = 9 ✓

📚 Sources :
- source1.com
- source2.com

Tokens utilisés: 150
```

### ✅ Vérification :
```
✓ La réponse s'affiche
✓ Elle est en français
✓ Elle contient une explication claire
✓ Des sources sont citées (optionnel)
```

---

## 🎉 Félicitations !

Vous avez réussi à :
- ✅ Configurer Perplexity AI
- ✅ Tester l'API
- ✅ Utiliser l'interface
- ✅ Obtenir votre première réponse

---

## 🚀 Et maintenant ?

### Option 1 : Explorer les fonctionnalités

Testez les 3 modes :
1. **Question générale** : "Qu'est-ce qu'une fonction affine ?"
2. **Expliquer concept** : "Les dérivées"
3. **Aide exercice** : "Résoudre 2x + 5 = 13"

### Option 2 : Intégrer dans votre app

```tsx
// Dans n'importe quelle page
import MathAssistant from '@/app/components/MathAssistant';

export default function MaPage() {
  return (
    <div>
      <h1>Mes cours</h1>
      <MathAssistant />
    </div>
  );
}
```

### Option 3 : Utiliser les fonctions

```tsx
import { askPerplexity } from '@/lib/perplexity';

const handleHelp = async () => {
  const response = await askPerplexity(
    "Comment calculer une limite ?",
    "Niveau Terminale"
  );
  console.log(response.response);
};
```

### Option 4 : Personnaliser

Modifiez :
- **Design** : `app/components/MathAssistant.tsx`
- **Prompts** : `app/api/perplexity/route.ts`
- **Modèle** : Changez `llama-3.1-sonar-large-128k-online`

---

## 📚 Documentation complète

Pour aller plus loin :

| Document | Contenu |
|----------|---------|
| `PERPLEXITY_GUIDE.md` | Guide complet (250+ lignes) |
| `NEXT_STEPS.md` | Idées et améliorations (300+ lignes) |
| `ARCHITECTURE.md` | Diagrammes et architecture |
| `INTEGRATION_COMPLETE.md` | Récapitulatif du projet |

---

## 🐛 Problèmes courants

### ❌ "Clé API non configurée"

**Solution** :
1. Vérifiez `.env.local`
2. Redémarrez le serveur (`Ctrl+C` puis `npm run dev`)

### ❌ "Unauthorized (401)"

**Solution** :
1. Votre clé est invalide
2. Générez une nouvelle clé sur Perplexity
3. Vérifiez votre compte Pro

### ❌ "Rate limit exceeded"

**Solution** :
1. Vous avez dépassé le quota
2. Attendez la réinitialisation
3. Implémentez un cache

### ❌ Réponses en anglais

**Solution** :
1. Le prompt force le français
2. Vérifiez `app/api/perplexity/route.ts`
3. Ligne 30 : `Réponds toujours en français`

---

## 💡 Astuces

### Pour de meilleures réponses :

1. **Soyez précis** dans vos questions
   - ❌ "Les maths"
   - ✅ "Comment résoudre une équation du second degré ?"

2. **Indiquez le niveau**
   - ❌ "Explique les dérivées"
   - ✅ "Explique les dérivées niveau Terminale"

3. **Demandez des exemples**
   - ❌ "C'est quoi une limite ?"
   - ✅ "C'est quoi une limite ? Donne-moi un exemple"

4. **Posez des questions de suivi**
   - "Peux-tu détailler l'étape 2 ?"
   - "Donne-moi un autre exemple"

---

## 📊 Monitoring

Surveillez votre usage sur :
```
🔗 https://www.perplexity.ai/settings/api
```

Vous y trouverez :
- Nombre de requêtes
- Tokens consommés
- Coût estimé
- Limite quotidienne

---

## 🎯 Checklist finale

Avant de déployer en production :

- [ ] Clé API configurée
- [ ] Tests passent (3/3)
- [ ] Interface fonctionne
- [ ] Réponses en français
- [ ] Build réussi (`npm run build`)
- [ ] Variables d'environnement sur Vercel
- [ ] Rate limiting implémenté (optionnel)
- [ ] Authentification activée (optionnel)
- [ ] Monitoring configuré

---

## 🚀 Déploiement rapide

```bash
# 1. Build local
npm run build

# 2. Tester le build
npm start

# 3. Déployer sur Vercel
git add .
git commit -m "Add Perplexity AI integration"
git push

# 4. Configurer les variables sur Vercel
# Dashboard > Settings > Environment Variables
# Ajouter : PERPLEXITY_API_KEY
```

---

**Besoin d'aide ?**

- 📖 Consultez la documentation complète
- 🔍 Testez avec `/api/test-perplexity`
- 💬 Ouvrez une issue sur GitHub

---

**Bon développement ! 🎉**

*Guide de démarrage rapide v1.0*  
*Temps estimé : 10 minutes*  
*Difficulté : ⭐⭐☆☆☆*
