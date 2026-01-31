# Cours : Le Second Degré 📐

## 1. Fonction Polynôme du Second Degré

Une fonction polynôme du second degré est une fonction $f$ définie sur $\mathbb{R}$ par :
$$f(x) = ax^2 + bx + c$$
où $a, b$ et $c$ sont des réels avec $a \neq 0$.

### La forme canonique
Toute fonction polynôme du second degré peut s'écrire sous sa forme canonique :
$$f(x) = a(x - \alpha)^2 + \beta$$
Avec :
- $\alpha = -\frac{b}{2a}$
- $\beta = f(\alpha)$

Le point $S(\alpha ; \beta)$ est le **sommet** de la parabole représentant $f$.

---

## 2. Résolution de l'équation $ax^2 + bx + c = 0$

Pour résoudre cette équation, on calcule le **discriminant** noté $\Delta$ (Delta) :
$$\Delta = b^2 - 4ac$$

### Trois cas possibles selon le signe de $\Delta$ :

1. **Si $\Delta > 0$** : L'équation possède **deux solutions réelles distinctes** :
   $$x_1 = \frac{-b - \sqrt{\Delta}}{2a} \quad \text{et} \quad x_2 = \frac{-b + \sqrt{\Delta}}{2a}$$

2. **Si $\Delta = 0$** : L'équation possède **une unique solution réelle** (dite solution double) :
   $$x_0 = -\frac{b}{2a}$$

3. **Si $\Delta < 0$** : L'équation n'admet **aucune solution réelle**.

---

## 3. Factorisation du trinôme

- Si $\Delta > 0$ : $ax^2 + bx + c = a(x - x_1)(x - x_2)$
- Si $\Delta = 0$ : $ax^2 + bx + c = a(x - x_0)^2$
- Si $\Delta < 0$ : Le trinôme ne se factorise pas dans $\mathbb{R}$.

---

## 4. Signe du trinôme

Le trinôme $ax^2 + bx + c$ est toujours du **signe de $a$**, sauf entre ses racines (lorsqu'elles existent).

$$
\begin{array}{c|ccccccc}
x & -\infty & \quad & x_1 & \quad & x_2 & \quad & +\infty \\
\hline
\text{Signe de } f(x) & & \text{sg de } a & 0 & \text{sg de } -a & 0 & \text{sg de } a & 
\end{array}
$$

---

> **Note aux élèves** : La maîtrise du discriminant est la clé de voûte de l'algèbre en Première. Entraînez-vous sur l'analyseur quadratique interactif !
