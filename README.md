# 📚 Tuteur Maths App

Application de tutorat mathématique intelligente propulsée par **Perplexity AI** et **Supabase**.

🌐 **Application en ligne** : [https://tuteur-maths-app.vercel.app/](https://tuteur-maths-app.vercel.app/)

## ✨ Fonctionnalités

- 🤖 **Assistant IA mathématique** - Réponses instantanées aux questions via Perplexity AI Pro
- 📖 **Cours et exercices** - Ressources pédagogiques organisées par niveau (Première Spécialité Maths)
- 👨‍🎓 **Interface élève** - Accès aux cours, exercices interactifs et assistant IA
- 👨‍🏫 **Interface admin** - Gestion des cours, suivi des progrès
- 🔐 **Authentification** - Connexion sécurisée via Supabase Auth
- 💾 **Stockage cloud** - Ressources hébergées sur Supabase Storage
- 📱 **Responsive** - Interface moderne et adaptative
- ✨ **Design futuriste** - Interface premium avec animations et effets visuels

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ installé
- Compte Supabase (gratuit)
- Compte Perplexity Pro avec accès API

### Installation

1. **Cloner le projet**
```bash
git clone https://github.com/Biram46/tuteur-maths-app.git
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
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=ressources-cours

# Perplexity AI
PERPLEXITY_API_KEY=pplx-votre_cle_api

# Admin
ADMIN_EMAIL=votre_email_admin
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
5. Configurez les URLs de redirection (voir [CONFIGURATION_SUPABASE_VERCEL.md](./CONFIGURATION_SUPABASE_VERCEL.md))

## 📁 Structure du projet

```
tuteur-maths-app/
├── app/
│   ├── api/
│   │   ├── perplexity/          # Route API Perplexity
│   │   └── quiz-results/        # Soumission des résultats
│   ├── components/
│   │   ├── MathAssistant.tsx    # Composant assistant IA
│   │   └── StudentClientView.tsx # Vue étudiant
│   ├── admin/                   # Interface administration
│   ├── login/                   # Page de connexion
│   ├── assistant/               # Page assistant IA
│   └── page.tsx                 # Page principale
├── lib/
│   ├── perplexity.ts            # Client Perplexity
│   ├── supabaseClient.ts        # Client Supabase serveur
│   ├── supabaseBrowser.ts       # Client Supabase navigateur
│   └── middleware.ts            # Middleware d'authentification
├── public/
│   ├── resources/               # Ressources de cours (MD, PDF, etc.)
│   └── exos/                    # Exercices interactifs (HTML)
├── middleware.ts                # Middleware Next.js
├── .env.local                   # Variables d'environnement (non versionné)
└── .env.example                 # Exemple de configuration
```

## 🎯 Utilisation

### Connexion

- **Étudiants** : Créez un compte sur la page de login
- **Admin** : Connectez-vous avec l'email admin configuré (par défaut : `biram26@yahoo.fr`)

### Assistant Mathématique

L'assistant IA est accessible via `/assistant` et peut :
- Répondre aux questions de mathématiques
- Expliquer des concepts
- Résoudre des exercices étape par étape
- Fournir des exemples

### Ressources disponibles

**Première Spécialité Maths** :
- Second Degré
- Suites Numériques
- Dérivation
- Produit Scalaire
- Probabilités Conditionnelles

Chaque chapitre contient :
- 📖 Cours (Markdown avec LaTeX)
- 📝 Exercices (PDF, DOCX, LaTeX)
- 🎮 Exercices interactifs (HTML)

## 🛠️ Technologies

- **Framework** : [Next.js 16](https://nextjs.org) (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS 4
- **Backend** : [Supabase](https://supabase.com) (Auth + Storage + Database)
- **IA** : [Perplexity AI](https://www.perplexity.ai) (API Pro)
- **Déploiement** : [Vercel](https://vercel.com)
- **Rendu LaTeX** : KaTeX + react-markdown

## 📚 Documentation

- [Guide Perplexity AI](./PERPLEXITY_GUIDE.md) - Intégration et utilisation de l'API
- [Configuration Supabase + Vercel](./CONFIGURATION_SUPABASE_VERCEL.md) - Configuration post-déploiement
- [Guide de déploiement Vercel](./GUIDE_DEPLOIEMENT_VERCEL.md) - Déploiement pas à pas
- [Guide d'authentification](./AUTHENTIFICATION.md) - Système d'authentification
- [Next.js Docs](https://nextjs.org/docs) - Framework Next.js
- [Supabase Docs](https://supabase.com/docs) - Backend Supabase
- [Perplexity API Docs](https://docs.perplexity.ai) - API Perplexity

## 🚀 Déploiement

### Application en production

L'application est déployée sur Vercel : **https://tuteur-maths-app.vercel.app/**

### Déployer votre propre instance

1. **Forkez le repository**
2. **Connectez à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Importez votre repository
3. **Configurez les variables d'environnement**
   - Ajoutez toutes les variables de `.env.example`
4. **Déployez !**

📖 **Guide complet** : Consultez [GUIDE_DEPLOIEMENT_VERCEL.md](./GUIDE_DEPLOIEMENT_VERCEL.md)

### Tester le build localement

```bash
npm run build  # Construire l'application
npm run start  # Lancer en mode production
```

## 🔐 Sécurité

- ✅ Authentification sécurisée via Supabase Auth
- ✅ Protection des routes admin (accès restreint)
- ✅ Variables d'environnement pour les clés sensibles
- ✅ Middleware de vérification de session
- ✅ Validation des entrées utilisateur

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

## 🆘 Support

Pour toute question ou problème :
- Consultez la documentation dans le dossier du projet
- Ouvrez une issue sur GitHub
- Contactez : biram26@yahoo.fr

## 👨‍💻 Auteur

Développé par Biram46

---

**🌟 N'oubliez pas de mettre une étoile si ce projet vous a été utile !**

