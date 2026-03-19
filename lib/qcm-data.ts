export type QcmCategory =
    | "Calcul numérique et algébrique"
    | "Proportions et pourcentages"
    | "Évolutions et variations"
    | "Fonctions"
    | "Statistiques"
    | "Probabilités";

export interface QcmQuestion {
    id: string;
    category: QcmCategory;
    question: string;
    options: string[];
    correctAnswerIndex: number;
}

export const qcmDatabase: QcmQuestion[] = [
    // --- Calcul numérique et algébrique ---
    {
        id: "calc-1",
        category: "Calcul numérique et algébrique",
        question: "Quelle est la forme développée et réduite de l'expression $A(x) = (2x - 3)^2$ ?",
        options: [
            "$4x^2 - 12x + 9$",
            "$4x^2 - 9$",
            "$4x^2 - 6x + 9$",
            "$2x^2 - 12x + 9$"
        ],
        correctAnswerIndex: 0
    },
    {
        id: "calc-2",
        category: "Calcul numérique et algébrique",
        question: "Combien de solutions réelles l'équation $x^2 = 16$ possède-t-elle ?",
        options: [
            "Une seule solution : $4$",
            "Deux solutions : $-4$ et $4$",
            "Aucune solution",
            "Deux solutions : $-8$ et $8$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "calc-3",
        category: "Calcul numérique et algébrique",
        question: "Quelles sont les solutions de l'équation $(x - 5)(2x + 4) = 0$ ?",
        options: [
            "$-5$ et $4$",
            "$-5$ et $2$",
            "$5$ et $-2$",
            "$5$ et $-4$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "calc-4",
        category: "Calcul numérique et algébrique",
        question: "Laquelle de ces fractions est irréductible et égale à $\\dfrac{84}{126}$ ?",
        options: [
            "$\\dfrac{42}{63}$",
            "$\\dfrac{4}{6}$",
            "$\\dfrac{2}{3}$",
            "$\\dfrac{14}{21}$"
        ],
        correctAnswerIndex: 2
    },

    // --- Proportions et pourcentages ---
    {
        id: "prop-1",
        category: "Proportions et pourcentages",
        question: "Dans une classe de 30 élèves, 12 font du théâtre. Quelle est la proportion (en pourcentage) d'élèves faisant du théâtre ?",
        options: [
            "$30\\%$",
            "$36\\%$",
            "$40\\%$",
            "$42\\%$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "prop-2",
        category: "Proportions et pourcentages",
        question: "La fraction $\\dfrac{3}{8}$ correspond à un pourcentage exact de :",
        options: [
            "$37,5\\%$",
            "$38\\%$",
            "$3,8\\%$",
            "$37\\%$"
        ],
        correctAnswerIndex: 0
    },
    {
        id: "prop-3",
        category: "Proportions et pourcentages",
        question: "Si $20\\%$ des $80$ pommes d'un panier sont gâtées, combien y a-t-il de pommes gâtées ?",
        options: [
            "$16$",
            "$20$",
            "$8$",
            "$60$"
        ],
        correctAnswerIndex: 0
    },

    // --- Évolutions et variations ---
    {
        id: "evol-1",
        category: "Évolutions et variations",
        question: "Un article coûte $45$ €. Son prix baisse de $20\\%$. Quel est son nouveau prix ?",
        options: [
            "$25$ €",
            "$36$ €",
            "$35$ €",
            "$41$ €"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "evol-2",
        category: "Évolutions et variations",
        question: "Quel est le coefficient multiplicateur (CM) global correspondant à une hausse de $10\\%$ suivie d'une baisse de $10\\%$ ?",
        options: [
            "$1,00$",
            "$0,99$",
            "$1,10$",
            "$0,90$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "evol-3",
        category: "Évolutions et variations",
        question: "Le prix d'un produit a été multiplié par $1,4$. Quel est le taux d'évolution de ce prix ?",
        options: [
            "Baisse de $40\\%$",
            "Hausse de $4\\%$",
            "Hausse de $40\\%$",
            "Hausse de $140\\%$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "evol-4",
        category: "Évolutions et variations",
        question: "Une action en bourse perd $50\\%$ de sa valeur. Quelle évolution réciproque doit-elle subir pour retrouver sa valeur initiale ?",
        options: [
            "Hausse de $50\\%$",
            "Hausse de $100\\%$",
            "Multipliée par $1,5$",
            "Hausse de $200\\%$"
        ],
        correctAnswerIndex: 1
    },

    // --- Fonctions ---
    {
        id: "fonc-1",
        category: "Fonctions",
        question: "On donne la fonction affine $f(x) = -2x + 5$. Quelle est son ordonnée à l'origine ?",
        options: [
            "$-2$",
            "$0$",
            "$5$",
            "$2$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "fonc-2",
        category: "Fonctions",
        question: "D'après un tableau de signes, on sait que $f(x) > 0$ sur l'intervalle $]-2 ; 5[$. \n\nLequel de ces nombres est donc une solution stricte de l'inéquation $f(x) > 0$ ?",
        options: [
            "$-3$",
            "$-2$",
            "$0$",
            "$5$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "fonc-3",
        category: "Fonctions",
        question: "Le tableau de variation d'une fonction $g$ indique qu'elle est strictement croissante sur $[-5 ; 0]$ et strictement décroissante sur $[0 ; +\\infty[$. Quel est le maximum de $g$ ?",
        options: [
            "$g(-5)$",
            "$0$",
            "$g(0)$",
            "Il n'y a pas de maximum"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "fonc-4",
        category: "Fonctions",
        question: "La représentation graphique de la fonction $h(x) = x^2$ est une :",
        options: [
            "Droite qui passe par l'origine",
            "Droite qui ne passe pas par l'origine",
            "Parabole",
            "Sinusoïde"
        ],
        correctAnswerIndex: 2
    },

    // --- Statistiques ---
    {
        id: "stat-1",
        category: "Statistiques",
        question: "Dans la série ordonnée de valeurs $(2, 4, 4, 5, 8, 9, 10)$, quelle est la médiane ?",
        options: [
            "$4$",
            "$5$",
            "$6$",
            "$8$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "stat-2",
        category: "Statistiques",
        question: "Dans une boîte à moustaches, le bord limitant la partie droite du rectangle central correspond au :",
        options: [
            "Premier quartile ($Q_1$)",
            "Troisième quartile ($Q_3$)",
            "Maximum",
            "Décile 9"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "stat-3",
        category: "Statistiques",
        question: "La moyenne pondérée de 4 copies est de $12 / 20$. On ajoute une 5ème copie remarquable notée $17 / 20$. Quelle est la nouvelle moyenne ?",
        options: [
            "$13$",
            "$14,5$",
            "$15$",
            "$12,5$"
        ],
        correctAnswerIndex: 0
    },

    // --- Probabilités ---
    {
        id: "prob-1",
        category: "Probabilités",
        question: "On tire une carte au hasard dans un jeu de 32 cartes (trèfles, cœurs, carreaux, piques). Quelle est la probabilité de tirer un roi ?",
        options: [
            "$\\dfrac{1}{4}$",
            "$\\dfrac{1}{8}$",
            "$\\dfrac{1}{32}$",
            "$\\dfrac{4}{8}$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-2",
        category: "Probabilités",
        question: "L'événement contraire $\\overline{A}$ d'un événement $A$ a pour probabilité $P(\\overline{A}) = 0,3$. Quelle est la probabilité $P(A)$ ?",
        options: [
            "$0,3$",
            "$0,7$",
            "$-0,3$",
            "$1$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-3",
        category: "Probabilités",
        question: "Sur un arbre de probabilité pondéré, la probabilité d’un chemin complet est égale au :",
        options: [
            "Produit des probabilités de chacune de ses branches",
            "À la somme des probabilités de chacune de ses branches",
            "À la différence des probabilités",
            "Au produit du premier et du dernier nœud exclusivement"
        ],
        correctAnswerIndex: 0
    },
    {
        id: "prob-4",
        category: "Probabilités",
        question: "Si deux événements $A$ et $B$ sont incompatibles, que vaut $P(A \\cup B)$ ?",
        options: [
            "$P(A) \\times P(B)$",
            "$P(A) + P(B) - P(A \\cap B)$",
            "$P(A) + P(B)$",
            "$1$"
        ],
        correctAnswerIndex: 2
    }
];

export function generateRandomQcmSession(numberOfQuestions: number = 12): QcmQuestion[] {
    // Organiser par catégories
    const questionsByCategory: Record<string, QcmQuestion[]> = {};
    for (const q of qcmDatabase) {
        if (!questionsByCategory[q.category]) questionsByCategory[q.category] = [];
        questionsByCategory[q.category].push(q);
    }

    const categories = Object.keys(questionsByCategory);
    const selected: QcmQuestion[] = [];
    const questionsPerCategory = Math.max(1, Math.floor(numberOfQuestions / categories.length));

    // Tirer 'questionsPerCategory' dans chaque catégorie
    for (const cat of categories) {
        const catQuestions = [...questionsByCategory[cat]].sort(() => Math.random() - 0.5);
        selected.push(...catQuestions.slice(0, questionsPerCategory));
    }

    // Compléter avec du tirage aléatoire sur le reste si besoin (improbable vu qu'on a 6*2 = 12)
    if (selected.length < numberOfQuestions) {
        const remainingPool = qcmDatabase.filter(q => !selected.find(s => s.id === q.id));
        remainingPool.sort(() => Math.random() - 0.5);
        selected.push(...remainingPool.slice(0, numberOfQuestions - selected.length));
    }

    // Mélanger le résultat final
    return selected.sort(() => Math.random() - 0.5);
}
