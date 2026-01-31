# 📅 Plan de Test - Session de Demain

**Date prévue** : 1er Février 2026
**État système** : Déploiement du correctif d'authentification (Commit `d512569`) effectué.

## 🎯 Objectifs de la session

L'objectif principal sera de valider que les problèmes d'authentification sont définitivement résolus sur l'environnement de production (Vercel).

### 1. Test de Connexion & Inscription
- [ ] **Inscription** : Créer un nouveau compte élève (ex: `test.eleve@example.com`).
- [ ] **Confirmation** : Vérifier que le lien de confirmation email connecte bien l'utilisateur automatiquement.
- [ ] **Connexion** : Se déconnecter et se reconnecter avec ce compte.

### 2. Test "Mot de Passe Oublié" (CRITIQUE)
- [ ] Aller sur `/forgot-password`.
- [ ] Demander un lien pour le compte de test.
- [ ] **Action clé** : Cliquer sur le lien reçu dans l'email.
- [ ] **Vérification** :
  - Le lien ne doit PAS afficher "Session invalide".
  - Vous devez être redirigé vers le formulaire de nouveau mot de passe.
  - La validation du formulaire doit fonctionner et rediriger vers le login.
- [ ] **Validation finale** : Se connecter avec le *nouveau* mot de passe.

### 3. Autres Vérifications (Si le temps le permet)
- [ ] Vérifier les liens de téléchargement de cours (PDF/DOCX) qui étaient signalés comme problématiques.
- [ ] Tester une question simple à l'Assistant IA pour vérifier que la clé API fonctionne toujours.

## 📝 Notes Techniques

- Le déploiement Vercel devrait être terminé depuis longtemps à votre retour.
- Si vous rencontrez encore des problèmes de session, essayez de vider les cookies/cache du navigateur ou d'utiliser une fenêtre de navigation privée pour être sûr de ne pas avoir d'anciens cookies conflictuels.

---
*Bonne soirée et à demain pour la validation !* 🌙
