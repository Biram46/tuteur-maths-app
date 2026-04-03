# Cours : La Dérivation 📈

## 1. Nombre dérivé en un point

### Définition
Soit $f$ une fonction définie sur un intervalle $I$ et $a$ un réel de $I$.
On dit que $f$ est dérivable en $a$ si le taux de variation de $f$ entre $a$ et $a+h$ admet une limite finie quand $h$ tend vers 0.
Cette limite est appelée **nombre dérivé de $f$ en $a$** et est notée **$f'(a)$**.

$$f'(a) = \lim_{h \to 0} \frac{f(a+h) - f(a)}{h}$$

### Interprétation graphique
Le nombre dérivé $f'(a)$ est le **coefficient directeur** de la tangente à la courbe de $f$ au point d'abscisse $a$.
L'équation de cette tangente est :
$$y = f'(a)(x - a) + f(a)$$

---

## 2. Fonctions dérivées usuelles

| Fonction $f(x)$ | Dérivée $f'(x)$ | Domaine de dérivabilité |
|:---:|:---:|:---:|
| $k$ (constante) | $0$ | $\mathbb{R}$ |
| $x$ | $1$ | $\mathbb{R}$ |
| $x^n$ | $nx^{n-1}$ | $\mathbb{R}$ |
| $\frac{1}{x}$ | $-\frac{1}{x^2}$ | $\mathbb{R}^*$ |
| $\sqrt{x}$ | $\frac{1}{2\sqrt{x}}$ | $]0 ; +\infty[$ |

---

## 3. Opérations sur les dérivées

Soient $u$ et $v$ deux fonctions dérivables sur un intervalle $I$ et $k$ un réel.

- **Somme** : $(u + v)' = u' + v'$
- **Produit par un réel** : $(ku)' = ku'$
- **Produit** : $(uv)' = u'v + uv'$
- **Inverse** : $\left(\frac{1}{v}\right)' = -\frac{v'}{v^2}$
- **Quotient** : $\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$
- **Puissance** : $(u^n)' = n u^{n-1} u'$

---

## 4. Application : Sens de variation

Le signe de la dérivée donne les variations de la fonction :
- Si $f'(x) > 0$ sur $I$, alors $f$ est **strictement croissante** sur $I$.
- Si $f'(x) < 0$ sur $I$, alors $f$ est **strictement décroissante** sur $I$.
- Si $f'(x) = 0$ sur $I$, alors $f$ est **constante** sur $I$.

---

> **Conseil du Robot Tutor** : Apprends par cœur le tableau des dérivées usuelles, c'est l'outil indispensable pour toute l'analyse !
