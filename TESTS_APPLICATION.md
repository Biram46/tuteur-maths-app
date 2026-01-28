# ✅ Tests de l'Application - Guide Complet

## 📍 Vous êtes ici : Tests de l'application déployée

**Prérequis** : Configuration Supabase terminée ✅

**Temps estimé** : 15-20 minutes

---

## 🎯 Objectif

Tester toutes les fonctionnalités de l'application pour s'assurer qu'elle fonctionne correctement en production.

---

## 📋 Checklist des Tests

### ✅ Test 1 : Accès à l'application (2 minutes)

**Objectif** : Vérifier que l'application est accessible

**Actions** :
1. Ouvrez votre navigateur (Chrome, Firefox, Safari, Edge)
2. Allez sur : **https://tuteur-maths-app.vercel.app/**
3. Attendez que la page se charge

**Résultat attendu** :
- ✅ La page de login s'affiche
- ✅ Le design est correct (interface futuriste)
- ✅ Pas d'erreur dans la console (F12 pour ouvrir)

**Si ça ne fonctionne pas** :
- Vérifiez votre connexion internet
- Essayez en navigation privée
- Videz le cache du navigateur (Ctrl+Shift+Delete)

---

### ✅ Test 2 : Création de compte étudiant (5 minutes)

**Objectif** : Créer un compte étudiant et se connecter

**Actions** :
1. Sur la page de login, cherchez le bouton **"S'inscrire"** ou **"Sign Up"**
2. Cliquez dessus
3. Remplissez le formulaire :
   - **Email** : Utilisez un vrai email (vous recevrez un email de confirmation)
   - **Mot de passe** : Minimum 6 caractères
4. Cliquez sur **"S'inscrire"** ou **"Sign Up"**
5. **Vérifiez votre boîte email**
6. **Cliquez sur le lien de confirmation** dans l'email
7. **Retournez sur l'application** et connectez-vous

**Résultat attendu** :
- ✅ Email de confirmation reçu
- ✅ Compte créé avec succès
- ✅ Redirection vers le dashboard étudiant
- ✅ Vous voyez l'interface étudiant avec les niveaux disponibles

**Si ça ne fonctionne pas** :
- Vérifiez que l'email de confirmation n'est pas dans les spams
- Vérifiez que Supabase est bien configuré (voir `CONFIGURATION_SUPABASE_ETAPE_PAR_ETAPE.md`)
- Essayez avec un autre email

**📸 Capture d'écran** : Prenez une capture du dashboard étudiant

---

### ✅ Test 3 : Navigation des ressources (5 minutes)

**Objectif** : Vérifier que les cours et exercices se chargent correctement

**Actions** :
1. Sur le dashboard étudiant, **sélectionnez "Première Spécialité Maths"**
2. **Sélectionnez un chapitre** (ex: "Second Degré")
3. **Vérifiez que le cours s'affiche** avec les formules mathématiques
4. **Cliquez sur "Exercices"**
5. **Testez le téléchargement** d'un fichier PDF ou DOCX
6. **Cliquez sur "Exercices Interactifs"**
7. **Lancez un exercice interactif** (HTML)

**Résultat attendu** :
- ✅ Les niveaux s'affichent correctement
- ✅ Les chapitres se chargent
- ✅ Le cours s'affiche avec les formules LaTeX bien rendues
- ✅ Les exercices sont téléchargeables
- ✅ Les exercices interactifs se lancent dans un iframe

**Si ça ne fonctionne pas** :
- Vérifiez que les ressources sont bien uploadées dans Supabase Storage
- Vérifiez les permissions du bucket `ressources-cours`
- Regardez la console (F12) pour voir les erreurs

**📸 Capture d'écran** : Prenez une capture d'un cours avec formules LaTeX

---

### ✅ Test 4 : Exercice interactif et soumission (3 minutes)

**Objectif** : Tester un exercice interactif et la soumission du résultat

**Actions** :
1. **Lancez un exercice interactif** (ex: Second Degré)
2. **Répondez aux questions** de l'exercice
3. **Terminez l'exercice**
4. **Vérifiez que le résultat est soumis** automatiquement

**Résultat attendu** :
- ✅ L'exercice se charge dans un iframe
- ✅ Les questions sont interactives
- ✅ Le résultat est calculé
- ✅ Le résultat est envoyé à la base de données (message de confirmation)

**Si ça ne fonctionne pas** :
- Vérifiez que l'exercice HTML contient le code de soumission
- Vérifiez les logs dans la console
- Vérifiez que la table `quiz_results` existe dans Supabase

---

### ✅ Test 5 : Assistant IA (5 minutes)

**Objectif** : Tester l'assistant mathématique IA

**Actions** :
1. Dans le menu, **cliquez sur "Assistant IA"** ou allez sur `/assistant`
2. **Posez une question simple** :
   - Exemple : "Comment résoudre x² + 2x + 1 = 0 ?"
3. **Attendez la réponse**
4. **Posez une question plus complexe** :
   - Exemple : "Explique-moi le théorème de Pythagore avec un exemple"
5. **Testez une question de cours** :
   - Exemple : "Qu'est-ce qu'une suite arithmétique ?"

**Résultat attendu** :
- ✅ L'assistant répond rapidement (< 5 secondes)
- ✅ Les réponses sont pertinentes et correctes
- ✅ Les formules mathématiques sont bien formatées
- ✅ L'interface est fluide et agréable

**Si ça ne fonctionne pas** :
- Vérifiez que `PERPLEXITY_API_KEY` est bien configurée dans Vercel
- Vérifiez les logs Vercel pour voir les erreurs
- Vérifiez que vous n'avez pas dépassé le quota Perplexity

**📸 Capture d'écran** : Prenez une capture d'une réponse de l'assistant

