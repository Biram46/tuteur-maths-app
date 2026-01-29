# 🧪 Test d'Authentification - Déploiement Vercel

**Date** : 29 janvier 2026  
**Objectif** : Vérifier que l'authentification fonctionne correctement après le déploiement sur Vercel

---

## 📋 Prérequis

Avant de commencer les tests, assurez-vous que :

- ✅ L'application est déployée sur Vercel
- ✅ Vous avez l'URL de production (ex: `https://tuteur-maths-app.vercel.app`)
- ✅ Les variables d'environnement sont configurées dans Vercel
- ✅ L'URL Vercel est ajoutée dans Supabase (Authentication > URL Configuration)
- ✅ Le compte admin `biram26@yahoo.fr` existe dans Supabase

---

## 🌐 Étape 1 : Vérification de l'URL de Production

### 1.1 Obtenir l'URL Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `tuteur-maths-app`
3. Cliquez sur **"Visit"** ou copiez l'URL de production

**Format attendu** :
```
https://tuteur-maths-app.vercel.app
```
ou
```
https://tuteur-maths-app-[votre-username].vercel.app
```

### 1.2 Vérifier la Configuration Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Authentication** > **URL Configuration**
4. Vérifiez que **Site URL** contient votre URL Vercel
5. Vérifiez que **Redirect URLs** contient :
   ```
   https://votre-url.vercel.app/auth/callback
   https://votre-url.vercel.app/**
   ```

---

## 🧪 Test 1 : Redirection Automatique vers Login

### Objectif
Vérifier que les utilisateurs non authentifiés sont redirigés vers la page de connexion.

### Étapes

1. **Ouvrez un navigateur en mode navigation privée** (pour éviter les cookies)
2. Allez sur : `https://votre-url.vercel.app`
3. **Résultat attendu** :
   - ✅ Redirection automatique vers `/login`
   - ✅ Page de connexion élève s'affiche
   - ✅ Design cyan/fuchsia visible

### Test des autres routes

Testez également ces URLs (toutes doivent rediriger vers `/login`) :

| URL | Redirection Attendue |
|-----|---------------------|
| `/` | → `/login` |
| `/assistant` | → `/login` |
| `/admin` | → `/admin/login` |
| `/admin/dashboard` | → `/admin/login` |

### ✅ Validation

- [ ] Toutes les routes protégées redirigent correctement
- [ ] Pas d'erreur 404
- [ ] Pas d'erreur de serveur (500)

---

## 🧪 Test 2 : Inscription Élève

### Objectif
Vérifier que les nouveaux élèves peuvent créer un compte.

### Étapes

1. Allez sur : `https://votre-url.vercel.app/login`
2. Cliquez sur l'onglet **"INSCRIPTION"**
3. Remplissez le formulaire :
   - **Email** : `test.eleve.vercel@exemple.com`
   - **Mot de passe** : `TestVercel123!`
4. Cliquez sur **"Créer Nouvel Accès"**

### Résultats Attendus

**Scénario A : Email de confirmation activé**
- ✅ Message : "Vérifiez votre email pour confirmer votre compte"
- ✅ Email reçu dans la boîte de réception
- ✅ Lien de confirmation fonctionne
- ✅ Après confirmation, redirection vers `/`

**Scénario B : Confirmation automatique**
- ✅ Redirection immédiate vers `/`
- ✅ Interface élève s'affiche
- ✅ Pas d'erreur

### Vérification dans Supabase

1. Allez sur https://supabase.com/dashboard
2. **Authentication** > **Users**
3. Vérifiez que `test.eleve.vercel@exemple.com` apparaît dans la liste

### ✅ Validation

- [ ] Inscription réussie
- [ ] Email de confirmation reçu (si activé)
- [ ] Compte visible dans Supabase
- [ ] Pas d'erreur dans la console du navigateur

---

## 🧪 Test 3 : Connexion Élève

### Objectif
Vérifier que les élèves peuvent se connecter avec leurs identifiants.

### Étapes

1. **Déconnectez-vous** si vous êtes connecté
2. Allez sur : `https://votre-url.vercel.app/login`
3. Restez sur l'onglet **"CONNEXION"**
4. Remplissez :
   - **Email** : `test.eleve.vercel@exemple.com`
   - **Mot de passe** : `TestVercel123!`
5. Cliquez sur **"Initialiser Connexion"**

### Résultats Attendus

- ✅ Redirection vers `/` (page principale élève)
- ✅ Interface élève s'affiche avec :
  - Liste des niveaux scolaires
  - Assistant IA accessible
  - Bouton de déconnexion
