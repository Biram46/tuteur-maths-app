# ✅ Checklist Rapide - Test Authentification Vercel

**Date** : 29 janvier 2026  
**URL de production** : `_______________________________`

---

## 📋 Informations Préalables

- [ ] URL Vercel obtenue
- [ ] Compte admin `biram26@yahoo.fr` existe dans Supabase
- [ ] Variables d'environnement configurées dans Vercel
- [ ] URL Vercel ajoutée dans Supabase (Authentication > URL Configuration)

---

## 🧪 Tests à Effectuer (Ordre Recommandé)

### Test 1 : Redirection Automatique ⏱️ 2 min
- [ ] Ouvrir navigation privée
- [ ] Aller sur `https://votre-url.vercel.app`
- [ ] ✅ Redirigé vers `/login`
- [ ] ✅ Page de connexion s'affiche

**Notes** : _______________________________________________

---

### Test 2 : Inscription Élève ⏱️ 3 min
- [ ] Aller sur `/login`
- [ ] Cliquer sur "INSCRIPTION"
- [ ] Email : `test.eleve.vercel@exemple.com`
- [ ] Mot de passe : `TestVercel123!`
- [ ] ✅ Inscription réussie
- [ ] ✅ Compte visible dans Supabase

**Notes** : _______________________________________________

---

### Test 3 : Connexion Élève ⏱️ 2 min
- [ ] Se déconnecter
- [ ] Aller sur `/login`
- [ ] Email : `test.eleve.vercel@exemple.com`
- [ ] Mot de passe : `TestVercel123!`
- [ ] ✅ Redirigé vers `/`
- [ ] ✅ Interface élève s'affiche
- [ ] Rafraîchir la page (F5)
- [ ] ✅ Reste connecté

**Notes** : _______________________________________________

---

### Test 4 : Accès Admin Refusé (Élève) ⏱️ 1 min
- [ ] Connecté en tant qu'élève
- [ ] Taper manuellement : `/admin`
- [ ] ✅ Redirigé vers `/admin/login`
- [ ] ✅ Message "Accès refusé"

**Notes** : _______________________________________________

---

### Test 5 : Connexion Admin - Email Incorrect ⏱️ 2 min
- [ ] Se déconnecter
- [ ] Aller sur `/admin/login`
- [ ] Email : `autre.prof@exemple.com`
- [ ] Mot de passe : `nimportequoi`
- [ ] ✅ Message d'erreur affiché
- [ ] ✅ Reste sur `/admin/login`

**Notes** : _______________________________________________

---

### Test 6 : Connexion Admin - Succès ⏱️ 2 min
- [ ] Aller sur `/admin/login`
- [ ] Email : `biram26@yahoo.fr`
- [ ] Mot de passe : `[votre mot de passe]`
- [ ] ✅ Redirigé vers `/admin`
- [ ] ✅ Dashboard admin s'affiche
- [ ] Rafraîchir la page (F5)
- [ ] ✅ Reste connecté

**Notes** : _______________________________________________

---

### Test 7 : Déconnexion ⏱️ 2 min
- [ ] **Élève** : Cliquer sur "Déconnexion"
- [ ] ✅ Redirigé vers `/login`
- [ ] **Admin** : Cliquer sur "Déconnexion"
- [ ] ✅ Redirigé vers `/admin/login`

**Notes** : _______________________________________________

---

### Test 8 : Sécurité des Routes ⏱️ 5 min

**Non connecté** (navigation privée) :
- [ ] `/` → Redirige vers `/login`
- [ ] `/assistant` → Redirige vers `/login`
- [ ] `/admin` → Redirige vers `/admin/login`

**Connecté en tant qu'élève** :
- [ ] `/` → Accessible
- [ ] `/admin` → Redirige vers `/admin/login`
- [ ] `/login` → Redirige vers `/`

**Connecté en tant qu'admin** :
- [ ] `/admin` → Accessible
- [ ] `/` → Redirige vers `/admin`
- [ ] `/login` → Redirige vers `/admin`

**Notes** : _______________________________________________

---

### Test 9 : Assistant IA (Optionnel) ⏱️ 3 min
- [ ] Se connecter en tant qu'élève
- [ ] Aller sur `/assistant`
- [ ] Poser une question : "Qu'est-ce qu'une dérivée ?"
- [ ] ✅ Réponse reçue en français
- [ ] ✅ Sources affichées

**Notes** : _______________________________________________

---

### Test 10 : Console et Logs ⏱️ 3 min
- [ ] Ouvrir console navigateur (F12)
- [ ] Naviguer dans l'application
- [ ] ✅ Aucune erreur rouge
- [ ] Vérifier logs Vercel
- [ ] ✅ Aucune erreur 500

**Notes** : _______________________________________________

---

## 📊 Résumé des Résultats

### Statistiques
- **Tests réussis** : _____ / 10
- **Tests échoués** : _____ / 10
- **Temps total** : _____ minutes

### Statut Global
- [ ] ✅ **TOUT FONCTIONNE** - Prêt pour la production
- [ ] ⚠️ **PROBLÈMES MINEURS** - Corrections nécessaires
- [ ] ❌ **PROBLÈMES MAJEURS** - Débogage requis

---

## 🐛 Problèmes Rencontrés

### Problème 1
**Description** : _______________________________________________
**Gravité** : [ ] Critique [ ] Moyenne [ ] Faible
**Solution** : _______________________________________________

### Problème 2
**Description** : _______________________________________________
**Gravité** : [ ] Critique [ ] Moyenne [ ] Faible
**Solution** : _______________________________________________

### Problème 3
**Description** : _______________________________________________
**Gravité** : [ ] Critique [ ] Moyenne [ ] Faible
**Solution** : _______________________________________________

---

## 🎯 Actions Suivantes

### Si Tout Fonctionne ✅
- [ ] Documenter l'URL de production
- [ ] Créer des comptes de test supplémentaires
- [ ] Tester sur mobile
- [ ] Partager avec les premiers utilisateurs

### Si Problèmes Détectés ❌
- [ ] Noter les erreurs dans les logs Vercel
- [ ] Vérifier la configuration Supabase
- [ ] Corriger les problèmes
- [ ] Redéployer
- [ ] Retester

---

## 📞 Ressources Utiles

- **Vercel Dashboard** : https://vercel.com/dashboard
- **Supabase Dashboard** : https://supabase.com/dashboard
- **Guide Complet** : `TEST_AUTH_VERCEL.md`
- **Guide Déploiement** : `DEPLOIEMENT_VERCEL.md`

---

**Temps estimé total** : 25-30 minutes  
**Difficulté** : Facile  
**Prérequis** : Application déployée sur Vercel

*Checklist créée le 29 janvier 2026*
