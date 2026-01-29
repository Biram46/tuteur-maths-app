# 🧪 Guide de Test Manuel - Tuteur Maths App

**Date** : 28 janvier 2026  
**URL** : http://localhost:3000  
**Serveur** : ✅ En cours d'exécution

---

## 🎯 Tests à Effectuer

### ✅ Checklist Complète

Cochez chaque test au fur et à mesure :

---

## 1️⃣ Test de la Page d'Accueil

### Actions
1. **Ouvrez** votre navigateur (Chrome, Firefox, Edge, etc.)
2. **Allez sur** : http://localhost:3000
3. **Observez** ce qui s'affiche

### Résultats Attendus
- [ ] La page se charge sans erreur
- [ ] Vous êtes redirigé vers `/login` (si non connecté)
- [ ] Le design est moderne et futuriste
- [ ] Les fonts s'affichent correctement (Orbitron, Inter, Exo 2)
- [ ] Pas d'erreur dans la console du navigateur (F12)

### En Cas de Problème
- **Erreur 500** : Vérifier les logs du serveur
- **Page blanche** : Ouvrir la console (F12) et noter les erreurs
- **Redirection infinie** : Problème de middleware

---

## 2️⃣ Test de la Page de Connexion

### Actions
1. **Vous devriez être sur** : http://localhost:3000/login
2. **Vérifiez** l'interface

### Résultats Attendus
- [ ] Formulaire de connexion visible
- [ ] Champs : Email et Mot de passe
- [ ] Bouton "Se connecter"
- [ ] Lien "Créer un compte"
- [ ] Design futuriste avec animations
- [ ] Pas d'erreur dans la console

### Captures d'Écran Recommandées
- Interface de connexion
- Console du navigateur (F12)

---

## 3️⃣ Test de Création de Compte

### ⚠️ IMPORTANT : Avant ce test

**Vous DEVEZ avoir exécuté le script SQL dans Supabase !**

Si ce n'est pas fait :
1. Allez sur https://supabase.com
2. SQL Editor → New query
3. Copiez le contenu de `supabase_setup_profiles.sql`
4. Exécutez (Run)

### Actions
1. **Cliquez** sur "Créer un compte" (ou allez sur `/login`)
2. **Remplissez** le formulaire :
   - Email : `test@example.com`
   - Mot de passe : `Test123456!`
3. **Cliquez** sur "S'inscrire"

### Résultats Attendus

#### ✅ Si le script SQL a été exécuté
- [ ] Message : "Compte créé ! Veuillez vérifier votre email..."
- [ ] Redirection vers la page de login
- [ ] Pas d'erreur dans la console

#### ❌ Si le script SQL n'a PAS été exécuté
- [ ] Erreur : "Database error saving new user"
- [ ] Pas de redirection
- [ ] Erreur dans la console

### Solution si Erreur
**Consultez** : `QUICK_FIX_GUIDE.md` pour exécuter le script SQL

---

## 4️⃣ Test de Connexion Étudiant

### Prérequis
- Avoir créé un compte avec succès
- OU utiliser un compte existant

### Actions
1. **Allez sur** : http://localhost:3000/login
2. **Remplissez** :
   - Email : `test@example.com`
   - Mot de passe : `Test123456!`
3. **Cliquez** sur "Se connecter"

### Résultats Attendus
- [ ] Connexion réussie
- [ ] Redirection vers la page principale (`/`)
- [ ] Interface élève s'affiche
- [ ] Liste des niveaux visible
- [ ] Pas d'erreur dans la console

---

## 5️⃣ Test de l'Interface Élève

### Actions
1. **Vous devriez voir** :
   - Liste des niveaux scolaires
   - Chapitres pour chaque niveau
   - Ressources pour chaque chapitre

2. **Vérifiez** l'affichage des niveaux :
   - [ ] Seconde (2NDE)
   - [ ] Première Spécialité Maths (1SPE)
   - [ ] Terminale Spécialité Maths (TSPE)
   - [ ] Terminale Maths Expertes (TEXP)

3. **Cliquez** sur "Première Spécialité Maths"

