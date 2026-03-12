# 📊 Structure de la Base de Données

**Date** : 28 janvier 2026  
**Langue** : Anglais (noms de tables et colonnes) + Français (contenu)

---

## 🎯 Principe

### Noms Techniques : Anglais ✅
- **Tables** : `levels`, `chapters`, `resources`, `profiles`, `quiz_results`
- **Colonnes** : `id`, `code`, `label`, `title`, `created_at`, etc.
- **Types** : `kind` (au lieu de `type`)

### Contenu : Français ✅
- **Labels** : "Première Spécialité Maths", "Seconde"
- **Titres** : "Le Second Degré", "Suites Numériques"
- **Descriptions** : En français

---

## 📋 Tables et Colonnes

### 1. Table `levels` (Niveaux Scolaires)

**Nom de la table** : `levels` (anglais)  
**Contenu** : Français

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `id` | UUID | Identifiant unique | `d1f6136b-...` |
| `code` | TEXT | Code court (anglais) | `1SPE`, `2NDE` |
| `label` | TEXT | **Nom en français** | `Première Spécialité Maths` |
| `position` | INTEGER | Ordre d'affichage | `1`, `2`, `3` |

**Exemple de données** :
```sql
{
  id: "d1f6136b-ecfb-4856-baf6-8c1aa571dbe7",
  code: "1SPE",
  label: "Première Spécialité Maths",  -- EN FRANÇAIS ✅
  position: 2
}
```

---

### 2. Table `chapters` (Chapitres)

**Nom de la table** : `chapters` (anglais)  
**Contenu** : Français

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `id` | UUID | Identifiant unique | `3a1d5782-...` |
| `level_id` | UUID | Référence au niveau | `d1f6136b-...` |
| `code` | TEXT | Code court (anglais) | `second-degre` |
| `title` | TEXT | **Titre en français** | `Le Second Degré` |
| `position` | INTEGER | Ordre d'affichage | `1`, `2`, `3` |
| `published` | BOOLEAN | Publié ou non | `true`, `false` |

**Exemple de données** :
```sql
{
  id: "3a1d5782-bb61-4e7f-a4ab-63d37cb43f04",
  level_id: "d1f6136b-ecfb-4856-baf6-8c1aa571dbe7",
  code: "second-degre",
  title: "Le Second Degré",  -- EN FRANÇAIS ✅
  position: 1,
  published: true
}
```

---

### 3. Table `resources` (Ressources Pédagogiques)

**Nom de la table** : `resources` (anglais)  
**Contenu** : Mixte (URLs en anglais, mais pointent vers des fichiers français)

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `id` | UUID | Identifiant unique | `abc123-...` |
| `chapter_id` | UUID | Référence au chapitre | `3a1d5782-...` |
| `kind` | TEXT | Type de ressource | `cours`, `exercice`, `interactif` |
| `html_url` | TEXT | URL du fichier HTML/MD | `/resources/1ere/second_degre_cours.md` |
| `pdf_url` | TEXT | URL du fichier PDF | `/resources/1ere/second_degre_cours.pdf` |
| `docx_url` | TEXT | URL du fichier DOCX | `/resources/1ere/second_degre_cours.docx` |
| `latex_url` | TEXT | URL du fichier LaTeX | `/resources/1ere/second_degre_cours.tex` |

**Valeurs de `kind`** :
- `cours` - Cours théorique
- `exercice` - Exercices non-interactifs
- `interactif` - Exercices interactifs HTML

**Exemple de données** :
```sql
{
  id: "xyz789-...",
  chapter_id: "3a1d5782-bb61-4e7f-a4ab-63d37cb43f04",
  kind: "cours",  -- EN FRANÇAIS ✅
  html_url: "/resources/1ere/second_degre_cours.md",
  pdf_url: "/resources/1ere/second_degre_cours.pdf",
  docx_url: "/resources/1ere/second_degre_cours.docx",
  latex_url: "/resources/1ere/second_degre_cours.tex"
}
```

---

### 4. Table `profiles` (Profils Utilisateurs)

