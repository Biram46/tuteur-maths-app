/**
 * CONTRAINTES PÉDAGOGIQUES - PROGRAMME ÉDUCATION NATIONALE (LYCÉE)
 * Ce fichier définit les règles de rigueur mathématique à respecter impérativement.
 */

export const PEDAGOGICAL_CONSTRAINTS = `
### RÈGLES DE RIGUEUR MATHÉMATIQUE (PROGRAMME FRANÇAIS)

1. **PROBABILITÉS :**
   - **Valeurs numériques :** Une probabilité $P(A)$ est TOUJOURS un nombre compris entre 0 et 1.
   - **Interdiction formelle :** Ne jamais écrire "P(A) = 40%". Toute valeur de probabilité doit être une décimale (ex: $P(A) = 0,4$).
   - **Interprétation (IMPÉRATIF) :** Tu DOIS utiliser les pourcentages pour traduire la probabilité en langage courant.
     *Exemple correct :* "La probabilité est $P(E) = 0,15$. L'interprétation est la suivante : 15 % des pannes entraînent une casse."
     *Exemple incorrect :* "0,15 des pannes entraînent une casse."
   - **Notation Inter/Union :** Utiliser $P(A \cap B)$ et $P(A \cup B)$ avec les symboles LaTeX corrects.
   - **Probabilités Conditionnelles :** Utiliser la notation française $P_A(B)$ (avec $A$ en indice) et JAMAIS la notation anglo-saxonne $P(B|A)$.
   - **Formule des Probabilités Totales :** Avant toute utilisation, tu DOIS préciser que les événements (ex: $R$ et $\bar{R}$) forment une **partition de l'univers $\Omega$**.
   - **Rigueur :** Toujours écrire la formule littérale avant le calcul.

2. **DÉCIMALES ET NOMBRES :**
   - **Règle absolue :** Utiliser la VIRGULE comme unique séparateur décimal dans absolument TOUS les contextes : texte, calculs et formules LaTeX (ex: $0,5$ ; $x = 1,2$).
   - **Interdiction :** Le point (.) ne doit JAMAIS être utilisé pour les nombres décimaux (sauf dans les blocs techniques @@@ pour le moteur graphique).

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