- ✅ Pas d'erreur

### Test de Persistance

1. **Rafraîchissez la page** (F5)
2. **Résultat attendu** :
   - ✅ Vous restez connecté
   - ✅ Pas de redirection vers `/login`

### ✅ Validation

- [ ] Connexion réussie
- [ ] Interface élève accessible
- [ ] Session persistante après rafraîchissement
- [ ] Pas d'erreur dans la console

---

## 🧪 Test 4 : Accès Admin - Refusé

### Objectif
Vérifier qu'un élève ne peut PAS accéder à l'espace admin.

### Étapes

1. **Connectez-vous en tant qu'élève** (test.eleve.vercel@exemple.com)
2. Tapez manuellement dans la barre d'adresse :
   ```
   https://votre-url.vercel.app/admin
   ```
3. Appuyez sur Entrée

### Résultats Attendus

- ✅ Redirection automatique vers `/admin/login`
- ✅ Message : "Accès refusé. Seul le professeur peut se connecter ici."
- ✅ Pas d'accès au dashboard admin

### ✅ Validation

- [ ] Élève redirigé vers `/admin/login`
- [ ] Message d'erreur affiché
- [ ] Pas d'accès au contenu admin

---

## 🧪 Test 5 : Connexion Admin - Email Incorrect

### Objectif
Vérifier que seul `biram26@yahoo.fr` peut accéder à l'espace admin.

### Étapes

1. **Déconnectez-vous** complètement
2. Allez sur : `https://votre-url.vercel.app/admin/login`
3. Remplissez :
   - **Email** : `autre.prof@exemple.com` (PAS biram26@yahoo.fr)
   - **Mot de passe** : `nimportequoi`
4. Cliquez sur **"🔐 Accès Admin"**

### Résultats Attendus

- ✅ Message d'erreur rouge : "Accès refusé. Seul le professeur peut se connecter ici."
- ✅ Reste sur `/admin/login`
- ✅ Pas de redirection

### ✅ Validation

- [ ] Message d'erreur affiché
- [ ] Accès refusé
- [ ] Pas de redirection

---

## 🧪 Test 6 : Connexion Admin - Succès

### Objectif
Vérifier que le professeur (`biram26@yahoo.fr`) peut accéder à l'espace admin.

### Prérequis

⚠️ **IMPORTANT** : Le compte `biram26@yahoo.fr` doit exister dans Supabase.

**Si le compte n'existe pas encore** :

1. Allez sur https://supabase.com/dashboard
2. **Authentication** > **Users** > **Add User**
3. Remplissez :
   - Email : `biram26@yahoo.fr`
   - Password : `[votre mot de passe sécurisé]`
4. **Cochez** "Auto Confirm User"
5. Cliquez sur "Create User"

### Étapes

1. **Déconnectez-vous** complètement
2. Allez sur : `https://votre-url.vercel.app/admin/login`
3. Remplissez :
   - **Email** : `biram26@yahoo.fr`
   - **Mot de passe** : `[votre mot de passe]`
4. Cliquez sur **"🔐 Accès Admin"**

### Résultats Attendus

- ✅ Redirection automatique vers `/admin`
- ✅ Dashboard admin s'affiche avec :
  - Gestion des niveaux
  - Gestion des chapitres
  - Gestion des ressources
  - Interface futuriste orange/rouge
- ✅ Pas d'erreur

### Test de Persistance

1. **Rafraîchissez la page** (F5)
2. **Résultat attendu** :
   - ✅ Vous restez connecté
   - ✅ Dashboard admin toujours accessible

### ✅ Validation

- [ ] Connexion admin réussie
- [ ] Dashboard admin accessible
- [ ] Session persistante
- [ ] Pas d'erreur

---

## 🧪 Test 7 : Déconnexion

### Objectif
Vérifier que la déconnexion fonctionne correctement.

### Test 7.1 : Déconnexion Élève

1. **Connectez-vous en tant qu'élève**
2. Trouvez le bouton **"Déconnexion"** (généralement en haut à droite)
3. Cliquez dessus
4. **Résultat attendu** :
   - ✅ Redirection vers `/login`
   - ✅ Session terminée
   - ✅ Impossible d'accéder à `/` sans se reconnecter

### Test 7.2 : Déconnexion Admin

1. **Connectez-vous en tant qu'admin**
2. Trouvez le bouton **"Déconnexion"**
3. Cliquez dessus
4. **Résultat attendu** :
   - ✅ Redirection vers `/admin/login`
   - ✅ Session terminée
   - ✅ Impossible d'accéder à `/admin` sans se reconnecter