**Nom de la table** : `profiles` (anglais)  
**Contenu** : Données utilisateur

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `id` | UUID | Référence à auth.users | `user123-...` |
| `email` | TEXT | Email de l'utilisateur | `biram26@yahoo.fr` |
| `created_at` | TIMESTAMP | Date de création | `2026-01-28 21:30:00` |
| `updated_at` | TIMESTAMP | Date de modification | `2026-01-28 21:30:00` |

---

### 5. Table `quiz_results` (Résultats de Quiz)

**Nom de la table** : `quiz_results` (anglais)  
**Contenu** : Résultats des exercices interactifs

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `id` | UUID | Identifiant unique | `quiz123-...` |
| `user_id` | UUID | Référence à l'utilisateur | `user123-...` |
| `resource_id` | UUID | Référence à la ressource | `xyz789-...` |
| `score` | INTEGER | Score obtenu | `8` |
| `total` | INTEGER | Score maximum | `10` |
| `created_at` | TIMESTAMP | Date du quiz | `2026-01-28 21:30:00` |

---

## 🌍 Pourquoi Anglais pour les Noms Techniques ?

### Avantages ✅

1. **Standard International** : Convention universelle en développement
2. **Compatibilité** : Fonctionne avec tous les outils et frameworks
3. **Lisibilité du Code** : Plus facile à lire pour les développeurs
4. **Évite les Accents** : Pas de problèmes d'encodage
5. **Documentation** : Cohérent avec la documentation technique

### Exemples de Bonnes Pratiques

#### ✅ BON (Actuel)
```typescript
const { data: levels } = await supabase
  .from('levels')
  .select('id, code, label, position')
  .order('position');
```

#### ❌ MAUVAIS (À éviter)
```typescript
const { data: niveaux } = await supabase
  .from('niveaux')
  .select('id, code, libellé, position')  // Accent problématique
  .order('position');
```

---

## 📝 Résumé de la Structure

### Noms Techniques (Anglais)
```
Tables:
  - levels
  - chapters
  - resources
  - profiles
  - quiz_results

Colonnes:
  - id, code, label, title
  - position, published
  - kind, html_url, pdf_url, docx_url, latex_url
  - user_id, resource_id, score, total
  - created_at, updated_at
```

### Contenu (Français)
```
Labels:
  - "Première Spécialité Maths"
  - "Seconde"
  - "Terminale Spécialité Maths"

Titres:
  - "Le Second Degré"
  - "Suites Numériques"
  - "Dérivation"
  - "Produit Scalaire"
  - "Probabilités Conditionnelles"

Types (kind):
  - "cours"
  - "exercice"
  - "interactif"
```

---

## 🔍 Vérification Actuelle

Pour vérifier la structure de votre base de données :

```bash
node check_db_complete.js
```

**Résultat attendu** :
```
📚 Niveaux :
✅ 4 niveaux trouvés
   - Seconde (2NDE)                        ← Français
   - Première Spécialité Maths (1SPE)      ← Français
   - Terminale Spécialité Maths (TSPE)     ← Français
   - Terminale Maths Expertes (TEXP)       ← Français

📖 Chapitres :
✅ 5 chapitres trouvés
   - Le Second Degré (second-degre)        ← Français
   - Suites Numériques (suites)            ← Français
   - Dérivation (derivation)               ← Français
   - Produit Scalaire (produit-scalaire)   ← Français
   - Probabilités Conditionnelles (...)    ← Français

📄 Ressources :
✅ 15 ressources trouvées
   Par type :
   - cours: 5                               ← Français
   - exercice: 5                            ← Français
   - interactif: 5                          ← Français
```

---

## 💡 Conclusion

### Structure Actuelle : ✅ OPTIMALE

- **Noms techniques** : Anglais (standard international)
- **Contenu visible** : Français (pour les utilisateurs)
- **Meilleur des deux mondes** : Code propre + contenu localisé

### Aucun Changement Nécessaire

La structure actuelle suit les **meilleures pratiques** :
- ✅ Code maintenable
- ✅ Compatible avec tous les outils
- ✅ Contenu en français pour les utilisateurs
- ✅ Pas de problèmes d'encodage

---

**Votre base de données est parfaitement structurée ! 🎉**

---

*Document créé le 28 janvier 2026*
