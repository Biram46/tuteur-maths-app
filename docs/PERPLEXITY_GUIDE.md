# 🚀 Intégration Perplexity AI - Guide Complet

## 📋 Vue d'ensemble

Votre application de tutorat mathématique est maintenant configurée pour utiliser **Perplexity AI Pro**. Cette intégration vous permet d'offrir à vos élèves un assistant IA intelligent capable de :

- ✅ Répondre aux questions mathématiques
- ✅ Expliquer des concepts complexes
- ✅ Aider à résoudre des exercices
- ✅ Générer de nouveaux exercices
- ✅ Fournir des sources et citations

---

## 🔧 Configuration

### Étape 1 : Obtenir votre clé API Perplexity

1. Connectez-vous à votre compte **Perplexity Pro** sur [https://www.perplexity.ai](https://www.perplexity.ai)
2. Accédez aux paramètres API : [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
3. Cliquez sur **"Generate API Key"**
4. Copiez la clé générée (elle commence par `pplx-`)

### Étape 2 : Configurer la clé API

1. Ouvrez le fichier `.env.local` dans votre projet
2. Remplacez `your_perplexity_api_key_here` par votre vraie clé API :

```bash
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. **Important** : Ne partagez JAMAIS cette clé publiquement !

### Étape 3 : Redémarrer le serveur de développement

```bash
npm run dev
```

---

## 📁 Fichiers créés

### 1. `/app/api/perplexity/route.ts`
Route API Next.js qui communique avec Perplexity AI.

**Fonctionnalités** :
- Gestion sécurisée de la clé API (côté serveur uniquement)
- Support du contexte mathématique
- Gestion des erreurs
- Retour des citations et sources

### 2. `/lib/perplexity.ts`
Client TypeScript avec des fonctions utilitaires.

**Fonctions disponibles** :
- `askPerplexity(message, context?)` - Question générale
- `explainConcept(concept, level?)` - Explication de concept
- `getExerciseHelp(exercise, studentAnswer?)` - Aide aux exercices
- `generateExercises(topic, difficulty, count)` - Génération d'exercices

### 3. `/app/components/MathAssistant.tsx`
Composant React prêt à l'emploi avec interface utilisateur.

**Caractéristiques** :
- 3 modes : Question générale, Explication de concept, Aide exercice
- Interface moderne et responsive
- Affichage des citations et sources
- Gestion du chargement et des erreurs

---

## 💡 Utilisation

### Option 1 : Utiliser le composant MathAssistant

Dans n'importe quelle page de votre application :

```tsx
import MathAssistant from '@/app/components/MathAssistant';

export default function Page() {
  return (
    <div>
      <h1>Besoin d'aide ?</h1>
      <MathAssistant />
    </div>
  );
}
```

### Option 2 : Utiliser les fonctions directement

```tsx
import { askPerplexity, explainConcept } from '@/lib/perplexity';

// Exemple 1 : Poser une question
const response = await askPerplexity(
  "Comment résoudre une équation du second degré ?",
  "Niveau Terminale"
);

// Exemple 2 : Expliquer un concept
const explanation = await explainConcept(
  "Les dérivées",
  "Première"
);

// Exemple 3 : Aide sur un exercice
const help = await getExerciseHelp(
  "Résoudre : 2x² + 5x - 3 = 0",
  "J'ai trouvé x = 1/2 mais je ne suis pas sûr"
);
```

### Option 3 : Appeler directement l'API

```tsx
const response = await fetch('/api/perplexity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explique-moi les limites en mathématiques",
    context: "Niveau Terminale S"
  })
});

const data = await response.json();
console.log(data.response);
```

---

## 🎯 Cas d'usage recommandés

### 1. **Assistant de cours**
Intégrez l'assistant dans vos pages de cours pour permettre aux élèves de poser des questions en temps réel.

### 2. **Aide aux exercices**
Ajoutez un bouton "Obtenir de l'aide" sur chaque exercice qui utilise `getExerciseHelp()`.

### 3. **Glossaire intelligent**
Créez un glossaire où cliquer sur un terme mathématique appelle `explainConcept()`.

### 4. **Générateur d'exercices**
Permettez aux enseignants de générer automatiquement des exercices avec `generateExercises()`.

### 5. **Chatbot mathématique**
Créez un chat persistant où les élèves peuvent avoir une conversation continue sur un sujet.

---

## 📊 Modèles Perplexity disponibles

Vous utilisez actuellement : **`llama-3.1-sonar-large-128k-online`**

Autres modèles disponibles :
- `llama-3.1-sonar-small-128k-online` - Plus rapide, moins cher
- `llama-3.1-sonar-huge-128k-online` - Plus puissant (Pro uniquement)

Pour changer de modèle, modifiez la ligne dans `/app/api/perplexity/route.ts` :
```typescript
model: 'llama-3.1-sonar-large-128k-online'
```

---

## 💰 Tarification Perplexity

Avec **Perplexity Pro** :
- Accès à tous les modèles
- Limite quotidienne généreuse
- Coût par token très compétitif

Surveillez votre utilisation sur : [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)

---

## 🔒 Sécurité

✅ **Bonnes pratiques implémentées** :
- La clé API est stockée côté serveur uniquement (pas exposée au client)
- Utilisation de variables d'environnement
- Validation des entrées utilisateur
- Gestion des erreurs

⚠️ **À faire** :
- Ajoutez une limitation de taux (rate limiting) pour éviter les abus
- Implémentez un système de cache pour réduire les coûts
- Ajoutez une authentification pour limiter l'accès

---

## 🐛 Dépannage

### Erreur : "Clé API Perplexity non configurée"
➡️ Vérifiez que `PERPLEXITY_API_KEY` est bien définie dans `.env.local`

### Erreur : "Unauthorized" (401)
➡️ Votre clé API est invalide ou expirée. Générez-en une nouvelle.

### Erreur : "Rate limit exceeded"
➡️ Vous avez dépassé votre quota. Attendez ou passez à un plan supérieur.

### Les réponses sont en anglais
➡️ Le prompt système force le français. Vérifiez `/app/api/perplexity/route.ts`.

---

## 🚀 Prochaines étapes

1. **Testez l'intégration** :
   ```bash
   npm run dev
   ```
   Puis visitez une page avec le composant `MathAssistant`

2. **Personnalisez le prompt système** dans `/app/api/perplexity/route.ts` pour adapter le ton et le style

3. **Ajoutez l'assistant** à vos pages existantes

4. **Créez des fonctionnalités avancées** :
   - Historique des conversations
   - Sauvegarde des questions/réponses
   - Système de notation des réponses
   - Génération de quiz personnalisés

---

## 📚 Ressources

- [Documentation Perplexity API](https://docs.perplexity.ai/)
- [Exemples de prompts](https://docs.perplexity.ai/guides/prompting)
- [Tarification](https://www.perplexity.ai/settings/api)

---

## ✨ Exemple complet

Voici un exemple d'intégration dans votre page principale :

```tsx
// app/page.tsx
import MathAssistant from '@/app/components/MathAssistant';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto py-12">
        <h1 className="text-4xl font-bold text-center mb-8">
          Tuteur Maths - Propulsé par IA
        </h1>
        
        <MathAssistant />
      </div>
    </main>
  );
}
```

---

**Besoin d'aide ?** N'hésitez pas à consulter les fichiers créés ou à poser des questions !
