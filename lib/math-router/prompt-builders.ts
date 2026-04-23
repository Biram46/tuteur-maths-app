/**
 * prompt-builders.ts
 * Constructeurs de prompts pour réduire la taille de useMathRouter.
 */

interface SignFactor {
    type: 'numerator' | 'denominator';
    label: string;
    root?: number;
}

interface SignTableEngineData {
    factors: SignFactor[];
    effectiveConst?: number;
    discriminantSteps?: { factor: string; steps: string[] }[];
    zeros?: number[];
    forbiddenValues?: number[];
    fxValues?: string[];
    aaaBlock?: string;
}

import { ChatMessage } from '@/lib/perplexity';
import { NiveauLycee } from '@/lib/niveaux';
import { prettifyExpr } from './math-text-utils';

export interface ExQ {
    num: string;
    text: string;
    type: 'sign_table' | 'sign_table_f' | 'variation_table' | 'graph' | 'solve' | 'parity' | 'limits' | 'derivative_sign' | 'ai';
}

/**
 * Construit le prompt pédagogique pour une question d'exercice 
 * selon le type de la question et l'état des tableaux générés.
 */
export function buildExerciceQuestionPrompt(
    q: ExQ, 
    signCtx: string, 
    hasStudyDerivSign: boolean, 
    hasStudyVarTable: boolean
): string {
    if (q.type === 'parity') {
        return `**${q.num})** ${q.text}\nÉtudie la parité de f :\n- Précise le domaine de définition Df et vérifie qu'il est symétrique par rapport à 0.\n- Calcule f(-x) en détaillant chaque étape.\n- Compare f(-x) avec f(x) et f(-x) avec -f(x).\n- Conclus : f est paire (si f(-x) = f(x)), impaire (si f(-x) = -f(x)), ou ni paire ni impaire.\n- Si paire/impaire, indique la conséquence sur la courbe (axe de symétrie Oy / centre de symétrie O).`;
    } 
    if (q.type === 'limits') {
        return `**${q.num})** ${q.text}\nCalcule les limites aux bornes du domaine de définition :\n- Pour chaque borne (±∞ ou points d'annulation du dénominateur), factorise par le terme de plus haut degré.\n- Utilise la notation lim avec flèche (pas de notation d/dx, c'est hors programme).\n- Interprète graphiquement chaque limite : asymptote horizontale, verticale, ou branche parabolique.\n- Rédige comme dans un programme de Terminale de l'Éducation Nationale.`;
    } 
    if (q.type === 'derivative_sign') {
        return `**${q.num})** ${q.text}\nCalcule f'(x) :\n- Utilise les formules de dérivation du programme (dérivée d'une somme, d'un produit, d'un quotient, de xⁿ).\n- NE PAS utiliser la notation d/dx qui est HORS PROGRAMME Lycée. Utilise f'(x).\n- Factorise f'(x) au maximum.\n- Étudie le signe de f'(x) : trouve les valeurs où f'(x) = 0, détermine le signe sur chaque intervalle.` +
            (hasStudyVarTable 
                ? `\n⚠️ NE DESSINE PAS DE TABLEAU DE SIGNES ICI et n'écris pas le marqueur [TABLE_SIGNES]. Contente-toi du texte, car le signe sera intégré au [TABLE_VARIATIONS] de la question suivante.`
                : `\n- Présente le résultat dans un tableau de signes clair de f'(x).\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\begin{array})`);
    } 
    if (q.type === 'sign_table') {
        return `**${q.num})** ${q.text}\nExplique la méthode en suivant ces étapes :\n1. Factorisation : utilise EXACTEMENT la factorisation SymPy ci-dessous, NE la modifie PAS.\n${signCtx}\n2. Pour chaque facteur de degré 2 (trinôme) : calcule Δ = b² - 4ac. NE FACTORISE PAS le trinôme en produit de facteurs de degré 1 (ex: NE PAS écrire x²-1 = (x-1)(x+1)). Utilise la règle : signe de a à l'extérieur des racines, signe opposé entre les racines.\n3. Pour chaque facteur de degré 1 : indique le signe de part et d'autre de la racine.\n4. Applique la règle des signes du produit.\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\\\\\begin{array})`;
    } 
    if (q.type === 'sign_table_f') {
        return `**${q.num})** ${q.text}\n` +
            `Étape 1 : Calculer Δ pour trouver les racines de f(x) (OBLIGATOIRE, même si les racines sont évidentes) :\n` +
            `  - Identifier a, b, c dans f(x) = ax² + bx + c\n` +
            `  - Calculer Δ = b² - 4ac (montrer le calcul numérique)\n` +
            `  - Calculer x₁ = (-b - √Δ) / 2a et x₂ = (-b + √Δ) / 2a (montrer le calcul)\n` +
            `Étape 2 : Étudier le signe du trinôme : rappeler la règle du signe de 'a' à l'extérieur des racines.\n` +
            `Étape 3 : Dresser le tableau de signes de f(x)${signCtx}\n` +
            `Termine en écrivant EXACTEMENT sur une ligne seule : [TABLE_SIGNES]\n` +
            `(⛔ NE fais PAS de tableau toi-même — le tableau SymPy est inséré automatiquement)\n` +
            `Étape 4 : Utilise le tableau de signes. Pour >0 ou ≥0, garde UNIQUEMENT les intervalles où f(x) a un signe '+'. Pour <0 ou ≤0, garde UNIQUEMENT les intervalles avec un signe '-'. Attention aux valeurs interdites (||).\n` +
            `Encadre OBLIGATOIREMENT TOUTE la ligne de solution finale dans **$ $**.\nExemple de format : **$S = ]-\\infty ; x_1[ \\cup ]x_2 ; +\\infty[$** (L'union doit correspondre rigoureusement aux bons signes, ne te trompe pas !)`;
    } 
    if (q.type === 'solve') {
        return `**${q.num})** ${q.text}\nCommence par : "D'après le tableau de signes de la question précédente, ..."\n⛔ ATTENTION : Lis TRÈS ATTENTIVEMENT la dernière ligne (f(x)) du tableau pour trouver EXACTEMENT les bons intervalles (+ ou - selon l'inégalité demandée). Ne te trompe pas sur les valeurs des bornes (-∞, x₁, x₂, +∞) !\nConclus OBLIGATOIREMENT par la solution exacte **S = ...** en l'encadrant ENTIÈREMENT avec des symboles **$ $**. Utilise correctement \\cup pour l'union et \\infty.`;
    } 
    if (q.type === 'variation_table') {
        return `**${q.num})** ${q.text}\nExplique : calcule f'(x) avec les formules programme Lycée (PAS de notation d/dx), étudie le signe de f'(x), détermine les intervalles de croissance et décroissance, calcule la valeur de l'extremum.\nTermine en écrivant EXACTEMENT sur une ligne seule : [TABLE_VARIATIONS]\n(le tableau SymPy sera inséré automatiquement, NE fais PAS de tableau toi-même, NE génère PAS de \\\\begin{array})`;
    } 
    if (q.type === 'graph') {
        return `**${q.num})** ${q.text}\nLa courbe a été tracée automatiquement par le moteur graphique. Clique sur le bouton ci-dessous pour l'ouvrir.`;
    } 
    return `**${q.num})** ${q.text}\nRéponds de manière pédagogique en suivant strictement le programme de Terminale de l'Éducation Nationale (Bulletin Officiel).\nNe PAS utiliser de notation hors programme (comme d/dx, nabla, etc.).${hasStudyDerivSign ? '\n⚠️ Le tableau de signes de f\'(x) est DÉJÀ généré automatiquement par le moteur SymPy. NE génère PAS ton propre tableau.' : ''}${hasStudyVarTable ? '\n⚠️ Le tableau de variations est DÉJÀ généré automatiquement par le moteur SymPy. NE génère PAS ton propre tableau.' : ''}`;
}