---

### ✅ Test 6 : Déconnexion et reconnexion (2 minutes)

**Objectif** : Vérifier que la déconnexion fonctionne

**Actions** :
1. **Cliquez sur le bouton de déconnexion** (généralement en haut à droite)
2. **Vérifiez que vous êtes redirigé** vers la page de login
3. **Reconnectez-vous** avec vos identifiants
4. **Vérifiez que vous accédez** au dashboard

**Résultat attendu** :
- ✅ Déconnexion réussie
- ✅ Redirection vers /login
- ✅ Reconnexion réussie
- ✅ Session maintenue

---

### ✅ Test 7 : Accès admin (3 minutes)

**Objectif** : Vérifier l'accès au dashboard admin

**Actions** :
1. **Déconnectez-vous** du compte étudiant
2. **Allez sur** : https://tuteur-maths-app.vercel.app/admin/login
3. **Connectez-vous avec** : `biram26@yahoo.fr` (et votre mot de passe)
4. **Vérifiez que vous accédez** au dashboard admin
5. **Testez la navigation** dans l'interface admin

**Résultat attendu** :
- ✅ Accès au dashboard admin
- ✅ Interface admin s'affiche correctement
- ✅ Vous pouvez voir les niveaux, chapitres, ressources
- ✅ Les statistiques s'affichent (si implémentées)

**Si ça ne fonctionne pas** :
- Vérifiez que `ADMIN_EMAIL` est bien configuré dans Vercel
- Vérifiez que l'email correspond exactement à `biram26@yahoo.fr`
- Vérifiez le middleware dans `lib/middleware.ts`

**📸 Capture d'écran** : Prenez une capture du dashboard admin

---

### ✅ Test 8 : Protection des routes (2 minutes)

**Objectif** : Vérifier que les routes sont protégées

**Actions** :
1. **Déconnectez-vous**
2. **Essayez d'accéder directement** à : https://tuteur-maths-app.vercel.app/admin
3. **Vérifiez que vous êtes redirigé** vers la page de login
4. **Connectez-vous avec un compte étudiant**
5. **Essayez d'accéder** à : https://tuteur-maths-app.vercel.app/admin
6. **Vérifiez que vous êtes bloqué** (redirection ou erreur)

**Résultat attendu** :
- ✅ Impossible d'accéder à /admin sans être connecté
- ✅ Impossible d'accéder à /admin avec un compte étudiant
- ✅ Seul l'admin peut accéder à /admin

---

### ✅ Test 9 : Responsive Design (2 minutes)

**Objectif** : Vérifier que l'application fonctionne sur mobile

**Actions** :
1. **Ouvrez les DevTools** (F12)
2. **Activez le mode responsive** (Ctrl+Shift+M)
3. **Testez différentes tailles** :
   - Mobile (375px)
   - Tablette (768px)
   - Desktop (1920px)
4. **Vérifiez que l'interface s'adapte** correctement

**Résultat attendu** :
- ✅ L'interface s'adapte aux différentes tailles
- ✅ Pas de débordement horizontal
- ✅ Les boutons sont cliquables sur mobile
- ✅ Le texte est lisible

---

### ✅ Test 10 : Performance (2 minutes)

**Objectif** : Vérifier les performances de l'application

**Actions** :
1. **Ouvrez les DevTools** (F12)
2. **Allez dans l'onglet "Network"**
3. **Rechargez la page** (F5)
4. **Vérifiez le temps de chargement**
5. **Allez dans l'onglet "Console"**
6. **Vérifiez qu'il n'y a pas d'erreurs**

**Résultat attendu** :
- ✅ Temps de chargement < 3 secondes
- ✅ Pas d'erreurs dans la console
- ✅ Pas d'avertissements critiques
- ✅ Les images se chargent correctement

---

## 📊 Résumé des Tests

| Test | Statut | Notes |
|------|--------|-------|
| 1. Accès à l'application | ⏳ | |
| 2. Création de compte | ⏳ | |
| 3. Navigation des ressources | ⏳ | |
| 4. Exercice interactif | ⏳ | |
| 5. Assistant IA | ⏳ | |
| 6. Déconnexion/Reconnexion | ⏳ | |
| 7. Accès admin | ⏳ | |
| 8. Protection des routes | ⏳ | |
| 9. Responsive Design | ⏳ | |
| 10. Performance | ⏳ | |

**Légende** :
- ⏳ À tester
- ✅ Réussi
- ❌ Échoué
- ⚠️ Problème mineur

---

## 🐛 Rapport de Bugs

Si vous trouvez des bugs, notez-les ici :

### Bug 1
- **Description** : 
- **Étapes pour reproduire** :
- **Résultat attendu** :
- **Résultat obtenu** :
- **Capture d'écran** :

### Bug 2
- **Description** : 
- **Étapes pour reproduire** :
- **Résultat attendu** :
- **Résultat obtenu** :
- **Capture d'écran** :

---

## ✅ Prochaine Étape

Une fois tous les tests terminés :

1. **Si tous les tests passent** ✅
   - Félicitations ! Votre application est prête à être utilisée
   - Passez à l'étape suivante : Ajout de contenu ou amélioration de l'interface

2. **Si des tests échouent** ❌
   - Notez les bugs dans le rapport ci-dessus
   - Contactez-moi pour les corriger
   - Retestez après correction

---

## 📞 Support

Si vous avez besoin d'aide pendant les tests :
- Vérifiez les logs Vercel : https://vercel.com/dashboard
- Vérifiez les logs Supabase : https://supabase.com
- Consultez la documentation du projet
- Contactez-moi avec les détails du problème

---

**✅ Une fois les tests terminés, dites-moi les résultats et nous passerons à la suite !**