### Résultats Attendus
- [ ] Liste des chapitres s'affiche :
  - Le Second Degré
  - Suites Numériques
  - Dérivation
  - Produit Scalaire
  - Probabilités Conditionnelles
- [ ] Design moderne et responsive
- [ ] Animations fluides

---

## 6️⃣ Test des Ressources

### Actions
1. **Cliquez** sur un chapitre (ex: "Le Second Degré")
2. **Vérifiez** les ressources disponibles

### Résultats Attendus

#### Cours
- [ ] Bouton "Voir le cours" visible
- [ ] Options de téléchargement :
  - [ ] PDF
  - [ ] DOCX
  - [ ] LaTeX

#### Exercices
- [ ] Bouton "Voir les exercices" visible
- [ ] Options de téléchargement :
  - [ ] PDF
  - [ ] DOCX
  - [ ] LaTeX

#### Exercices Interactifs
- [ ] Bouton "Exercices interactifs" visible
- [ ] Clic ouvre l'exercice dans une iframe ou nouvelle page

---

## 7️⃣ Test du Cours Markdown

### Actions
1. **Cliquez** sur "Voir le cours" pour un chapitre
2. **Vérifiez** l'affichage

### Résultats Attendus
- [ ] Le cours s'affiche en Markdown
- [ ] Les formules mathématiques (LaTeX) sont rendues correctement avec KaTeX
- [ ] Exemple : $x^2 + 2x + 1 = 0$ s'affiche comme une formule
- [ ] Le texte est bien formaté
- [ ] Les titres, listes, etc. sont corrects

### Exemple de Formule à Vérifier
Cherchez des formules comme :
- $\Delta = b^2 - 4ac$
- $x = \frac{-b \pm \sqrt{\Delta}}{2a}$

Elles doivent être **bien rendues**, pas affichées comme du texte brut.

---

## 8️⃣ Test des Téléchargements

### Actions
1. **Cliquez** sur un lien de téléchargement (PDF, DOCX, ou LaTeX)

### Résultats Attendus

#### ✅ Si les fichiers existent
- [ ] Le téléchargement démarre
- [ ] Le fichier s'ouvre correctement

#### ⚠️ Si les fichiers n'existent pas
- [ ] Erreur 404 (fichier non trouvé)
- [ ] C'est normal ! Les fichiers doivent être créés

**Note** : Les fichiers de ressources doivent être dans `/public/resources/1ere/`

---

## 9️⃣ Test des Exercices Interactifs

### Actions
1. **Cliquez** sur "Exercices interactifs"
2. **Faites** un exercice
3. **Soumettez** vos réponses

### Résultats Attendus
- [ ] L'exercice s'affiche dans une iframe
- [ ] Les questions sont visibles
- [ ] Vous pouvez répondre
- [ ] Le bouton "Soumettre" fonctionne
- [ ] Le score s'affiche après soumission
- [ ] Le résultat est enregistré dans la base de données

### Vérification de l'Enregistrement
Après avoir fait un exercice, exécutez :
```bash
node check_db_complete.js
```

Vous devriez voir vos résultats dans la section "🎯 Résultats de quiz"

---

## 🔟 Test de l'Assistant IA

### Actions
1. **Allez sur** : http://localhost:3000/assistant
2. **Vérifiez** l'interface

### Résultats Attendus
- [ ] Interface de chat visible
- [ ] Zone de saisie de texte
- [ ] Boutons pour les modes :
  - Question générale
  - Explication de concept
  - Aide sur exercice
- [ ] Design futuriste

### Test d'une Question
1. **Tapez** : "Qu'est-ce qu'une fonction du second degré ?"
2. **Cliquez** sur "Envoyer"

### Résultats Attendus
- [ ] La question s'affiche
- [ ] Indicateur de chargement
- [ ] Réponse de l'IA s'affiche
- [ ] Réponse en français
- [ ] Sources citées (si disponibles)
- [ ] Pas d'erreur dans la console

### En Cas d'Erreur
- **Erreur API** : Vérifier que `PERPLEXITY_API_KEY` est dans `.env.local`
- **Pas de réponse** : Vérifier les logs du serveur