### ✅ Validation

- [ ] Déconnexion élève fonctionne
- [ ] Déconnexion admin fonctionne
- [ ] Sessions correctement terminées

---

## 🧪 Test 8 : Sécurité des Routes

### Objectif
Vérifier que toutes les routes sont correctement protégées.

### Routes à Tester

| Route | Utilisateur Non Connecté | Élève Connecté | Admin Connecté |
|-------|-------------------------|----------------|----------------|
| `/` | → `/login` | ✅ Accessible | → `/admin` |
| `/login` | ✅ Accessible | → `/` | → `/admin` |
| `/assistant` | → `/login` | ✅ Accessible | ✅ Accessible |
| `/admin` | → `/admin/login` | → `/admin/login` | ✅ Accessible |
| `/admin/login` | ✅ Accessible | → `/` | → `/admin` |

### Étapes

1. **Testez chaque route** dans les 3 scénarios :
   - Non connecté (navigation privée)
   - Connecté en tant qu'élève
   - Connecté en tant qu'admin

2. **Vérifiez les redirections** selon le tableau ci-dessus

### ✅ Validation

- [ ] Toutes les redirections fonctionnent correctement
- [ ] Pas d'accès non autorisé
- [ ] Middleware fonctionne en production

---

## 🧪 Test 9 : Variables d'Environnement

### Objectif
Vérifier que toutes les variables d'environnement sont correctement configurées.

### Vérification dans Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. **Settings** > **Environment Variables**
4. Vérifiez que TOUTES ces variables sont présentes :

| Variable | Présente ? | Environnement |
|----------|-----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ⬜ | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⬜ | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | Production |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | ⬜ | Production |
| `PERPLEXITY_API_KEY` | ⬜ | Production |
| `ADMIN_EMAIL` | ⬜ | Production |

### Test Fonctionnel

1. **Testez l'assistant IA** (nécessite `PERPLEXITY_API_KEY`)
   - Allez sur `/assistant`
   - Posez une question mathématique
   - Vérifiez que la réponse s'affiche

2. **Testez l'upload de fichiers** (nécessite les clés Supabase)
   - Connectez-vous en tant qu'admin
   - Essayez d'uploader un fichier
   - Vérifiez qu'il apparaît dans Supabase Storage

### ✅ Validation

- [ ] Toutes les variables sont configurées
- [ ] Assistant IA fonctionne
- [ ] Upload de fichiers fonctionne

---

## 🧪 Test 10 : Performance et Logs

### Objectif
Vérifier que l'application fonctionne sans erreur en production.

### Vérification des Logs Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. **Deployments** > Cliquez sur le dernier déploiement
4. Cliquez sur **"View Function Logs"**

### Recherchez les Erreurs

Filtrez les logs pour :
- ❌ Erreurs 500 (erreurs serveur)
- ❌ Erreurs 404 (pages non trouvées)
- ❌ Erreurs d'authentification
- ❌ Erreurs Supabase

### Console du Navigateur

1. Ouvrez la console du navigateur (F12)
2. Naviguez dans l'application
3. Vérifiez qu'il n'y a **aucune erreur rouge**

### ✅ Validation

- [ ] Pas d'erreur dans les logs Vercel
- [ ] Pas d'erreur dans la console du navigateur
- [ ] Temps de chargement acceptable (< 3 secondes)

---

## 📊 Checklist Complète de Test

### Authentification Élève
- [ ] Inscription élève fonctionne
- [ ] Email de confirmation reçu (si activé)
- [ ] Connexion élève fonctionne
- [ ] Session élève persistante
- [ ] Déconnexion élève fonctionne

### Authentification Admin
- [ ] Accès admin refusé pour les élèves
- [ ] Accès admin refusé pour les emails non autorisés
- [ ] Connexion admin réussie avec `biram26@yahoo.fr`
- [ ] Session admin persistante
- [ ] Déconnexion admin fonctionne

### Sécurité
- [ ] Routes protégées redirigent correctement
- [ ] Middleware fonctionne en production
- [ ] Pas d'accès non autorisé

### Configuration
- [ ] Toutes les variables d'environnement configurées
- [ ] URL Vercel ajoutée dans Supabase
- [ ] Redirect URLs configurées

### Performance
- [ ] Pas d'erreur dans les logs Vercel
- [ ] Pas d'erreur dans la console
- [ ] Temps de chargement acceptable

---

## 🐛 Dépannage

### Problème 1 : Redirection Infinie

**Symptôme** : La page se recharge en boucle

**Causes possibles** :
- URL Vercel non configurée dans Supabase
- Redirect URLs incorrectes

