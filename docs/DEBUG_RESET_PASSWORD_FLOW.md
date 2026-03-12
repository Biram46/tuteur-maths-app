# 🔍 Debug : Flux de Réinitialisation de Mot de Passe

**Problème** : Redirection vers `/login` au lieu de `/auth/reset-password`

---

## 🎯 Diagnostic

Le problème vient du fait que Supabase envoie un lien de type "recovery" (récupération) qui est différent d'un lien de connexion normal.

### Flux Actuel (Problématique)

1. Utilisateur demande réinitialisation
2. Email envoyé avec lien : `https://tuteur-maths-app.vercel.app/auth/callback?token=XXX&type=recovery&next=/auth/reset-password`
3. Callback échange le token
4. ❌ Middleware redirige vers `/login` car pas de session valide

### Pourquoi Ça Ne Marche Pas

Le middleware vérifie si l'utilisateur est connecté (`!user`) **avant** de laisser passer les routes `/auth/*`. Mais lors de la réinitialisation, l'utilisateur n'est pas encore connecté, donc il est redirigé vers `/login`.

---

## ✅ Solution

Il faut que le middleware laisse passer `/auth/reset-password` **même si l'utilisateur n'est pas connecté**, car c'est une page publique pour la réinitialisation.

---

## 🔧 Correction à Appliquer

### Option 1 : Ajouter `/auth/reset-password` aux exceptions

Modifier `lib/middleware.ts` pour traiter `/auth/reset-password` comme une page publique.

### Option 2 : Utiliser la configuration Supabase

Configurer Supabase pour rediriger directement vers `/auth/reset-password` sans passer par `/auth/callback`.

---

**Recommandation** : Option 1 (plus simple et plus fiable)

---

*Guide créé le 30 janvier 2026 - 22:05*
