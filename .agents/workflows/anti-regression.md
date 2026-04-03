---
description: Procédure anti-régression avant de tester ou modifier un module mathématique
---

# 🛡️ Procédure Anti-Régression — Tuteur Maths App

À suivre **AVANT de modifier** un module mathématique ou **APRÈS avoir corrigé un bug**.

## 1. Vérifier que les tests existants couvrent le cas

Lire les fichiers dans `tests/` pour voir si le cas est déjà couvert :

- `tests/sign-table-engine.test.ts` — Moteur JS de tableaux de signes
- `tests/variation-engine.test.ts` — Moteur JS de tableaux de variations
- `tests/regressions.test.ts` — Bugs historiques documentés
- `tests/expression-parser.test.ts` — Parser d'expressions mathématiques
- `tests/math-orchestrator.test.ts` — Orchestrateur global
- `tests/latex-fixer.test.ts` — Correction du LaTeX
- `tests/geo-parser.test.ts` — Parser géométrique

## 2. Ajouter un test de régression pour chaque bug corrigé

Dans `tests/regressions.test.ts`, ajouter un `describe()` bloc avec :

```typescript
describe('Régression #AAAA-MM-JJ — Description courte', () => {
    it('cas exact qui reproduisait le bug', () => {
        // Tester les valeurs numériquement exactes (evalAt, findZeros, generateSignTable)
        const result = generateSignTable({ expression: '...' });
        expect(result.success).toBe(true);
        // Vérifier les invariants spécifiques au bug
    });
});
```

**Règle** : le nom du `describe()` doit contenir la date et une description claire.

## 3. Tests Python SymPy

Pour les bugs du moteur Python, ajouter des tests dans `python-api/tests/`.

Exécuter **manuellement** (pas via l'agent) :
```bash
cd python-api
python -m pytest tests/ -v
```

## 4. Invariants à toujours vérifier après modification

### Tableaux de signes
- `criticalPoints` triés en ordre croissant
- `aaaBlock` commence par `@@@\ntable |` et finit par `@@@`
- Chaque ligne `sign:` a exactement `2N+1` valeurs (N = nombre de points critiques)
- `||` uniquement dans `f(x)` pour les valeurs interdites (dénominateur)
- `0` dans les facteurs numérateur, jamais `||`
- Les facteurs avec Δ < 0 (ex: x²+1) : **0 point critique**, signe constant

### Tableaux de variations
- Au moins une flèche `nearrow` ou `searrow` dans la ligne `variation:`
- En Première : PAS de valeurs ±∞ dans la ligne variation
- En Terminale : valeurs limites incluses
- La ligne `sign: f'(x)` est présente si et seulement si on utilise la dérivée

### API Perplexity
- Tout `!response.ok` doit logger le status HTTP et le message réel du provider
- Ne jamais lancer `throw new Error('Erreur générique')` sans le vrai contexte
- Tronquer les messages à 8 max (`MAX_HISTORY`) avant d'envoyer à l'API

## 5. Expressions de test standards à toujours vérifier

| Expression | Points critiques | Signes f(x) |
|------------|-----------------|-------------|
| `(x+2)/(x-3)` | -2, 3(||) | +, 0, -, \|\|, + |
| `(x-1)*(x+3)` | -3, 1 | +, 0, -, 0, + |
| `(-2x+4)*(x-3)*(x²+1)` | 2, 3 | -, 0, +, 0, - |
| `x²+1` | aucun | + |
| `(x+3)*(x-2)/(x-1)` | -3, 1(||), 2 | -, 0, +, \|\|, -, 0, + |

## 6. Quand créer un nouveau test

**Toujours créer un test** quand :
- ✅ Un bug de signe est corrigé (quel facteur, quelle valeur)
- ✅ Un format de tableau est modifié (`aaaBlock`, `tableSpec`)
- ✅ Une nouvelle catégorie de fonctions est ajoutée (log, sqrt, exp)
- ✅ Un niveau pédagogique change ses règles

**Ne pas créer de test** quand :
- ❌ Simple reformatage du texte affiché
- ❌ Changement de prompt IA (non testable en unit)
- ❌ Modification de styles CSS