**Solution** :
1. Vérifiez la configuration Supabase (Authentication > URL Configuration)
2. Ajoutez votre URL Vercel exacte
3. Attendez 5 minutes (propagation)
4. Videz le cache du navigateur

### Problème 2 : Erreur "Invalid JWT"

**Symptôme** : Erreur d'authentification après connexion

**Causes possibles** :
- Clés Supabase incorrectes dans Vercel
- Mismatch entre les environnements

**Solution** :
1. Vérifiez les variables d'environnement dans Vercel
2. Comparez avec les clés dans Supabase Dashboard
3. Redéployez l'application après correction

### Problème 3 : Email de Confirmation Non Reçu

**Symptôme** : Pas d'email après inscription

**Causes possibles** :
- Email dans les spams
- Configuration SMTP Supabase

**Solution** :
1. Vérifiez les spams
2. Dans Supabase : Authentication > Email Templates
3. Vérifiez que les templates sont activés
4. Ou désactivez la confirmation email (pour les tests)

### Problème 4 : Accès Admin Refusé

**Symptôme** : Impossible de se connecter en tant qu'admin

**Causes possibles** :
- Compte `biram26@yahoo.fr` n'existe pas
- Variable `ADMIN_EMAIL` incorrecte

**Solution** :
1. Vérifiez que le compte existe dans Supabase
2. Vérifiez la variable `ADMIN_EMAIL` dans Vercel
3. Redéployez si nécessaire

### Problème 5 : Assistant IA Ne Répond Pas

**Symptôme** : Pas de réponse de l'assistant IA

**Causes possibles** :
- Clé Perplexity invalide ou expirée
- Variable `PERPLEXITY_API_KEY` manquante

**Solution** :
1. Vérifiez votre clé sur https://www.perplexity.ai/settings/api
2. Vérifiez la variable dans Vercel
3. Vérifiez les logs Vercel pour les erreurs API

---

## 📈 Rapport de Test

Après avoir effectué tous les tests, remplissez ce rapport :

### Informations de Déploiement

- **URL de production** : `_______________________________`
- **Date du déploiement** : `_______________________________`
- **Version déployée** : `_______________________________`

### Résultats des Tests

| Test | Statut | Notes |
|------|--------|-------|
| Redirection automatique | ⬜ OK / ⬜ KO | |
| Inscription élève | ⬜ OK / ⬜ KO | |
| Connexion élève | ⬜ OK / ⬜ KO | |
| Accès admin refusé (élève) | ⬜ OK / ⬜ KO | |
| Accès admin refusé (email incorrect) | ⬜ OK / ⬜ KO | |
| Connexion admin réussie | ⬜ OK / ⬜ KO | |
| Déconnexion | ⬜ OK / ⬜ KO | |
| Protection des routes | ⬜ OK / ⬜ KO | |
| Variables d'environnement | ⬜ OK / ⬜ KO | |
| Performance et logs | ⬜ OK / ⬜ KO | |

### Problèmes Identifiés

```
[Listez ici les problèmes rencontrés]
```

### Temps de Réponse

- **Page de login** : `_____` secondes
- **Dashboard élève** : `_____` secondes
- **Dashboard admin** : `_____` secondes
- **Assistant IA** : `_____` secondes

---

## ✅ Validation Finale

L'authentification est considérée comme **OPÉRATIONNELLE** si :

- ✅ Tous les tests sont au statut "OK"
- ✅ Aucune erreur dans les logs Vercel
- ✅ Temps de réponse < 3 secondes
- ✅ Toutes les redirections fonctionnent
- ✅ Admin et élèves ont des accès distincts

---

## 🎯 Prochaines Étapes

### Si Tous les Tests Passent ✅

1. **Documenter l'URL de production**
2. **Créer des comptes de test** pour les utilisateurs
3. **Monitorer les logs** pendant 24h
4. **Tester sur différents appareils** (mobile, tablette)
5. **Partager l'URL** avec les premiers utilisateurs

### Si Des Tests Échouent ❌

1. **Noter les erreurs précises**
2. **Consulter les logs Vercel**
3. **Vérifier la configuration Supabase**
4. **Corriger les problèmes**
5. **Redéployer**
6. **Retester**

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Logs Vercel** : https://vercel.com/dashboard
2. **Logs Supabase** : https://supabase.com/dashboard
3. **Documentation Vercel** : https://vercel.com/docs
4. **Documentation Supabase Auth** : https://supabase.com/docs/guides/auth

---

**Bon test ! Votre application est prête à être testée en production ! 🚀**

*Guide créé le 29 janvier 2026*
