# 🧪 Guide de Test - Authentification

**Date** : 28 janvier 2026

---

## ⚠️ Problème PowerShell Détecté

Votre système Windows bloque l'exécution des scripts PowerShell (politique de sécurité).

### **Solution Rapide**

Ouvrez PowerShell **en tant qu'administrateur** et exécutez :

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Puis confirmez avec `O` (Oui).

### **Alternative : Utiliser CMD**

Si vous ne pouvez pas modifier la politique, utilisez **l'invite de commandes (CMD)** au lieu de PowerShell :

1. Appuyez sur `Win + R`
2. Tapez `cmd` et appuyez sur Entrée
3. Naviguez vers le projet :
   ```cmd
   cd C:\Users\HP\Documents\projet\tuteur-maths-app
   ```
4. Lancez le serveur :
   ```cmd
   npm run dev
   ```

---

## 🧪 Plan de Test

Une fois le serveur démarré, suivez ces étapes :

### **Test 1 : Interface Élève - Inscription**

1. **Ouvrir** : http://localhost:3000/login
2. **Vérifier** :
   - ✅ Design cyan/fuchsia
   - ✅ Icône 📐
   - ✅ Titre "Tuteur Maths"
   - ✅ Deux onglets : "Connexion" et "Inscription"
   - ✅ Lien "👨‍🏫 Accès Professeur" en bas

3. **Cliquer** sur l'onglet "Inscription"
4. **Remplir** :
   - Email : `test.eleve@exemple.com`
   - Mot de passe : `Test123456!`
5. **Cliquer** sur "Créer Nouvel Accès"
6. **Résultat attendu** :
   - ✅ Message : "Compte créé ! Veuillez vérifier votre email..."
   - OU redirection vers `/` si la confirmation email est désactivée

---

### **Test 2 : Interface Élève - Connexion**

1. **Rester sur** : http://localhost:3000/login
2. **Cliquer** sur l'onglet "Connexion"
3. **Remplir** :
   - Email : `test.eleve@exemple.com`
   - Mot de passe : `Test123456!`
4. **Cliquer** sur "Initialiser Connexion"
5. **Résultat attendu** :
   - ✅ Redirection vers `/` (interface élève)
   - ✅ Affichage des cours et chapitres

---

### **Test 3 : Interface Professeur - Accès**

1. **Cliquer** sur le lien "👨‍🏫 Accès Professeur" en bas de `/login`
   - OU aller directement sur http://localhost:3000/admin/login

