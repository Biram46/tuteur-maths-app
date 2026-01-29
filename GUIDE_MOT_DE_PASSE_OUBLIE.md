# 🔑 Guide : Réinitialisation de Mot de Passe

**Date** : 29 janvier 2026  
**Fonctionnalité** : Mot de passe oublié avec réinitialisation par email

---

## 🎯 Fonctionnalités Ajoutées

### 1. **Lien "Mot de passe oublié ?"**
- ✅ Visible sur `/login` (page élève)
- ✅ Visible sur `/admin/login` (page admin)
- ✅ Apparaît uniquement en mode "Connexion"

### 2. **Page de Demande de Réinitialisation** (`/forgot-password`)
- ✅ Formulaire pour entrer l'email
- ✅ Envoi d'un email de réinitialisation
- ✅ Message de confirmation
- ✅ Design futuriste cohérent

### 3. **Page de Nouveau Mot de Passe** (`/auth/reset-password`)
- ✅ Formulaire pour définir un nouveau mot de passe
- ✅ Confirmation du mot de passe
- ✅ Boutons afficher/masquer pour les deux champs
- ✅ Validation (minimum 6 caractères)

---

## 🔄 Flux Utilisateur

### **Scénario : Élève a oublié son mot de passe**

```
1. Élève va sur /login
2. Clique sur "Mot de passe oublié ?"
3. Redirigé vers /forgot-password
4. Entre son email : test.eleve@exemple.com
5. Clique sur "Envoyer le Lien"
6. Message : "Email de réinitialisation envoyé !"
7. Vérifie sa boîte email
8. Clique sur le lien dans l'email
9. Redirigé vers /auth/reset-password
10. Entre un nouveau mot de passe (2 fois)
11. Clique sur "Mettre à Jour le Mot de Passe"
12. Redirigé vers /login avec message de succès
13. Se connecte avec le nouveau mot de passe
```

---

## 📧 Configuration Email Supabase

### **Étape 1 : Vérifier les Templates Email**

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Authentication** → **Email Templates**
4. Sélectionnez **"Reset Password"**

### **Étape 2 : Template par Défaut**

Le template par défaut devrait contenir :

```html
<h2>Réinitialisation de votre mot de passe</h2>
<p>Suivez ce lien pour réinitialiser votre mot de passe :</p>
<p><a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery">Réinitialiser mon mot de passe</a></p>
```

### **Étape 3 : Personnaliser (Optionnel)**

Vous pouvez personnaliser le template :

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #06b6d4;">🔑 Réinitialisation de Mot de Passe</h2>
  <p>Bonjour,</p>
  <p>Vous avez demandé à réinitialiser votre mot de passe pour <strong>Tuteur Maths</strong>.</p>
  <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery" 
       style="background: linear-gradient(to right, #06b6d4, #e879f9); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; display: inline-block;">
      Réinitialiser mon Mot de Passe
    </a>
  </p>
  <p style="color: #64748b; font-size: 12px;">
    Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
  </p>