/**
 * Construit les contraintes pédagogiques selon le niveau pour l'API.
 */
export function buildNiveauConstraints(exerciceNiveau: string, niveauLabel: string): string {
    if (exerciceNiveau.startsWith('seconde')) return `
⛔⛔⛔ NIVEAU SECONDE — INTERDICTIONS ABSOLUES DANS CET EXERCICE ⛔⛔⛔
- ⛔ JAMAIS utiliser le discriminant Δ = b² - 4ac (HORS PROGRAMME SECONDE)
- ⛔ JAMAIS calculer des racines avec x = (-b ± √Δ) / 2a
- ⛔ JAMAIS écrire "On calcule Δ" ou "Δ = ..."
- ⛔ JAMAIS dériver f (pas de f'(x) en Seconde)
- ✅ Pour factoriser : utiliser UNIQUEMENT les identités remarquables (a²-b²=(a-b)(a+b)) ou le facteur commun évident
- ✅ Pour résoudre une inéquation : TOUJOURS tableau de signes avec les facteurs affines
- ✅ Les facteurs affines sont directement lisibles dans les expressions fournies par l'exercice
`;
    if (exerciceNiveau.startsWith('premiere')) return `
⚠️ NIVEAU ${niveauLabel} — RÈGLES POUR CET EXERCICE :
- ✅ Discriminant Δ autorisé pour les polynômes du 2nd degré
- ✅ Dérivée f'(x) autorisée (notation de Lagrange UNIQUEMENT, JAMAIS d/dx)
- ⛔ JAMAIS calculer des limites en ±∞ (hors programme Première)
- ✅ Pour toute inéquation f(x) > 0 : OBLIGATOIREMENT tableau de signes @@@table
`;
    return `
⚠️ NIVEAU TERMINALE — RÈGLES POUR CET EXERCICE :
- ✅ Toutes les méthodes autorisées (dérivées, limites, asymptotes)
- ✅ Discriminant Δ autorisé
- ⛔ JAMAIS développements limités, équivalents (~), Taylor-Young
- ✅ Pour toute inéquation f(x) > 0 : OBLIGATOIREMENT tableau de signes @@@table
`;
}