---

## 1️⃣1️⃣ Test de l'Interface Admin

### Actions
1. **Déconnectez-vous** (si connecté)
2. **Allez sur** : http://localhost:3000/admin/login
3. **Connectez-vous** avec l'email admin : `biram26@yahoo.fr`

### Résultats Attendus
- [ ] Page de connexion admin s'affiche
- [ ] Connexion réussie
- [ ] Redirection vers `/admin`
- [ ] Dashboard admin s'affiche

### Interface Admin
- [ ] Liste des niveaux
- [ ] Liste des chapitres
- [ ] Liste des ressources
- [ ] Boutons CRUD (Create, Read, Update, Delete)
- [ ] Formulaires d'ajout/modification
- [ ] Design futuriste avec animations

---

## 1️⃣2️⃣ Test de Sécurité

### Test 1 : Accès Non Authentifié
1. **Déconnectez-vous**
2. **Essayez** d'accéder à : http://localhost:3000/

**Résultat attendu** :
- [ ] Redirection automatique vers `/login`

### Test 2 : Accès Admin Restreint
1. **Connectez-vous** avec un compte étudiant (pas `biram26@yahoo.fr`)
2. **Essayez** d'accéder à : http://localhost:3000/admin

**Résultat attendu** :
- [ ] Redirection vers `/` ou `/login`
- [ ] Pas d'accès au dashboard admin

### Test 3 : Accès Admin Autorisé
1. **Connectez-vous** avec `biram26@yahoo.fr`
2. **Allez sur** : http://localhost:3000/admin

**Résultat attendu** :
- [ ] Accès autorisé
- [ ] Dashboard admin s'affiche

---

## 📊 Résumé des Tests

### ✅ Tests Réussis
Notez ici les tests qui ont fonctionné :
- [ ] Page d'accueil
- [ ] Page de connexion
- [ ] Création de compte
- [ ] Connexion étudiant
- [ ] Interface élève
- [ ] Affichage des niveaux/chapitres
- [ ] Cours Markdown + LaTeX
- [ ] Téléchargements
- [ ] Exercices interactifs
- [ ] Assistant IA
- [ ] Interface admin
- [ ] Sécurité

### ❌ Tests Échoués
Notez ici les tests qui ont échoué et les erreurs :

```
Test : _______________
Erreur : _______________
Console : _______________
```

---

## 🐛 Problèmes Courants et Solutions

### Problème 1 : "Database error saving new user"
**Solution** : Exécuter `supabase_setup_profiles.sql` dans Supabase  
**Guide** : `QUICK_FIX_GUIDE.md`

### Problème 2 : Erreur 404 sur les téléchargements
**Cause** : Fichiers de ressources manquants  
**Solution** : Créer les fichiers dans `/public/resources/1ere/`

### Problème 3 : Formules LaTeX non rendues
**Cause** : KaTeX non chargé  
**Solution** : Vérifier que KaTeX est importé dans le composant

### Problème 4 : Assistant IA ne répond pas
**Cause** : Clé API Perplexity manquante ou invalide  
**Solution** : Vérifier `PERPLEXITY_API_KEY` dans `.env.local`

### Problème 5 : Redirection infinie
**Cause** : Problème de middleware  
**Solution** : Vérifier les logs du serveur

---

## 📝 Rapport de Test

### Informations Système
- **Date** : _______________
- **Navigateur** : _______________
- **Version** : _______________
- **OS** : Windows

### Résultats Globaux
- **Tests réussis** : ___ / 12
- **Tests échoués** : ___ / 12
- **Problèmes critiques** : _______________

### Notes
```
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## 🚀 Prochaines Actions

Après avoir effectué tous les tests :

1. **Si tout fonctionne** ✅
   - Commit et push vers GitHub
   - Créer les fichiers de ressources manquants
   - Migrer le middleware

2. **Si des problèmes** ❌
   - Noter les erreurs
   - Consulter la documentation
   - Exécuter `node check_db_complete.js`
   - Vérifier les logs du serveur

---

**Bon test ! 🧪**

---

*Guide créé le 28 janvier 2026*
