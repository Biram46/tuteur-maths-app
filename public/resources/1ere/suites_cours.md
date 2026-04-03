# Cours : Suites Numériques 🔢

## 1. Définitions générales

Une suite numérique $u$ est une fonction définie sur $\mathbb{N}$ (ou une partie de $\mathbb{N}$).
On note $u_n$ le terme de rang $n$.

### Modes de génération
1. **Formule explicite** : $u_n = f(n)$. Exemple : $u_n = 2n + 3$.
2. **Relation de récurrence** : $u_{n+1} = f(u_n)$. Exemple : $u_{n+1} = 2u_n - 1$ avec $u_0 = 5$.

---

## 2. Suites Arithmétiques

### Définition
Une suite $(u_n)$ est **arithmétique** s'il existe un réel $r$ (la raison) tel que :
$$u_{n+1} = u_n + r$$

### Propriétés
- **Formule explicite** : $u_n = u_0 + n \times r$ (ou $u_n = u_p + (n-p)r$)
- **Somme des termes** : $S = \text{nb de termes} \times \frac{\text{1er term} + \text{dernier term}}{2}$

---

## 3. Suites Géométriques

### Définition
Une suite $(u_n)$ est **géométrique** s'il existe un réel $q$ (la raison) tel que :
$$u_{n+1} = u_n \times q$$

### Propriétés
- **Formule explicite** : $u_n = u_0 \times q^n$ (ou $u_n = u_p \times q^{n-p}$)
- **Somme des termes** ($q \neq 1$) : $S = \text{1er term} \times \frac{1 - q^{\text{nb de termes}}}{1 - q}$

---

## 4. Variations d'une suite

- Une suite est **croissante** si pour tout $n$, $u_{n+1} \geq u_n$.
- Une suite est **décroissante** si pour tout $n$, $u_{n+1} \leq u_n$.

---

> **Astuce du Robot Tutor** : Pour étudier les variations, calcule toujours la différence $u_{n+1} - u_n$ et étudie son signe !