2. **Vérifier** :
   - ✅ Design orange/rouge (différent de l'élève)
   - ✅ Icône 👨‍🏫
   - ✅ Titre "Espace Professeur"
   - ✅ Badge "Accès Réservé au Professeur"
   - ✅ **PAS d'onglet "Inscription"** (connexion uniquement)
   - ✅ Lien "← Espace Élève" en bas

---

### **Test 4 : Professeur - Connexion Refusée**

1. **Sur** : http://localhost:3000/admin/login
2. **Remplir** avec un email DIFFÉRENT :
   - Email : `autre.prof@exemple.com`
   - Mot de passe : `nimportequoi`
3. **Cliquer** sur "🔐 Accès Admin"
4. **Résultat attendu** :
   - ✅ Message d'erreur : "Accès refusé. Seul le professeur peut se connecter ici."
   - ✅ Reste sur la page `/admin/login`

---

### **Test 5 : Professeur - Connexion Réussie**

**⚠️ IMPORTANT** : Le compte `biram26@yahoo.fr` doit exister dans Supabase.

#### **Si le compte n'existe pas encore** :

**Option A : Créer via l'interface élève**
1. Aller sur http://localhost:3000/login
2. Cliquer sur "Inscription"
3. Email : `biram26@yahoo.fr`
4. Mot de passe : `[votre mot de passe sécurisé]`
5. Cliquer sur "Créer Nouvel Accès"
6. Vérifier votre email et confirmer

**Option B : Créer via Supabase Dashboard**
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Authentication > Users > Add User
4. Email : `biram26@yahoo.fr`
5. Password : `[votre mot de passe]`
6. **Cocher** "Auto Confirm User"
7. Cliquer sur "Create User"

#### **Test de connexion** :

1. **Sur** : http://localhost:3000/admin/login
2. **Remplir** :
   - Email : `biram26@yahoo.fr`
   - Mot de passe : `[votre mot de passe]`
3. **Cliquer** sur "🔐 Accès Admin"
4. **Résultat attendu** :
   - ✅ Redirection vers `/admin` (dashboard professeur)
   - ✅ Affichage de l'interface admin

---

### **Test 6 : Protection des Routes**

#### **6A : Élève essaie d'accéder à /admin**

1. **Se connecter** en tant qu'élève (test.eleve@exemple.com)
2. **Taper manuellement** dans l'URL : http://localhost:3000/admin
3. **Résultat attendu** :
   - ✅ Redirection automatique vers `/admin/login`
   - ✅ Message ou page de connexion professeur

#### **6B : Professeur redirigé automatiquement**

1. **Se connecter** en tant que professeur (biram26@yahoo.fr)
2. **Aller sur** : http://localhost:3000/login
3. **Résultat attendu** :
   - ✅ Redirection automatique vers `/admin`

#### **6C : Élève redirigé automatiquement**

1. **Se connecter** en tant qu'élève
2. **Aller sur** : http://localhost:3000/login
3. **Résultat attendu** :
   - ✅ Redirection automatique vers `/`

---

### **Test 7 : Déconnexion**

1. **Étant connecté** (élève ou professeur)
2. **Chercher** le bouton de déconnexion dans l'interface
3. **Cliquer** dessus
4. **Résultat attendu** :
   - ✅ Redirection vers `/login`
   - ✅ Session terminée

---

## ✅ Checklist de Validation

Cochez au fur et à mesure :

### **Interface Élève**
- [ ] Design cyan/fuchsia visible
- [ ] Onglet "Connexion" fonctionne
- [ ] Onglet "Inscription" fonctionne
- [ ] Inscription crée un nouveau compte
- [ ] Connexion redirige vers `/`
- [ ] Lien vers espace professeur visible

### **Interface Professeur**
- [ ] Design orange/rouge visible
- [ ] Pas d'onglet "Inscription"
- [ ] Badge "Accès Réservé" visible
- [ ] Email différent de biram26@yahoo.fr → Refusé
- [ ] Email biram26@yahoo.fr → Accepté et redirigé vers `/admin`
- [ ] Lien vers espace élève visible

### **Sécurité**
- [ ] Élève ne peut pas accéder à `/admin`
- [ ] Professeur redirigé vers `/admin` s'il va sur `/login`
- [ ] Élève redirigé vers `/` s'il va sur `/login` (déjà connecté)
- [ ] Routes protégées redirigent vers login si non connecté

---

## 📸 Captures d'Écran Attendues

### **Page /login (Élève)**
```
┌─────────────────────────────────────┐
│            📐                       │
│       TUTEUR MATHS                  │
│   Quantum Gateway v2.0              │
│                                     │
│  ┌─────────┬──────────────┐        │
│  │CONNEXION│ INSCRIPTION  │        │
│  └─────────┴──────────────┘        │
│                                     │
│  Email: [____________]              │
│  Password: [____________]           │
│                                     │
│  [Initialiser Connexion]            │
│                                     │
│  Espace Élève                       │
│  👨‍🏫 Accès Professeur               │
└─────────────────────────────────────┘
```

### **Page /admin/login (Professeur)**
```
┌─────────────────────────────────────┐
│            👨‍🏫                      │
│     ESPACE PROFESSEUR               │
│      Admin Portal v2.0              │
│                                     │
│  ⚠️ Accès Réservé au Professeur     │
│                                     │
│  Email: [____________]              │
│  Password: [____________]           │
│                                     │
│  [🔐 Accès Admin]                   │
│                                     │
│  Accès Sécurisé Professeur          │
│  ← Espace Élève                     │
└─────────────────────────────────────┘
```

---

## 🐛 Problèmes Courants

### **Problème 1 : "Clé API non configurée"**

**Cause** : Variables d'environnement manquantes

**Solution** :
1. Vérifier que `.env.local` existe
2. Vérifier qu'il contient :
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Redémarrer le serveur

### **Problème 2 : "Email ou mot de passe incorrect"**

**Cause** : Compte inexistant ou mauvais mot de passe

**Solution** :
1. Vérifier que le compte existe dans Supabase
2. Essayer de réinitialiser le mot de passe
3. Créer un nouveau compte si nécessaire

### **Problème 3 : Redirection infinie**

**Cause** : Problème dans le middleware

**Solution** :
1. Vérifier `lib/middleware.ts`
2. Nettoyer les cookies du navigateur
3. Redémarrer le serveur

### **Problème 4 : Page blanche**

**Cause** : Erreur JavaScript

**Solution** :
1. Ouvrir la console du navigateur (F12)
2. Vérifier les erreurs
3. Vérifier les logs du serveur

---

## 📊 Résultats Attendus

Si tous les tests passent :

✅ **Interface élève** : Connexion + Inscription fonctionnelles  
✅ **Interface professeur** : Connexion uniquement, email vérifié  
✅ **Sécurité** : Routes protégées, redirections correctes  
✅ **Design** : Deux thèmes distincts et professionnels  

---

## 🎯 Prochaines Actions

Après validation des tests :

1. **Documenter** les résultats
2. **Corriger** les éventuels bugs
3. **Améliorer** l'UX (bouton déconnexion, etc.)
4. **Déployer** sur Vercel

---

**Bon test ! 🚀**

*Si vous rencontrez un problème, notez-le et je vous aiderai à le résoudre.*