</div>
```

---

## 🔐 Sécurité

### **Mesures de Sécurité Implémentées**

1. ✅ **Token unique** : Chaque lien de réinitialisation est unique
2. ✅ **Expiration** : Les liens expirent après 1 heure
3. ✅ **Usage unique** : Un lien ne peut être utilisé qu'une seule fois
4. ✅ **Validation** : Mot de passe minimum 6 caractères
5. ✅ **Confirmation** : Double saisie du mot de passe
6. ✅ **HTTPS** : Toutes les communications sont chiffrées (Vercel)

### **Bonnes Pratiques**

- ✅ Pas de stockage du mot de passe en clair
- ✅ Hachage automatique par Supabase
- ✅ Pas d'indication si l'email existe ou non (sécurité)
- ✅ Rate limiting par Supabase (protection contre le spam)

---

## 🧪 Tests

### **Test 1 : Demande de Réinitialisation**

1. Allez sur https://tuteur-maths-app.vercel.app/login
2. Cliquez sur "Mot de passe oublié ?"
3. Entrez un email valide
4. Cliquez sur "Envoyer le Lien"
5. **Résultat attendu** :
   - ✅ Message de confirmation
   - ✅ Email reçu (vérifiez les spams)

### **Test 2 : Réinitialisation du Mot de Passe**

1. Ouvrez l'email reçu
2. Cliquez sur le lien
3. Entrez un nouveau mot de passe
4. Confirmez le mot de passe
5. Cliquez sur "Mettre à Jour le Mot de Passe"
6. **Résultat attendu** :
   - ✅ Redirection vers /login
   - ✅ Message de succès
   - ✅ Connexion possible avec le nouveau mot de passe

### **Test 3 : Validation**

1. Essayez avec un mot de passe trop court (< 6 caractères)
2. **Résultat attendu** : ✅ Message d'erreur

3. Essayez avec des mots de passe différents
4. **Résultat attendu** : ✅ Message "Les mots de passe ne correspondent pas"

### **Test 4 : Lien Expiré**

1. Attendez plus d'1 heure
2. Essayez d'utiliser le lien
3. **Résultat attendu** : ✅ Message d'erreur "Lien expiré"

---

## 🎨 Design

### **Pages Créées**

| Page | URL | Design |
|------|-----|--------|
| Mot de passe oublié | `/forgot-password` | Cyan/Fuchsia (élève) |
| Nouveau mot de passe | `/auth/reset-password` | Cyan/Fuchsia |

### **Éléments de Design**

- ✅ Icône 🔑 pour "Mot de passe oublié"
- ✅ Icône 🔐 pour "Nouveau mot de passe"
- ✅ Boutons afficher/masquer (œil)
- ✅ Animations et effets lumineux
- ✅ Messages de succès/erreur stylisés
- ✅ Responsive mobile

---

## 📁 Fichiers Créés

```
app/
├── auth/
│   ├── password-actions.ts          # Actions serveur
│   └── reset-password/
│       ├── page.tsx                  # Page serveur
│       └── ResetPasswordClient.tsx   # Composant client
├── forgot-password/
│   ├── page.tsx                      # Page serveur
│   └── ForgotPasswordClient.tsx      # Composant client
├── login/
│   └── LoginPageClient.tsx           # Modifié (lien ajouté)
└── admin/
    └── login/
        └── AdminLoginClient.tsx      # Modifié (lien ajouté)
```

---

## 🔧 Variables d'Environnement

Assurez-vous que cette variable est définie dans Vercel :

```bash
NEXT_PUBLIC_SITE_URL=https://tuteur-maths-app.vercel.app
```

Si elle n'existe pas, ajoutez-la :

1. Vercel Dashboard → Votre projet
2. **Settings** → **Environment Variables**
3. Ajoutez :
   - Name: `NEXT_PUBLIC_SITE_URL`
   - Value: `https://tuteur-maths-app.vercel.app`
   - Environment: Production, Preview, Development
4. Redéployez l'application

---

## 🐛 Dépannage

### **Problème 1 : Email non reçu**

**Solutions** :
1. Vérifiez les spams
2. Attendez 2-3 minutes
3. Vérifiez que l'email est correct
4. Vérifiez les logs Supabase (Authentication → Logs)

### **Problème 2 : Lien ne fonctionne pas**

**Solutions** :
1. Vérifiez que `NEXT_PUBLIC_SITE_URL` est défini
2. Vérifiez les Redirect URLs dans Supabase
3. Assurez-vous que le lien n'a pas expiré (1h)
4. Vérifiez que le lien n'a pas déjà été utilisé

### **Problème 3 : Erreur "Invalid token"**

**Solutions** :
1. Le lien a expiré → Demandez un nouveau lien
2. Le lien a déjà été utilisé → Demandez un nouveau lien
3. Problème de configuration → Vérifiez les variables d'environnement

---

## ✅ Checklist de Déploiement

- [ ] Fichiers créés et commitées
- [ ] Poussé vers GitHub
- [ ] Déployé sur Vercel
- [ ] Variable `NEXT_PUBLIC_SITE_URL` configurée
- [ ] Template email vérifié dans Supabase
- [ ] Testé la demande de réinitialisation
- [ ] Testé la réinitialisation complète
- [ ] Vérifié que le nouveau mot de passe fonctionne

---

## 🎯 Utilisation

### **Pour les Élèves**

1. Si vous oubliez votre mot de passe
2. Cliquez sur "Mot de passe oublié ?" sur la page de connexion
3. Entrez votre email
4. Vérifiez votre boîte email
5. Cliquez sur le lien
6. Définissez un nouveau mot de passe
7. Connectez-vous avec votre nouveau mot de passe

### **Pour l'Admin**

Même processus, mais depuis `/admin/login`

---

**Temps de mise en œuvre** : 15 minutes  
**Difficulté** : Moyenne  
**Impact** : Haute (améliore l'UX et la sécurité)

*Guide créé le 29 janvier 2026*
