# Cours : Le Produit Scalaire 📐

## 1. Définitions du produit scalaire

### Définition par le cosinus
Pour deux vecteurs $\vec{u}$ et $\vec{v}$ non nuls, le produit scalaire est :
$$\vec{u} \cdot \vec{v} = \|\vec{u}\| \times \|\vec{v}\| \times \cos(\vec{u}, \vec{v})$$

### Dans un repère orthonormé
Si $\vec{u}(x ; y)$ and $\vec{v}(x' ; y')$ dans un repère orthonormé :
$$\vec{u} \cdot \vec{v} = xx' + yy'$$

---

## 2. Orthogonalité

### Propriété fondamentale
Deux vecteurs $\vec{u}$ et $\vec{v}$ sont **orthogonaux** si et seulement si leur produit scalaire est nul :
$$\vec{u} \perp \vec{v} \iff \vec{u} \cdot \vec{v} = 0$$

---

## 3. Propriétés de calcul

Le produit scalaire est :
1. **Symétrique** : $\vec{u} \cdot \vec{v} = \vec{v} \cdot \vec{u}$
2. **Bilinéaire** : 
   - $(\vec{u} + \vec{w}) \cdot \vec{v} = \vec{u} \cdot \vec{v} + \vec{w} \cdot \vec{v}$
   - $(k\vec{u}) \cdot \vec{v} = k(\vec{u} \cdot \vec{v})$

### Identités remarquables scalaires
- $\|\vec{u} + \vec{v}\|^2 = \|\vec{u}\|^2 + \|\vec{v}\|^2 + 2\vec{u} \cdot \vec{v}$
- $\|\vec{u} - \vec{v}\|^2 = \|\vec{u}\|^2 + \|\vec{v}\|^2 - 2\vec{u} \cdot \vec{v}$
- $(\vec{u} - \vec{v}) \cdot (\vec{u} + \vec{v}) = \|\vec{u}\|^2 - \|\vec{v}\|^2$

---

## 4. Projection orthogonale

Soient trois points $A, B, C$. Soit $H$ le projeté orthogonal de $C$ sur la droite $(AB)$.
$$\vec{AB} \cdot \vec{AC} = \vec{AB} \cdot \vec{AH}$$

- Si $\vec{AB}$ et $\vec{AH}$ sont de même sens : $\vec{AB} \cdot \vec{AC} = AB \times AH$
- Si $\vec{AB}$ et $\vec{AH}$ sont de sens contraires : $\vec{AB} \cdot \vec{AC} = - AB \times AH$

---

> **Note stratégique** : Le produit scalaire est l'outil ultime pour calculer des angles et démontrer des orthogonalités dans le plan.
