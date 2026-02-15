/**
 * CONTRAINTES PÉDAGOGIQUES - PROGRAMME ÉDUCATION NATIONALE (LYCÉE)
 * Ce fichier définit les règles de rigueur mathématique à respecter impérativement.
 */

export const PEDAGOGICAL_CONSTRAINTS = `
### RÈGLES DE RIGUEUR MATHÉMATIQUE (PROGRAMME FRANÇAIS)

1. **PROBABILITÉS :**
   - **Valeurs numériques :** Une probabilité $P(A)$ est TOUJOURS un nombre compris entre 0 et 1.
   - **Interdiction formelle :** Ne jamais écrire "P(A) = 40%". L'expression mathématique doit utiliser des décimales (ex: $P(A) = 0,4$).
   - **Interprétation :** On utilise les pourcentages UNIQUEMENT pour l'interprétation concrète. 
     *Exemple correct :* "P(A) = 0,4. On peut donc dire qu'il y a 40 % de chances que l'événement A se réalise."
   - **Notation Inter/Union :** Utiliser $P(A \cap B)$ et $P(A \cup B)$ avec les symboles LaTeX corrects.

2. **DÉCIMALES ET NOMBRES :**
   - **Texte :** Utiliser la VIRGULE comme séparateur décimal dans toutes les phrases (ex: 3,5 cm).
   - **LaTeX :** Dans les formules, l'usage du point est toléré si nécessaire pour KaTeX, mais la virgule est préférée pour le texte mathématique français ($0,75$).

3. **INTERVALLES :**
   - **Notation française :** Utiliser les crochets tournés vers l'extérieur pour les intervalles ouverts : $]a ; b[$ au lieu de $(a, b)$.
   - **Séparateur :** Utiliser le point-virgule entre les bornes pour éviter la confusion avec la virgule décimale : $[0 ; 1,5]$.

4. **VECTEURS :**
   - **Notation :** TOUJOURS une flèche sur les vecteurs : $\\vec{u}$ ou $\\vec{AB}$.
   - **Terminologie :** 
     - "Origine" au lieu de "queue".
     - "Extrémité" au lieu de "tête".
     - "Coordonnées" au lieu de "composantes".

5. **FONCTIONS :**
   - **Vocabulaire :** Ne pas confondre "fonction" (l'objet $f$) et "image" (la valeur $f(x)$). 
   - **Tableaux :** Utiliser les flèches $\\nearrow$ et $\\searrow$ pour les variations et $0$ sur la barre de signe pour les racines.
`;
