# Cours : Probabilités Conditionnelles 🎲

## 1. Conditionnement

### Définition
Soient $A$ et $B$ deux événements, avec $P(A) \neq 0$.
La **probabilité conditionnelle de $B$ sachant $A$** est notée $P_A(B)$ et est définie par :
$$P_A(B) = \frac{P(A \cap B)}{P(A)}$$

On en déduit la formule de probabilité composée :
$$P(A \cap B) = P(A) \times P_A(B)$$

---

## 2. Arbre pondéré

Un arbre pondéré permet d'illustrer une situation de probabilités conditionnelles.
- La somme des probabilités des branches issues d'un même nœud est égale à 1.
- La probabilité d'un chemin est le produit des probabilités rencontrées sur ce chemin.

---

## 3. Formule des probabilités totales

Soient $A_1, A_2, \dots, A_n$ des événements formant une **partition** de l'univers $\Omega$.
Alors pour tout événement $B$, on a :
$$P(B) = P(B \cap A_1) + P(B \cap A_2) + \dots + P(B \cap A_n)$$
Soit :
$$P(B) = P(A_1)P_{A_1}(B) + P(A_2)P_{A_2}(B) + \dots + P(A_n)P_{A_n}(B)$$

---

## 4. Indépendance

Deux événements $A$ et $B$ sont **indépendants** si et seulement si :
$$P(A \cap B) = P(A) \times P(B)$$

Si $P(A) \neq 0$, cela revient à dire que $P_A(B) = P(B)$.

---

> **Note du Robot Assistant** : Les arbres sont tes meilleurs amis en probabilités. Dessine toujours la situation pour ne pas t'y perdre !