/**
 * Construit les instructions détaillées pour forcer l'IA à expliquer
 * correctement le tableau de signes généré.
 */
export function buildSignTableInstructions(engineData: SignTableEngineData, expr: string, tableBlock: string, inputText: string): string {
    const parts: string[] = [];
    parts.push(`[INSTRUCTIONS CACHÉES DU SYSTÈME AUTOMATIQUE DE MATHS] ⚠️ Le tableau de signes de f(x) = ${expr} est DÉJÀ AFFICHÉ au-dessus. NE GÉNÈRE AUCUN tableau.`);
    parts.push(`\n**VOICI LE TABLEAU EXACT GÉNÉRÉ PAR LE MOTEUR (blocs @@@) :**\n${tableBlock}\n`);

    // Factorisation SymPy
    if (engineData.factors?.length) {
        let factorizationStr = '';
        const numFactors = engineData.factors.filter(f => f.type === 'numerator').map(f => f.label);
        const denFactors = engineData.factors.filter(f => f.type === 'denominator').map(f => f.label);
        const constPart = engineData.effectiveConst && Math.abs(engineData.effectiveConst - 1) > 1e-10 && Math.abs(engineData.effectiveConst + 1) > 1e-10
            ? `${engineData.effectiveConst} × ` : '';
        if (numFactors.length > 0) {
            factorizationStr = `${constPart}${numFactors.map((f: string) => `(${f})`).join(' × ')}`;
            // Ne l'appeler "FACTORISATION" que s'il y a vraiment plusieurs facteurs
            if (numFactors.length > 1 || constPart) {
                parts.push(`\n📌 FORME À UTILISER : f(x) = ${factorizationStr}`);
            }
        }
        if (denFactors.length > 0) {
            parts.push(`📌 DÉNOMINATEUR : ${denFactors.map((f: string) => `(${f})`).join(' × ')}`);
        }
    }

    // INTERDICTION EXPLICITE
    parts.push(`\n⛔⛔⛔ INTERDICTIONS ABSOLUES ⛔⛔⛔`);
    parts.push(`- NE FACTORISE JAMAIS LES TRINÔMES pour faire un tableau ! (ex: on n'utilise jamais (x-1)(x+1) pour faire deux lignes dans un tableau, on garde la ligne x²-1).`);
    parts.push(`- NE DESSINE STRICTEMENT AUCUN TABLEAU (pas de markdown genre |x|...|, pas de LaTeX, pas de tirets). Le tableau est déjà codé dans l'application et s'affiche au-dessus de ta réponse !`);
    parts.push(`- Ne donne QU'UNE SEULE ET UNIQUE méthode de résolution (celle avec le discriminant si c'est un degré 2). Il est STRICTEMENT INTERDIT de proposer une seconde méthode (ni racines évidentes, ni factorisation).`);

    // Étapes discriminant Δ
    if (engineData.discriminantSteps?.length) {
        parts.push(`\n📐 MÉTHODE DU DISCRIMINANT OBLIGATOIRE pour l'explication :`);
        parts.push(`⚠️ INTERDICTION STRICTE DE FACTORISER DAVANTAGE CES TRINÔMES (pas d'identités remarquables) ! Garde le trinôme entier et étudie son signe avec le signe de 'a'.`);
        for (const s of engineData.discriminantSteps) {
            parts.push(`\n▸ Pour le facteur ${s.factor} :`);
            for (const step of s.steps) {
                parts.push(`  ${step}`);
            }
        }
    }

    if (engineData.fxValues && engineData.fxValues.length > 0) {
        parts.push(`\n📌 **AIDE INFAILLIBLE FOURNIE PAR LE SYSTÈME** 📌`);
        parts.push(`Le système a calculé formellement les signes de f(x) sur les intervalles séparés par les racines (de gauche à droite) :`);
        
        const xMatch = (engineData.aaaBlock || '').match(/x:\s*([^|]+)/);
        const xStr = xMatch ? xMatch[1].trim() : '';
        const xArr = xStr ? xStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
        
        if (xArr.length >= 2 && engineData.fxValues.length === 2 * xArr.length - 3) {
            for (let i = 0; i < xArr.length - 1; i++) {
                const left = xArr[i];
                const right = xArr[i + 1];
                const sign = engineData.fxValues[2 * i];
                parts.push(`- Sur l'intervalle ]${left}; ${right}[ : l'expression est de signe ${sign}`);
                if (i < xArr.length - 2) {
                    const ptSign = engineData.fxValues[2 * i + 1];
                    parts.push(`- En x = ${right} : l'expression vaut ${ptSign === '||' ? 'NON DÉFINIE (||)' : ptSign}`);
                }
            }
        } else {
            // Fallback
            if (xArr.length > 0) parts.push(`- Valeurs de x : ${xArr.join(' ; ')}`);
            parts.push(`- Signes successifs de f(x) : ${engineData.fxValues.join(' puis ')}`);
        }
        parts.push(`Tu DOIS ABSOLUMENT te calquer sur ces signes pour justifier le résultat et trouver l'ensemble de solutions S, ne propose pas une autre méthode.`);
    }

    parts.push(`\n**CONCLUSION ATTENDUE :**`);
    if (inputText.match(/>|<|≥|≤|>=|<=/)) {
        parts.push(`Avant de donner la solution, TU DOIS IMPÉRATIVEMENT prendre le temps de lister chaque intervalle du tableau avec son signe correspondant (ex: Sur ]-inf, 2[, f(x) est -). C'est crucial pour ne pas te tromper.`);
        parts.push(`Ensuite seulement, déduis logiquement la solution finale et termine par LA SOLUTION EXACTE de l'inéquation en tapant : **S = ...**`);
    } else if (inputText.match(/(?:équa|equation|résoud|solution)/i)) {
        parts.push(`Termine simplement par l'ensemble exact des solutions de l'équation en tapant : S = { ... }`);
    } else {
        parts.push(`⛔ NE DONNE SURTOUT PAS d'ensemble de solution S=... à la fin ! On t'a simplement demandé le tableau ou l'étude de signe, pas de résoudre une inéquation.`);
    }

    return parts.join('\n');
}

/**
 * Construit le prompt système principal pour la géométrie.
 */
export function buildGeometrySystemPrompt(previousGeoBlock: string): string {
    const previousContext = previousGeoBlock
        ? `\n\n⛔⛔⛔ SCÈNE EXISTANTE — TU DOIS REPRENDRE INTÉGRALEMENT TOUS CES OBJETS ⛔⛔⛔
@@@
${previousGeoBlock}
@@@
⛔ COPIE D'ABORD TOUS les points, segments, droites, cercles ci-dessus dans ton nouveau bloc.
⛔ ENSUITE ajoute les nouveaux éléments demandés par l'élève.
⛔ Si tu oublies un seul objet de la scène existante, la figure sera CASSÉE !`
        : '';

    return `[SYSTÈME GÉOMÉTRIE] L'élève demande une figure géométrique.
${previousGeoBlock ? '⚠️ UNE FIGURE EXISTE DÉJÀ. Tu dois la CONSERVER et y AJOUTER les nouveaux éléments.' : ''}
Tu DOIS répondre avec UN SEUL bloc @@@...@@@ au format suivant :

@@@
geo
title: [titre de la figure]
point: A, [x], [y]
point: B, [x], [y]
[...autres points...]
segment: AB
[...ou: droite: AB | cercle: O, r | triangle: A, B, C | vecteur: AB | angle: A,B,C | angle_droit: A,B,C]
parallele: P, AB
perpendiculaire: P, AB
compute: distance AB
compute: milieu AB
@@@

Puis explique la figure pédagogiquement.

⛔ RÈGLE ABSOLUE : Tu DOIS TOUJOURS déclarer chaque point avec ses coordonnées (point: X, x, y) AVANT de l'utiliser dans un segment, triangle, etc. 
⛔ Si l'élève ne donne PAS les coordonnées, TU choisis des coordonnées adaptées pour que la figure soit lisible.
⛔ Exemple : "trace un triangle ABC" → TU calcules des coordonnées : A(0,0), B(4,0), C(2,3)

⚠️ NOTATION FRANÇAISE DES COORDONNÉES :
- L'élève écrit souvent A(4; 5) avec un POINT-VIRGULE — interprète-le comme x=4, y=5.
- Dans ton bloc geo, utilise TOUJOURS la virgule : point: A, 4, 5  (jamais de ; dans le bloc).

⚠️ MÉDIATRICE d'un segment [AB] :
  mediatrice: A, B [, label]
  (le moteur calcule le milieu M, la droite perpendiculaire ET le ⊾ automatiquement)
  ⛔ N'utilise PAS perpendiculaire: + point: M séparément — utilise mediatrice:.
  ⚠️ IMPORTANT : Si l'élève demande les médiatrices d'un triangle, TU dois aussi déclarer le triangle (triangle: A, B, C).

⚠️ RECTANGLE ET CARRÉ :
  - Un "rectangle ABCD", "carré ABCD", "carré de côté 5" n'a PAS de commande native.
  - Tu DOIS déclarer les 4 sommets avec les BONNES coordonnées : point: A,x,y puis B, C, D.
  - Tu DOIS déclarer polygon: A,B,C,D (PAS de segment:).
  - Tu DOIS déclarer les 4 angles droits : angle_droit: D,A,B puis A,B,C etc.

⚠️ VECTEURS :
Exemple pour tracer un vecteur de A vers B :
@@@
point: A, x, y
point: B, x, y
vecteur: AB
@@@

Si le vecteur a un NOM (ex: $\vec{u}$, $\vec{v}$) : ajoute le nom en 3e argument.
⛔ JAMAIS laisser le label par défaut "AB" si l'élève demande $\vec{u}$ — tu DOIS mettre le nom.
@@@
point: A, x, y
point: B, x, y
vecteur: AB, u
@@@

Si l'élève donne les COORDONNÉES du vecteur $\vec{u}(2; 3)$ :
@@@
vecteur: u(2, 3)
@@@

Si on trace les vecteurs AB et AC :
@@@
point: A, x, y
point: B, x, y
point: C, x, y
vecteur: AB
vecteur: AC
@@@

- Pour nommer une droite, utilise le 3e argument : parallele: N, BC, (d) ou perpendiculaire: C, d, (Δ)
- L'élève tape "delta" au clavier → TU convertis en symbole : (Δ). Idem : "delta'" → (Δ')
- Conversions obligatoires : delta → Δ, gamma → Γ, alpha → α, beta → β
- Pour référencer une droite existante, utilise le label COURT : "d" pour (d), et "d" pour (Δ) aussi (le moteur comprend les alias delta/d/Δ)

⚠️ TANGENTE À UN CERCLE :
- Pour tracer une tangente à un cercle en un point M, commence par définir le segment du rayon (ex: segment: OM), puis trace la perpendiculaire à ce rayon passant par M (ex: perpendiculaire: M, OM, (T)).

La figure s'ouvrira automatiquement dans la fenêtre géomètre.${previousContext}`;
}

/**
 * Construit le prompt système principal pour les arbres de probabilités.
 */
export function buildProbabilitySystemPrompt(isBinomialLargeN: boolean, nRep: number): string {
    return `[SYSTÈME ARBRE DE PROBABILITÉS]
L'élève demande un arbre de probabilités. Tu DOIS inclure un bloc @@@...@@@ au format arbre.

FORMAT OBLIGATOIRE du bloc @@@:
@@@
arbre: [titre de l'arbre]
[chemin avec ->], [probabilité NUMÉRIQUE]
@@@

RÈGLES :
- Première ligne après @@@ : "arbre: Titre"
- NE PAS écrire la ligne "Ω, 1" — la racine Ω est automatique
- Chaque ligne = un chemin complet depuis la racine : A, 0.3 ou A->B, 0.4
- Le chemin utilise -> pour séparer les niveaux : A->B signifie "B sachant A"
- La probabilité DOIT être un NOMBRE (décimal ou fraction) : 0.3, 0.7, 1/3, 2/5
- ⛔⛔ JAMAIS de P(B|A), P(B), P_A(B) comme valeur — uniquement des NOMBRES !
- ⛔⛔ JAMAIS de | (pipe) dans les valeurs — ça casse le parser !
- Si une probabilité est inconnue, écris "?" 
- Pour le complémentaire, utilise la barre Unicode : Ā, B̄ (pas A' ni \\bar{A})
- NE mets PAS de résultats aux feuilles (pas de P(A∩B) = ...)
- La somme des branches d'un même nœud = 1

⛔⛔⛔ RÈGLE CRITIQUE POUR LES GRANDES EXPÉRIENCES (n répétitions) ⛔⛔⛔
${isBinomialLargeN ? `
🚨 DÉTECTÉ : n = ${nRep} répétitions → L'arbre COMPLET aurait ${Math.pow(2, nRep)} feuilles — IMPOSSIBLE à afficher.
👉 Tu DOIS dessiner UNIQUEMENT un arbre partiel des 3 PREMIERS NIVEAUX (= 3 lancers).
👉 Écris clairement dans ton explication : "L'arbre complet a ${nRep} niveaux. On illustre ici les 3 premiers."
👉 Pour les probabilités : utilise la même probabilité p à chaque niveau (épreuves indépendantes).
` : `
- Si l'expérience comporte n ≥ 4 répétitions identiques (loi binomiale, lancers de pièce, tirages avec remise n≥4), NE DESSINE PAS l'arbre entier. Trace UNIQUEMENT les 3 premiers niveaux et indique "arbre partiel".
`}

EXEMPLE pour "arbre avec P(A) = 0.4, P(B|A) = 0.3, P(B|Ā) = 0.5" :
@@@
arbre: Expérience aléatoire
A, 0.4
Ā, 0.6
A->B, 0.3
A->B̄, 0.7
Ā->B, 0.5
Ā->B̄, 0.5
@@@

EXEMPLE LANCER DE PIÈCE 3 FOIS (arbre partiel pour n=5) :
@@@
arbre: Lancer de pièce — 3 premiers niveaux (arbre partiel)
P, 0.5
F, 0.5
P->P, 0.5
P->F, 0.5
F->P, 0.5
F->F, 0.5
P->P->P, 0.5
P->P->F, 0.5
P->F->P, 0.5
P->F->F, 0.5
F->P->P, 0.5
F->P->F, 0.5
F->F->P, 0.5
F->F->F, 0.5
@@@

EXEMPLE pour tirage avec remise :
@@@
arbre: Tirage avec remise
R, 3/5
V, 2/5
R->R, 3/5
R->V, 2/5
V->R, 3/5
V->V, 2/5
@@@

⛔ Si tu oublies le bloc @@@ ou que le format est faux, l'arbre ne s'affichera PAS !
⛔ Chaque probabilité doit être un NOMBRE : 0.3, 1/3, 0.7 — JAMAIS P(X), P_A(B), P(B|A) !

Après le bloc @@@, explique brièvement l'arbre et les propriétés utilisées.`;
}
