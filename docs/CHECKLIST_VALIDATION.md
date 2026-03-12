# ✅ Checklist de Validation - Courbes Lisses & Tableaux Parfaits

**Date** : 11 février 2026  
**Version** : 2.0  
**Status** : 🧪 En validation

---

## 🎯 Comment utiliser cette checklist

1. ✅ Cocher chaque item après vérification
2. 📝 Noter les observations dans la colonne "Notes"
3. ❌ Si échec, noter le problème dans "Notes"
4. 🔄 Retester après correction

---

## 1️⃣ VÉRIFICATIONS VISUELLES

### 1.1 Courbes

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | Courbes fluides (pas d'angles bizarres) | |
| ⬜ | Au moins 6 points visibles par courbe | |
| ⬜ | Ombre portée sous les courbes | |
| ⬜ | Effet lumineux (glow) sur les courbes | |
| ⬜ | Points bleus pleins pour points fermés | |
| ⬜ | Points blancs pour points ouverts | |
| ⬜ | Halo rouge en pointillés sur points ouverts | |
| ⬜ | Grille discrète en arrière-plan | |
| ⬜ | Axes noirs épais et lisibles | |
| ⬜ | Badge "Quantum Engine 2.1" visible | |

### 1.2 Tableaux de Variations

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | Double ligne horizontale (haut et bas) | |
| ⬜ | Bordures verticales propres | |
| ⬜ | Symbole ∞ correct (pas "infy") | |
| ⬜ | Flèches ↗ et ↘ visibles | |
| ⬜ | Valeurs aux extrêmes présentes | |
| ⬜ | Espacement régulier entre colonnes | |
| ⬜ | Format {|c|ccccc|} correct | |

### 1.3 Tableaux de Signes

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | Double ligne horizontale | |
| ⬜ | Symbole + et - uniquement (pas de mots) | |
| ⬜ | Zéro marqué par 0 | |
| ⬜ | Symbole ∥ pour valeur interdite (si quotient) | |
| ⬜ | Structure cohérente | |

---

## 2️⃣ TESTS FONCTIONNELS

### 2.1 Test Graphique Simple

**Requête** : "Génère 2 exercices de lecture graphique niveau Seconde"

| ✓ | Vérification | Notes |
|---|--------------|-------|
| ⬜ | 2 courbes générées | |
| ⬜ | Chaque courbe a 6+ points | |
| ⬜ | Courbes différentes | |
| ⬜ | Tag @@@ correctement parsé | |
| ⬜ | Domain correct | |

### 2.2 Test Tableau Variations

**Requête** : "Tableau de variations de f(x) = -x² + 4x - 1"

| ✓ | Vérification | Notes |
|---|--------------|-------|
| ⬜ | Structure LaTeX correcte | |
| ⬜ | Double \hline | |
| ⬜ | Symbole ∞ correct | |
| ⬜ | Flèches correctes | |
| ⬜ | Valeurs cohérentes | |

### 2.3 Test Tableau Signes

**Requête** : "Tableau de signes de (x+3)(x-2)"

| ✓ | Vérification | Notes |
|---|--------------|-------|
| ⬜ | Symboles +/- uniquement | |
| ⬜ | Zéros bien placés | |
| ⬜ | Structure correcte | |
| ⬜ | Double \hline | |

### 2.4 Test Discontinuité

**Requête** : "Trace la courbe de f(x) = 1/x sur ]-5,5[\{0}"

| ✓ | Vérification | Notes |
|---|--------------|-------|
| ⬜ | Discontinuité visible en x=0 | |
| ⬜ | Points ouverts avec halo rouge | |
| ⬜ | Au moins 10 points | |
| ⬜ | Deux branches distinctes | |

### 2.5 Test Parabole

**Requête** : "Trace la parabole y = x² - 4x + 3"

| ✓ | Vérification | Notes |
|---|--------------|-------|
| ⬜ | Au moins 7 points | |
| ⬜ | Forme parabolique lisse | |
| ⬜ | Sommet bien défini | |
| ⬜ | Ombre portée visible | |

---

## 3️⃣ VÉRIFICATIONS TECHNIQUES

### 3.1 Code

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | MathGraph.tsx utilise curveNatural | |
| ⬜ | Templates ont 6-13 points | |
| ⬜ | Prompts IA ont 4 exemples graphiques | |
| ⬜ | Prompts IA ont 6 exemples tableaux | |
| ⬜ | Aucune erreur console | |

### 3.2 Rendu LaTeX

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | KaTeX charge correctement | |
| ⬜ | Symboles mathématiques corrects | |
| ⬜ | Pas d'erreur LaTeX visible | |
| ⬜ | Tableaux alignés | |

---

## 4️⃣ TESTS DE RÉGRESSION

### 4.1 Fonctionnalités Existantes

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | Chat fonctionne | |
| ⬜ | Upload image fonctionne | |
| ⬜ | Streaming fonctionne | |
| ⬜ | Markdown + LaTeX inline | |
| ⬜ | Robot avatar anime | |

### 4.2 Performance

| ✓ | Item | Notes |
|---|------|-------|
| ⬜ | Rendu graphique < 1s | |
| ⬜ | Pas de lag visible | |
| ⬜ | Scroll fluide | |
| ⬜ | Réactivité correcte | |

---

## 5️⃣ COMPATIBILITÉ

### 5.1 Navigateurs (optionnel)

| ✓ | Navigateur | Notes |
|---|-----------|-------|
| ⬜ | Chrome | |
| ⬜ | Firefox | |
| ⬜ | Edge | |
| ⬜ | Safari | |

---

## 📋 RÉSUMÉ

### Statistiques

- **Tests réussis** : _____ / 45
- **Taux de réussite** : _____%
- **Bloquants** : _____
- **Mineurs** : _____

### Décision

| Status | Action |
|--------|--------|
| ⬜ | ✅ Validé - Déploiement possible |
| ⬜ | ⚠️ Validé avec réserves - Corrections mineures |
| ⬜ | ❌ Non validé - Corrections majeures requises |

### Problèmes Identifiés

```
1. 


2. 


3. 


```

### Actions Correctives

```
1. 


2. 


3. 


```

---

## 📅 Historique

| Date | Version | Testeur | Status | Notes |
|------|---------|---------|--------|-------|
| 11/02/2026 | 2.0 | | 🧪 En test | Première validation |
| | | | | |
| | | | | |

---

## 📞 Contact

En cas de problème :
1. Vérifier la console (F12) pour erreurs JavaScript
2. Vérifier les logs serveur dans le terminal
3. Consulter GUIDE_TEST_GRAPHIQUES.md
4. Consulter AMELIORATIONS_GRAPHIQUES_TABLEAUX.md

---

**Dernière mise à jour** : 11 février 2026
