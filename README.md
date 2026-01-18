# 📚 Tuteur Maths App

Application de tutorat mathématique intelligente propulsée par **Perplexity AI** et **Supabase**.

## ✨ Fonctionnalités

- 🤖 **Assistant IA mathématique** - Réponses instantanées aux questions via Perplexity AI Pro
- 📖 **Cours et exercices** - Ressources pédagogiques organisées par niveau
- 👨‍🎓 **Interface élève** - Accès aux cours, exercices interactifs et assistant IA
- 👨‍🏫 **Interface admin** - Gestion des cours, suivi des progrès
- 🔐 **Authentification** - Connexion sécurisée via Supabase Auth
- 💾 **Stockage cloud** - Ressources hébergées sur Supabase Storage
- 📱 **Responsive** - Interface moderne et adaptative

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ installé
- Compte Supabase (gratuit)
- Compte Perplexity Pro avec accès API

### Installation

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd tuteur-maths-app
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez `.env.example` vers `.env.local` :
```bash
cp .env.example .env.local
```

Puis éditez `.env.local` avec vos clés :
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service

# Perplexity AI
PERPLEXITY_API_KEY=pplx-votre_cle_api
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🔧 Configuration

### Obtenir votre clé API Perplexity

1. Connectez-vous sur [Perplexity AI](https://www.perplexity.ai)
2. Accédez à [Settings > API](https://www.perplexity.ai/settings/api)
3. Générez une nouvelle clé API
4. Copiez la clé dans `.env.local`

📖 **Guide complet** : Consultez [PERPLEXITY_GUIDE.md](./PERPLEXITY_GUIDE.md)

### Configurer Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Récupérez vos clés API dans Settings > API
3. Créez un bucket de stockage nommé `ressources-cours`
4. Configurez l'authentification (Email/Password)

## 📁 Structure du projet

```
tuteur-maths-app/
├── app/
│   ├── api/
│   │   └── perplexity/          # Route API Perplexity
│   ├── components/
│   │   └── MathAssistant.tsx    # Composant assistant IA
│   ├── admin/                   # Interface administration
│   └── page.tsx                 # Page principale
├── lib/
│   └── perplexity.ts            # Client Perplexity
├── .env.local                   # Variables d'environnement (non versionné)
├── .env.example                 # Exemple de configuration
└── PERPLEXITY_GUIDE.md          # Guide d'intégration Perplexity
```

## 🎯 Utilisation

### Assistant Mathématique

Importez et utilisez le composant `MathAssistant` :

```tsx
import MathAssistant from '@/app/components/MathAssistant';

export default function Page() {
  return <MathAssistant />;
}
```

### Fonctions Perplexity

```tsx
import { askPerplexity, explainConcept } from '@/lib/perplexity';

// Poser une question
const response = await askPerplexity("Comment résoudre x² = 4 ?");

// Expliquer un concept
const explanation = await explainConcept("Les dérivées", "Terminale");
```

## 🛠️ Technologies

- **Framework** : [Next.js 16](https://nextjs.org) (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Backend** : [Supabase](https://supabase.com) (Auth + Storage + Database)
- **IA** : [Perplexity AI](https://www.perplexity.ai) (API Pro)
- **Déploiement** : Vercel

## 📚 Documentation

- [Guide Perplexity AI](./PERPLEXITY_GUIDE.md) - Intégration et utilisation de l'API
- [Next.js Docs](https://nextjs.org/docs) - Framework Next.js
- [Supabase Docs](https://supabase.com/docs) - Backend Supabase
- [Perplexity API Docs](https://docs.perplexity.ai) - API Perplexity

## 🚀 Déploiement

### Déployer sur Vercel

1. Connectez votre repo GitHub à [Vercel](https://vercel.com)
2. Configurez les variables d'environnement dans Vercel
3. Déployez !

```bash
npm run build  # Tester le build localement
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

## 🆘 Support

Pour toute question ou problème :
- Consultez [PERPLEXITY_GUIDE.md](./PERPLEXITY_GUIDE.md)
- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement
