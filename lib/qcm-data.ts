export type QcmCategory =
    | "Calcul numérique et algébrique"
    | "Proportions et pourcentages"
    | "Évolutions et variations"
    | "Fonctions"
    | "Statistiques"
    | "Probabilités";

import { generateProceduralQuestion } from './qcm-generator';

export interface QcmQuestion {
    id: string;
    category: QcmCategory;
    question: string;
    questionTableData?: any;
    questionGraphData?: any;
    options: string[];
    optionsTableData?: any[];
    optionsGraphData?: any[];
    correctAnswerIndex: number;
    explanation?: string;
}

export const qcmDatabase: QcmQuestion[] = [
    // --- AI IMPORTED FROM LATEX ---
    {
    "question": "On considère la relation \\(M = x + \\dfrac{y - z}{2t}\\). Lorsque \\(x = -1,\\; y = 5,\\; z = 1,\\; t = -2\\), la valeur de \\(M\\) est égale à :",
    "options": [
        "\\(-2\\)",
        "\\(0\\)",
        "\\(2\\)",
        "\\(-3\\)"
    ],
    "id": "bac_blanc_2-qcm-1",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 0,
    "explanation": "\\(-2\\)\n\n\\[\nM = -1 + \\frac{5 - 1}{2 \\times (-2)} = -1 + \\frac{4}{-4} = -1 - 1 = -2\n\\]"
},
    {
    "question": "On considère trois fonctions définies sur \\(\\mathbb{R}\\) :\n\\[k_1(x) = (2x-1)^2 - (x+1)(2x-1),\\quad\nk_2(x) = 3x - \\left(5 - \\frac{x}{2}\\right),\\quad\nk_3(x) = \\frac{4x^2 - (2x-3)^2}{2}\\]\nParmi ces trois fonctions, lesquelles sont des fonctions affines ?",
    "options": [
        "aucune",
        "toutes",
        "uniquement \\(k_2\\)",
        "uniquement \\(k_2\\) et \\(k_3\\)"
    ],
    "id": "bac_blanc_2-qcm-2",
    "category": "Fonctions",
    "correctAnswerIndex": 3,
    "explanation": "uniquement \\(k_2\\) et \\(k_3\\)\n\n\\[\nk_1(x) = (2x-1)^2 - (x+1)(2x-1) = (2x-1)[(2x-1)-(x+1)] = (2x-1)(x-2)\n\\]\n\\[\nk_1(x) = 2x^2 -5x +2 \\text{ (non affine)}\n\\]\n\\[\nk_2(x) = 3x - 5 + \\frac{x}{2} = \\frac{6x + x}{2} - 5 = \\frac{7x}{2} - 5 \\text{ (affine)}\n\\]\n\\[\nk_3(x) = \\frac{4x^2 - (4x^2 - 12x + 9)}{2} = \\frac{4x^2 - 4x^2 + 12x - 9}{2} = \\frac{12x - 9}{2} = 6x - 4,5 \\text{ (affine)}\n\\]"
},
    {
    "question": "Voici une série de notes avec coefficients :\n\\[\n\\begin{array}{|c|c|c|c|c|}\n\\hline\n\\text{Note} & 12 & 8 & 15 & a \\\\\n\\hline\n\\text{Coefficient} & 1 & 1 & 2 & 1 \\\\\n\\hline\n\\end{array}\n\\]\nOn note \\(m\\) la moyenne. Que doit valoir \\(a\\) pour que \\(m = 12\\) ?",
    "options": [
        "\\(7\\)",
        "\\(1\\)",
        "\\(10\\)",
        "\\(4{,}25\\)"
    ],
    "id": "bac_blanc_2-qcm-3",
    "category": "Statistiques",
    "correctAnswerIndex": 2,
    "explanation": "\\(10\\)"
},
    {
    "question": "Un boulanger observe que sur 260 viennoiseries vendues, 85 sont des pains au chocolat. Les pains au chocolat représentent alors (en pourcentage des ventes, arrondi à l'unité) :",
    "options": [
        "\\(25\\%\\)",
        "\\(33\\%\\)",
        "\\(75\\%\\)",
        "\\(35\\%\\)"
    ],
    "id": "bac_blanc_2-qcm-4",
    "category": "Évolutions et variations",
    "correctAnswerIndex": 1,
    "explanation": "\\(33\\%\\)\n\n\\[\n\\frac{85}{260} \\times 100 \\approx 32,69\\% \\approx 33\\%\n\\]"
},
    {
    "question": "On a représenté ci-dessous les boîtes à moustaches de deux séries statistiques. On peut affirmer que :",
    "questionGraphData": {
        "domain": { "x": [0, 20], "y": [0, 3] },
        "boxplots": [
            { "min": 5, "q1": 7, "median": 9, "q3": 13, "max": 15, "label": "Série 1", "color": "#60a5fa" },
            { "min": 3, "q1": 7, "median": 9, "q3": 13, "max": 19, "label": "Série 2", "color": "#f472b6" }
        ]
    },
    "options": [
        "Dans la série 1, la médiane est égale à 9.",
        "Dans la série 2, au moins \\(75\\%\\) des valeurs sont inférieures ou égales à 13.",
        "Les deux séries ont la même étendue.",
        "L'écart interquartile est plus grand pour la série 1 que pour la série 2."
    ],
    "id": "bac_blanc_2-qcm-5",
    "category": "Statistiques",
    "correctAnswerIndex": 1,
    "explanation": "Dans la série 2, au moins \\(75\\%\\) des valeurs sont inférieures ou égales à 13.\n\nAnalyse :\n- A : Médiane série 1 = 9 (vrai, mais pas la seule affirmation vraie)\n- B : Q3 = 13, donc 75\\% des valeurs \\(\\leq\\) 13 (vrai)\n- C : Étendue série 1 = 10, série 2 = 16 (faux)\n- D : Écart interquartile série 1 = 6, série 2 = 6 (faux, ils sont égaux)"
},
    {
    "question": "Aide au calcul : \\(\\pi \\approx 3{,}14\\). L'ordre de grandeur de \\((3\\pi)^2 \\times 120\\) est :",
    "options": [
        "\\(1000\\)",
        "\\(10\\,000\\)",
        "\\(100\\,000\\)",
        "\\(1\\,000\\,000\\)"
    ],
    "id": "bac_blanc_2-qcm-6",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 1,
    "explanation": "\\(10\\,000\\)\n\n\\[\n(3\\pi)^2 \\times 120 = 9\\pi^2 \\times 120 = 1080 \\times \\pi^2\n\\]\n\\(\\pi^2 \\approx 9,86\\), donc \\(1080 \\times 9,86 \\approx 10\\,648 \\approx 10^4\\)"
},
    {
    "question": "\\(\\displaystyle \\frac{4^3 \\times 3^2}{6^2} =\\)",
    "options": [
        "\\(4\\)",
        "\\(8\\)",
        "\\(16\\)",
        "\\(2\\)"
    ],
    "id": "bac_blanc_2-qcm-7",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 2,
    "explanation": "\\(16\\)\n\n\\[\n\\frac{4^3 \\times 3^2}{6^2} = \\frac{64 \\times 9}{36} = \\frac{576}{36} = 16\n\\]"
},
    {
    "question": "La fonction \\(f\\) définie sur \\(\\mathbb{R}\\) par \\(f(x) = 3x - 1\\) admet pour tableau de signe :",
    "options": [
        "$\\begin{array}{c|ccc}\nx & -\\infty & \\frac{1}{3} & +\\infty \\\\ \\hline\nf(x) & - & 0 & +\n\\end{array}$",
        "$\\begin{array}{c|ccc}\nx & -\\infty & \\frac{1}{3} & +\\infty \\\\ \\hline\nf(x) & + & 0 & -\n\\end{array}$",
        "$\\begin{array}{c|ccc}\nx & -\\infty & 0 & +\\infty \\\\ \\hline\nf(x) & - & 0 & +\n\\end{array}$",
        "$\\begin{array}{c|ccc}\nx & -\\infty & 0 & +\\infty \\\\ \\hline\nf(x) & + & 0 & -\n\\end{array}$"
    ],
    "id": "bac_blanc_2-qcm-8",
    "category": "Fonctions",
    "correctAnswerIndex": 0,
    "explanation": "\\(f(x) = 3x - 1\\) s'annule en \\(x = \\frac{1}{3}\\), coefficient directeur \\(3 > 0\\) donc négative avant, positive après."
},
    {
    "question": "Une bactérie de \\(0{,}8\\)\\,g voit sa masse diminuer de \\(25\\%\\). La nouvelle masse est égale à :",
    "options": [
        "\\(0{,}6\\)\\,g",
        "\\(1\\)\\,g",
        "\\(0{,}75\\)\\,g",
        "\\(0{,}2\\)\\,g"
    ],
    "id": "bac_blanc_2-qcm-9",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 0,
    "explanation": "\\(0,6\\) g\n\nDiminuer de 25\\% revient à multiplier par \\(0,75\\) : \\(0,8 \\times 0,75 = 0,6\\)"
},
    {
    "question": "La loi d'interaction gravitationnelle entre deux corps \\(C_1\\) et \\(C_2\\) est\n\\(F = G\\dfrac{m_1 m_2}{d^2}\\) où \\(m_1, m_2\\) sont les masses, \\(d\\) la distance et \\(G\\) la constante gravitationnelle. On a :",
    "options": [
        "\\(d = \\dfrac{F - G}{2m_1 m_2}\\)",
        "\\(d = \\sqrt{\\dfrac{G m_1 m_2}{F}}\\)",
        "\\(d = \\dfrac{G m_1 m_2}{F^2}\\)",
        "\\(d = \\sqrt{\\dfrac{F}{G m_1 m_2}}\\)"
    ],
    "id": "bac_blanc_2-qcm-10",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 1,
    "explanation": "\\(d = \\sqrt{\\dfrac{G m_1 m_2}{F}}\\)\n\n\\[\nF = G\\frac{m_1 m_2}{d^2} \\implies d^2 = \\frac{G m_1 m_2}{F} \\implies d = \\sqrt{\\frac{G m_1 m_2}{F}}\n\\]"
},
    {
    "question": "L'expression développée réduite de \\((5x+4)^2\\) est :",
    "options": [
        "\\(25x^2 + 8x + 16\\)",
        "\\(10x^2 + 20x + 16\\)",
        "\\(25x^2 + 16x + 4\\)",
        "\\(25x^2 + 40x + 16\\)"
    ],
    "id": "bac_blanc_2-qcm-11",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 3,
    "explanation": "\\(25x^2 + 40x + 16\\)\n\n\\[\n(5x+4)^2 = 25x^2 + 2 \\times 5x \\times 4 + 16 = 25x^2 + 40x + 16\n\\]"
},
    {
    "question": "On considère un groupe d'élèves dont la répartition suivant la LV2 choisie et le sexe est donnée ci-dessous :\n\\[\n\\begin{array}{|c|c|c|c|}\n\\hline\n& \\text{Allemand} & \\text{Espagnol} & \\text{Total} \\\\\n\\hline\n\\text{Filles} & 30 & 20 & 50 \\\\\n\\hline\n\\text{Garçons} & 40 & 30 & 70 \\\\\n\\hline\n\\text{Total} & 70 & 50 & 120 \\\\\n\\hline\n\\end{array}\n\\]\nOn choisit un élève au hasard. Quelle est la probabilité que l'élève suive allemand sachant que c'est une fille ?",
    "options": [
        "\\(0{,}25\\)",
        "\\(0{,}6\\)",
        "\\(\\dfrac{3}{7}\\)",
        "\\(\\dfrac{4}{7}\\)"
    ],
    "id": "bac_blanc_2-qcm-12",
    "category": "Probabilités",
    "correctAnswerIndex": 1,
    "explanation": "\\(0,6\\)\n\n\\(P(\\text{Allemand} \\mid \\text{Fille}) = \\dfrac{30}{50} = 0,6 = \\dfrac{3}{5}\\)"
},
    {
    "question": "On peut affirmer que :",
    "options": [
        "$\\dfrac{5}{6} < \\dfrac{6}{7}$",
        "$\\dfrac{5}{6} > \\dfrac{6}{7}$",
        "$\\dfrac{5}{6} = \\dfrac{6}{7}$",
        "On ne peut pas comparer ces deux nombres."
    ],
    "id": "bac_blanc_5-qcm-1",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 0,
    "explanation": "$\\dfrac{5}{6} \\approx 0{,}833$ et $\\dfrac{6}{7} \\approx 0{,}857$, donc $\\dfrac{5}{6} < \\dfrac{6}{7}$. On peut aussi réduire au même dénominateur : $\\dfrac{5}{6} = \\dfrac{35}{42}$ et $\\dfrac{6}{7} = \\dfrac{36}{42}$."
},
    {
    "question": "$1\\ \\text{m}^2$ correspond à :",
    "options": [
        "$0,0001\\ \\text{cm}^2$",
        "$0,01\\ \\text{cm}^2$",
        "$100\\ \\text{cm}^2$",
        "$10\\,000\\ \\text{cm}^2$"
    ],
    "id": "bac_blanc_5-qcm-2",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 3,
    "explanation": "$1\\text{ m} = 100\\text{ cm}$, donc $1\\text{ m}^2 = (100)^2\\text{ cm}^2 = 10\\,000\\text{ cm}^2$."
},
    {
    "question": "Dans une classe de 30 élèves, 40\\% sont des filles. Le nombre de filles est :",
    "options": [
        "12",
        "15",
        "18",
        "20"
    ],
    "id": "bac_blanc_5-qcm-3",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 0,
    "explanation": "$40\\%$ de $30 = \\dfrac{40}{100} \\times 30 = 12$ filles."
},
    {
    "question": "Le prix d’un article subit une augmentation de 20\\,\\% puis une augmentation de 10\\,\\%. Le taux d’évolution global est :",
    "options": [
        "30\\%",
        "32\\%",
        "22\\%",
        "35\\%"
    ],
    "id": "bac_blanc_5-qcm-4",
    "category": "Évolutions et variations",
    "correctAnswerIndex": 1,
    "explanation": "Le coefficient multiplicateur global est $1{,}20 \\times 1{,}10 = 1{,}32$, soit une augmentation globale de $32\\%$."
},
    {
    "question": "On donne ci-contre la courbe représentative d’une fonction $f$. On lit graphiquement que $f(2)$ est égal à :",
    "questionGraphData": {
        "domain": { "x": [-1, 5], "y": [-2, 4] },
        "functions": [{ "fn": "-0.5*(x-2)^2+3", "color": "#f43f5e" }]
    },
    "options": [
        "0",
        "1",
        "2",
        "3"
    ],
    "id": "bac_blanc_5-qcm-5",
    "category": "Fonctions",
    "correctAnswerIndex": 3,
    "explanation": "$f(2) = -0{,}5 \\times (2-2)^2 + 3 = -0{,}5 \\times 0 + 3 = 3$. Le sommet de la parabole est en $(2 ; 3)$."
},
    {
    "question": "On lance deux fois de suite un dé truqué. La probabilité d’obtenir un 6 à chaque lancer est $0,2$. La probabilité d’obtenir  deux  6 est :",
    "options": [
        "$0,512$",
        "$0,488$",
        "$0,04$",
        "$0,8$"
    ],
    "id": "bac_blanc_5-qcm-6",
    "category": "Probabilités",
    "correctAnswerIndex": 2,
    "explanation": "Les lancers sont indépendants. $P(\\text{deux 6}) = 0{,}2 \\times 0{,}2 = 0{,}04$."
},
    {
    "question": "Le diagramme en barres ci-dessous donne la répartition des élèves d’un lycée selon leur âge. La médiane de cette série est :",
    "questionGraphData": {
        "domain": { "x": [15, 20], "y": [0, 60] },
        "barcharts": [
            { "coords": [{ "x": 16, "y": 25 }, { "x": 17, "y": 40 }, { "x": 18, "y": 30 }, { "x": 19, "y": 5 }], "color": "#8b5cf6" }
        ],
        "title": "Âge des élèves"
    },
    "options": [
        "17",
        "17,5",
        "18",
        "18,5"
    ],
    "id": "bac_blanc_5-qcm-7",
    "category": "Statistiques",
    "correctAnswerIndex": 0,
    "explanation": "L'effectif total est $25 + 40 + 30 + 5 = 100$. La médiane sépare en deux groupes de 50. L'effectif cumulé atteint 50 à la valeur 17 ($25 + 40 = 65 \\geq 50$), donc la médiane est $17$."
},
    {
    "question": "L’équation $x^2 = 9$ a pour solutions :",
    "options": [
        "$x = 3$ seulement",
        "$x = -3$ seulement",
        "$x = 3$ ou $x = -3$",
        "$x = \\sqrt{3}$ ou $x = -\\sqrt{3}$"
    ],
    "id": "bac_blanc_5-qcm-8",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 2,
    "explanation": "$x^2 = 9 \\iff x = 3$ ou $x = -3$. L'équation $x^2 = c$ avec $c > 0$ admet toujours deux solutions : $\\sqrt{c}$ et $-\\sqrt{c}$."
},
    {
    "question": "Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=2x-4$. Le tableau de signes de $f$ est :",
    "options": [
        "Tableau 1",
        "Tableau 2",
        "Tableau 3",
        "Tableau 4"
    ],
    "optionsTableData": [
        { "headers": ["x", "-\\infty", "2", "+\\infty"], "rows": [["f(x)", "", "-", "0", "+", ""]] },
        { "headers": ["x", "-\\infty", "2", "+\\infty"], "rows": [["f(x)", "", "+", "0", "-", ""]] },
        { "headers": ["x", "-\\infty", "0", "+\\infty"], "rows": [["f(x)", "", "-", "0", "+", ""]] },
        { "headers": ["x", "-\\infty", "0", "+\\infty"], "rows": [["f(x)", "", "+", "0", "-", ""]] }
    ],
    "id": "bac_blanc_5-qcm-9",
    "category": "Fonctions",
    "correctAnswerIndex": 0,
    "explanation": "$f(x) = 2x - 4$ s'annule en $x = 2$. Le coefficient directeur est $2 > 0$, donc $f$ est négative avant $2$ et positive après."
},
    {
    "question": "La forme factorisée de $(x+3)^2 - 4(x+3)$ est :",
    "options": [
        "$(x+3)(x-1)$",
        "$(x+3)(x+1)$",
        "$(x-3)(x+1)$",
        "$(x-3)(x-1)$"
    ],
    "id": "bac_blanc_5-qcm-10",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 0,
    "explanation": "On factorise par $(x+3)$ : $(x+3)^2 - 4(x+3) = (x+3)[(x+3) - 4] = (x+3)(x-1)$."
},
    {
    "question": "Le prix d’un article a baissé de 20\\,\\%. Pour retrouver son prix initial, il faut l’augmenter de :",
    "options": [
        "20\\%",
        "25\\%",
        "30\\%",
        "40\\%"
    ],
    "id": "bac_blanc_5-qcm-11",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 1,
    "explanation": "Après une baisse de $20\\%$, le CM est $0{,}80$. Pour revenir au prix initial, il faut multiplier par $\\dfrac{1}{0{,}80} = 1{,}25$, soit une hausse de $25\\%$."
},
    {
    "question": "La droite d’équation $y=3x$ passe par le point :",
    "options": [
        "$A(2;6)$",
        "$B(3;6)$",
        "$C(1;4)$",
        "$D(0;3)$"
    ],
    "id": "bac_blanc_5-qcm-12",
    "category": "Calcul numérique et algébrique",
    "correctAnswerIndex": 0,
    "explanation": "$y = 3x$. Pour $A(2;6)$ : $3 \\times 2 = 6$ ✓. Le point $A$ vérifie l'équation de la droite."
},

    // --- AUTOMATISMES EDUSCOL — Évolutions et variations ---
    {
        id: "eduscol-ev-1",
        category: "Évolutions et variations",
        question: "Le coefficient multiplicateur associé à une hausse de $30\\%$ est :",
        options: ["$0{,}3$", "$1{,}3$", "$30$", "$0{,}7$"],
        correctAnswerIndex: 1,
        explanation: "Une hausse de $30\\%$ correspond à un CM de $1 + \\dfrac{30}{100} = 1{,}3$."
    },
    {
        id: "eduscol-ev-2",
        category: "Évolutions et variations",
        question: "Le taux d'évolution associé au coefficient multiplicateur $C = 1{,}2$ est :",
        options: ["$+120\\%$", "$+1{,}2\\%$", "$+20\\%$", "$+2\\%$"],
        correctAnswerIndex: 2,
        explanation: "Le taux d'évolution est $t = C - 1 = 1{,}2 - 1 = 0{,}2 = +20\\%$."
    },
    {
        id: "eduscol-ev-3",
        category: "Évolutions et variations",
        question: "Un prix de $150$€ subit une hausse de $10\\%$. Le nouveau prix est :",
        options: ["$150{,}10$€", "$160$€", "$165$€", "$151{,}10$€"],
        correctAnswerIndex: 2,
        explanation: "Nouveau prix $= 150 \\times 1{,}10 = 165$€."
    },
    {
        id: "eduscol-ev-4",
        category: "Évolutions et variations",
        question: "Le coefficient multiplicateur associé à une hausse de $5\\%$ est :",
        options: ["$0{,}05$", "$1{,}05$", "$1{,}5$", "$5$"],
        correctAnswerIndex: 1,
        explanation: "Une hausse de $5\\%$ correspond à un CM de $1 + \\dfrac{5}{100} = 1{,}05$."
    },
    {
        id: "eduscol-ev-5",
        category: "Évolutions et variations",
        question: "Le taux d'évolution associé à un coefficient multiplicateur $C = 0{,}85$ est :",
        options: ["$-15\\%$", "$+85\\%$", "$+15\\%$", "$-0{,}15\\%$"],
        correctAnswerIndex: 0,
        explanation: "Le taux d'évolution est $t = C - 1 = 0{,}85 - 1 = -0{,}15 = -15\\%$."
    },
    {
        id: "eduscol-ev-6",
        category: "Évolutions et variations",
        question: "Le coefficient multiplicateur global associé à deux hausses successives de $10\\%$ et de $20\\%$ est :",
        options: ["$1{,}30$", "$1{,}1 \\times 1{,}2 = 1{,}32$", "$0{,}1 \\times 0{,}2$", "$1{,}02$"],
        correctAnswerIndex: 1,
        explanation: "Le CM global est le produit des CM : $1{,}1 \\times 1{,}2 = 1{,}32$, soit une hausse globale de $32\\%$."
    },
    {
        id: "eduscol-ev-7",
        category: "Évolutions et variations",
        question: "Le coefficient multiplicateur associé à une baisse de $0{,}3\\%$ est :",
        options: ["$0{,}7$", "$0{,}97$", "$0{,}997$", "$1{,}03$"],
        correctAnswerIndex: 2,
        explanation: "Une baisse de $0{,}3\\%$ : CM $= 1 - \\dfrac{0{,}3}{100} = 1 - 0{,}003 = 0{,}997$."
    },
    {
        id: "eduscol-ev-8",
        category: "Évolutions et variations",
        question: "Le taux d'évolution associé à un coefficient multiplicateur $C = 0{,}975$ est :",
        options: ["$+97{,}5\\%$", "$+25\\%$", "$-2{,}5\\%$", "$-25\\%$"],
        correctAnswerIndex: 2,
        explanation: "Le taux d'évolution est $t = C - 1 = 0{,}975 - 1 = -0{,}025 = -2{,}5\\%$."
    },
    {
        id: "eduscol-ev-9",
        category: "Évolutions et variations",
        question: "Si une grandeur subit trois évolutions successives de $+3\\%$, $-5\\%$ et $+7\\%$, alors elle est multipliée par :",
        options: ["$1{,}3 \\times 1{,}5 \\times 1{,}7$", "$1{,}03 \\times 0{,}95 \\times 1{,}07$", "$3 - 5 + 7$", "$3 \\times (-5) \\times 7$"],
        correctAnswerIndex: 1,
        explanation: "Les CM sont $1{,}03$, $0{,}95$ et $1{,}07$. Le CM global est leur produit : $1{,}03 \\times 0{,}95 \\times 1{,}07$."
    },
    {
        id: "eduscol-ev-10",
        category: "Évolutions et variations",
        question: "Un prix de $150$€ subit une hausse de $10\\%$ puis une baisse de $10\\%$. Que peut-on dire ?",
        options: [
            "Le prix revient à $150$€",
            "Le prix est inférieur à $150$€",
            "Le prix est supérieur à $150$€",
            "On ne peut pas conclure"
        ],
        correctAnswerIndex: 1,
        explanation: "Nouveau prix : $150 \\times 1{,}1 \\times 0{,}9 = 148{,}50$€. Une hausse puis une baisse du même taux ne ramène jamais au prix initial."
    },
    {
        id: "eduscol-ev-11",
        category: "Évolutions et variations",
        question: "Une longueur a été multipliée par $3$. Quel est le taux d'évolution correspondant ?",
        options: ["$+300\\%$", "$+200\\%$", "$+30\\%$", "$+3\\%$"],
        correctAnswerIndex: 1,
        explanation: "Multiplier par $3$, c'est un CM de $3$. Le taux d'évolution est $t = 3 - 1 = 2 = +200\\%$."
    },

    // --- AUTOMATISMES EDUSCOL — Proportions et pourcentages ---
    {
        id: "eduscol-prop-1",
        category: "Proportions et pourcentages",
        question: "Calculer $30\\%$ de $70$.",
        options: ["$21$", "$2{,}1$", "$210$", "$30$"],
        correctAnswerIndex: 0,
        explanation: "$30\\% \\times 70 = \\dfrac{30}{100} \\times 70 = 0{,}3 \\times 70 = 21$."
    },
    {
        id: "eduscol-prop-2",
        category: "Proportions et pourcentages",
        question: "Calculer les $\\dfrac{3}{5}$ de $15$.",
        options: ["$5$", "$9$", "$3$", "$45$"],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{3}{5} \\times 15 = 3 \\times 3 = 9$."
    },
    {
        id: "eduscol-prop-3",
        category: "Proportions et pourcentages",
        question: "Quel pourcentage représente $\\dfrac{1}{5}$ ?",
        options: ["$15\\%$", "$20\\%$", "$25\\%$", "$5\\%$"],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{1}{5} = \\dfrac{20}{100} = 20\\%$."
    },
    {
        id: "eduscol-prop-4",
        category: "Proportions et pourcentages",
        question: "Quelle fraction représente la moitié de $\\dfrac{3}{4}$ ?",
        options: ["$\\dfrac{3}{2}$", "$\\dfrac{3}{8}$", "$\\dfrac{1}{4}$", "$\\dfrac{6}{4}$"],
        correctAnswerIndex: 1,
        explanation: "La moitié de $\\dfrac{3}{4}$ est $\\dfrac{1}{2} \\times \\dfrac{3}{4} = \\dfrac{3}{8}$."
    },
    {
        id: "eduscol-prop-5",
        category: "Proportions et pourcentages",
        question: "$25\\%$ des élèves d'un lycée sont internes. Il y a $320$ internes. Combien y a-t-il d'élèves dans ce lycée ?",
        options: ["$80$", "$640$", "$1\\,280$", "$1\\,600$"],
        correctAnswerIndex: 2,
        explanation: "Si $25\\%$ des élèves $= 320$, alors le nombre total est $\\dfrac{320}{0{,}25} = 1\\,280$ élèves."
    },
    {
        id: "eduscol-prop-6",
        category: "Proportions et pourcentages",
        question: "Quel pourcentage de $120$ est représenté par $90$ ?",
        options: ["$60\\%$", "$70\\%$", "$75\\%$", "$80\\%$"],
        correctAnswerIndex: 2,
        explanation: "$\\dfrac{90}{120} = \\dfrac{3}{4} = 0{,}75 = 75\\%$."
    },
    {
        id: "eduscol-prop-7",
        category: "Proportions et pourcentages",
        question: "$\\dfrac{1}{3}$ des élèves d'une école sont des garçons et les $\\dfrac{3}{4}$ des garçons sont sportifs. Quelle est la proportion de garçons sportifs parmi les élèves ?",
        options: ["$\\dfrac{3}{7}$", "$\\dfrac{1}{4}$", "$\\dfrac{1}{12}$", "$\\dfrac{3}{4}$"],
        correctAnswerIndex: 1,
        explanation: "Proportion de garçons sportifs : $\\dfrac{1}{3} \\times \\dfrac{3}{4} = \\dfrac{3}{12} = \\dfrac{1}{4} = 25\\%$."
    },
    {
        id: "eduscol-prop-8",
        category: "Proportions et pourcentages",
        question: "Quelle proportion d'heure représentent $12$ minutes ?",
        options: ["$\\dfrac{1}{12}$", "$\\dfrac{12}{100}$", "$\\dfrac{1}{5}$", "$\\dfrac{1}{6}$"],
        correctAnswerIndex: 2,
        explanation: "$\\dfrac{12}{60} = \\dfrac{1}{5}$ d'heure."
    },

    // --- AUTOMATISMES EDUSCOL — Calcul numérique ---
    {
        id: "eduscol-cn-1",
        category: "Calcul numérique et algébrique",
        question: "Un véhicule roule à $120$ km/h. Quelle distance parcourt-il en $36$ min ?",
        options: ["$43{,}2$ km", "$4\\,320$ km", "$72$ km", "$36$ km"],
        correctAnswerIndex: 2,
        explanation: "$36$ min $= \\dfrac{36}{60}$ h $= 0{,}6$ h. Distance $= 120 \\times 0{,}6 = 72$ km."
    },
    {
        id: "eduscol-cn-2",
        category: "Calcul numérique et algébrique",
        question: "Quel pourcentage est égal à $16\\%$ de $25\\%$ ?",
        options: ["$4\\%$", "$41\\%$", "$0{,}04\\%$", "$400\\%$"],
        correctAnswerIndex: 0,
        explanation: "$16\\% \\times 25\\% = 0{,}16 \\times 0{,}25 = 0{,}04 = 4\\%$."
    },

    // --- AUTOMATISMES EDUSCOL — Probabilités ---
    {
        id: "eduscol-proba-1",
        category: "Probabilités",
        question: "On lance $10$ fois et de façon indépendante un dé à $6$ faces non truqué. On gagne si le résultat est supérieur à $4$. Cette expérience peut être modélisée par :",
        options: [
            "Une loi de Bernoulli de paramètre $p = \\dfrac{1}{3}$",
            "Une loi binomiale $\\mathcal{B}\\left(10\\,; \\dfrac{1}{3}\\right)$",
            "Une loi binomiale $\\mathcal{B}\\left(10\\,; \\dfrac{2}{3}\\right)$",
            "Une loi uniforme sur $\\{1\\,; 2\\,; 3\\,; 4\\,; 5\\,; 6\\}$"
        ],
        correctAnswerIndex: 1,
        explanation: "Chaque lancer est une épreuve de Bernoulli avec $p = P(\\text{résultat} > 4) = P(5 \\text{ ou } 6) = \\dfrac{2}{6} = \\dfrac{1}{3}$. La répétition de $10$ épreuves indépendantes suit $\\mathcal{B}(10\\,; \\frac{1}{3})$."
    },
    {
        id: "eduscol-proba-2",
        category: "Probabilités",
        question: "On modélise $3$ épreuves de Bernoulli indépendantes de paramètre $p = 0{,}6$ avec un arbre. Soit $X$ le nombre de succès. $P(X = 2)$ est égal à :",
        options: ["$0{,}6^2$", "$0{,}6^2 \\times 0{,}4$", "$3$", "$3 \\times 0{,}6^2 \\times 0{,}4$"],
        correctAnswerIndex: 3,
        explanation: "$P(X = 2) = \\binom{3}{2} \\times 0{,}6^2 \\times 0{,}4^1 = 3 \\times 0{,}36 \\times 0{,}4 = 0{,}432$."
    },
    {
        id: "eduscol-proba-3",
        category: "Probabilités",
        question: "Dans un lycée technologique, sur $60$ élèves en ST2S, il y a $55$ filles. Quelle est la proportion de filles parmi les élèves de ST2S ?",
        options: ["$\\dfrac{134}{60}$", "$\\dfrac{55}{134}$", "$\\dfrac{55}{60}$", "$\\dfrac{55}{240}$"],
        correctAnswerIndex: 2,
        explanation: "Proportion de filles en ST2S $= \\dfrac{\\text{filles ST2S}}{\\text{total ST2S}} = \\dfrac{55}{60}$."
    },



    // --- AUTOMATISMES EDUSCOL - EAM (Fonctions, Calcul, Stats) ---
    {
        "id": "eam-fonc-1",
        "category": "Fonctions",
        "question": "On considère la courbe $\\mathcal{C}$ ci-dessous représentant une fonction $f$.\nLaquelle des affirmations suivantes est vraie ?",
        "questionGraphData": {"domain": {"x": [-3, 4], "y": [-2, 5]}, "functions": [{"fn": "-(x-1)^2 + 4", "color": "#3b82f6"}]},
        "options": ["$f(1) = 0$", "$f(0) = 4$", "$f(1) = 4$", "$f(4) = 1$"],
        "correctAnswerIndex": 2,
        "explanation": "Le sommet de la parabole est le point de coordonnées $(1; 4)$, donc $f(1) = 4$."
    },
    {
        "id": "eam-fonc-2",
        "category": "Fonctions",
        "question": "D'après la courbe de la question précédente, l'équation $f(x) = 0$ admet :",
        "questionGraphData": {"domain": {"x": [-3, 4], "y": [-2, 5]}, "functions": [{"fn": "-(x-1)^2 + 4", "color": "#3b82f6"}]},
        "options": ["Aucune solution", "Une seule solution", "Deux solutions", "Trois solutions"],
        "correctAnswerIndex": 2,
        "explanation": "La courbe coupe l'axe des abscisses ($y=0$) en deux points : $x = -1$ et $x = 3$."
    },
    {
        "id": "eam-fonc-3",
        "category": "Fonctions",
        "question": "On considère la droite $(D)$ tracée ci-dessous. Son coefficient directeur est :",
        "questionGraphData": {"domain": {"x": [-3, 4], "y": [-4, 5]}, "functions": [{"fn": "2*x - 1", "color": "#ef4444"}]},
        "options": ["$-2$", "$\\dfrac{1}{2}$", "$-1$", "$2$"],
        "correctAnswerIndex": 3,
        "explanation": "La droite monte. Quand on avance de $1$ unité vers la droite ($x$), on monte de $2$ unités ($y$). Le coefficient directeur est donc de $2$."
    },
    {
        "id": "eam-fonc-4",
        "category": "Fonctions",
        "question": "La fonction $f$ est représentée ci-dessous sur $[-3\\,;\\,3]$. Elle est strictement décroissante sur :",
        "questionGraphData": {"domain": {"x": [-3.5, 3.5], "y": [-3, 5]}, "functions": [{"fn": "-x^2 + 3", "color": "#3b82f6"}]},
        "options": ["$[-3\\,;\\,3]$", "$[-3\\,;\\,0]$", "$[0\\,;\\,3]$", "$[-1\\,;\\,1]$"],
        "correctAnswerIndex": 2,
        "explanation": "La courbe descend pour les abscisses $x$ allant de $0$ à $3$, donc la fonction est décroissante sur $[0\\,;\\,3]$."
    },
    {
        "id": "eam-fonc-5",
        "category": "Fonctions",
        "question": "Soit $f(x) = 2x^2 - 3x + 1$. L'image $f(2)$ est égale à :",
        "options": ["$-3$", "$1$", "$3$", "$-1$"],
        "correctAnswerIndex": 2,
        "explanation": "$f(2) = 2(2)^2 - 3(2) + 1 = 2(4) - 6 + 1 = 8 - 6 + 1 = 3$."
    },
    {
        "id": "eam-fonc-6",
        "category": "Fonctions",
        "question": "Soit $f$ une fonction affine avec $f(0) = -2$ et $f(1) = 3$. L'expression de $f$ est :",
        "options": ["$5x-2$", "$3x-2$", "$-2x+3$", "$2x+3$"],
        "correctAnswerIndex": 0,
        "explanation": "L'ordonnée à l'origine (quand $x=0$) est $-2$. Le coefficient directeur est $\\dfrac{f(1)-f(0)}{1-0} = \\dfrac{3 - (-2)}{1} = 5$. D'où $f(x) = 5x - 2$."
    },
    {
        "id": "eam-fonc-7",
        "category": "Fonctions",
        "question": "Les antécédents de $0$ par $f(x) = x^2 - 4$ sont :",
        "options": ["$x=0$", "$x=4$ et $x=-4$", "$x=2$ et $x=-2$", "$x=2$ seulement"],
        "correctAnswerIndex": 2,
        "explanation": "On résout $x^2 - 4 = 0$, soit $x^2 = 4$, ce qui donne $x=2$ et $x=-2$."
    },
    {
        "id": "eam-fonc-8",
        "category": "Fonctions",
        "question": "La solution de $3x - 6 = 0$ est :",
        "options": ["$x=-2$", "$x=3$", "$x=2$", "$x=6$"],
        "correctAnswerIndex": 2,
        "explanation": "$3x - 6 = 0 \\iff 3x = 6 \\iff x = \\dfrac{6}{3} = 2$."
    },
    {
        "id": "eam-calc-1",
        "category": "Calcul numérique et algébrique",
        "question": "Une forme factorisée de $x^2 - 5x + 6$ est :",
        "options": ["$(x-2)(x-3)$", "$(x+2)(x+3)$", "$(x-1)(x-6)$", "$(x-2)(x+3)$"],
        "correctAnswerIndex": 0,
        "explanation": "En développant $(x-2)(x-3)$ on obtient $x^2 - 3x - 2x + 6 = x^2 - 5x + 6$."
    },
    {
        "id": "eam-calc-2",
        "category": "Calcul numérique et algébrique",
        "question": "Pour tout réel $x$, $(x+3)^2$ est égal à :",
        "options": ["$x^2+9$", "$x^2+3x+9$", "$x^2+6x+9$", "$x^2+9x+6$"],
        "correctAnswerIndex": 2,
        "explanation": "On utilise l'identité remarquable $(a+b)^2 = a^2 + 2ab + b^2$, donc $x^2 + 2\\times3\\times x + 3^2 = x^2 + 6x + 9$."
    },
    {
        "id": "eam-calc-3",
        "category": "Calcul numérique et algébrique",
        "question": "L'expression $-2x+4$ est strictement positive pour :",
        "options": ["$x > 2$", "$x < -2$", "$x < 2$", "$x > -2$"],
        "correctAnswerIndex": 2,
        "explanation": "$-2x + 4 > 0 \\iff -2x > -4$. En divisant par $-2$ (qui est strictement négatif), on change le sens de l'inégalité : $x < 2$."
    },
    {
        "id": "eam-calc-4",
        "category": "Calcul numérique et algébrique",
        "question": "Pour tout $x\\neq 0$, $\\dfrac{x^3 \\times x^{-1}}{x^2}$ est égal à :",
        "options": ["$x^4$", "$1$", "$x^2$", "$x^{-4}$"],
        "correctAnswerIndex": 1,
        "explanation": "D'après les règles de calcul des puissances : $\\dfrac{x^3 \\times x^{-1}}{x^2} = \\dfrac{x^{3-1}}{x^2} = \\dfrac{x^2}{x^2} = 1$."
    },
    {
        "id": "eam-calc-5",
        "category": "Calcul numérique et algébrique",
        "question": "L'ensemble des solutions de l'équation $2x - 3 = 7$ est :",
        "options": ["$\\{2\\}$", "$\\{5\\}$", "$\\{-2\\}$", "$\\{-5\\}$"],
        "correctAnswerIndex": 1,
        "explanation": "$2x - 3 = 7 \\iff 2x = 10 \\iff x = 5$."
    },
    {
        "id": "eam-calc-6",
        "category": "Calcul numérique et algébrique",
        "question": "Une forme développée de $(2x-1)(x+4)$ est :",
        "options": ["$2x^2+7x-4$", "$2x^2-4$", "$2x^2+8x-4$", "$2x^2+9x-4$"],
        "correctAnswerIndex": 0,
        "explanation": "En utilisant la double distributivité : $2x(x) + 2x(4) - 1(x) - 1(4) = 2x^2 + 8x - x - 4 = 2x^2 + 7x - 4$."
    },
    {
        "id": "eam-calc-7",
        "category": "Calcul numérique et algébrique",
        "question": "L'ensemble des solutions de l'inéquation $3x + 1 < 10$ est :",
        "options": ["$\\left]-\\infty\\,;\\,3\\right[$", "$\\left]3\\,;+\\infty\\right[$", "$\\left]-\\infty\\,;\\,-3\\right[$", "$\\left[-3\\,;+\\infty\\right[$"],
        "correctAnswerIndex": 0,
        "explanation": "$3x + 1 < 10 \\iff 3x < 9 \\iff x < 3$. Cela correspond à l'intervalle $\\left]-\\infty\\,;\\,3\\right[$."
    },
    {
        "id": "eam-deriv-1",
        "category": "Fonctions",
        "question": "La dérivée de la fonction $f(x) = 3x^2 - 5x + 2$ est :",
        "options": ["$3x-5$", "$6x-5$", "$6x+5$", "$6x^2-5$"],
        "correctAnswerIndex": 1,
        "explanation": "On applique les formules de dérivation : $f'(x) = 3(2x) - 5(1) + 0 = 6x - 5$."
    },
    {
        "id": "eam-deriv-2",
        "category": "Fonctions",
        "question": "On considère la courbe $\\mathcal{C}_f$ et sa tangente $(T)$ en $x_0 = 1$ ci-dessous.\nLe nombre dérivé $f'(1)$ est :",
        "questionGraphData": {"domain": {"x": [-1, 4], "y": [-1, 7]}, "functions": [{"fn": "x^2", "color": "#3b82f6"}, {"fn": "2*x-1", "color": "#ef4444"}]},
        "options": ["$1$", "$-1$", "$2$", "$4$"],
        "correctAnswerIndex": 2,
        "explanation": "Le nombre dérivé $f'(1)$ est le coefficient directeur de la tangente $(T)$ au point d'abscisse $1$. Cette droite a pour équation $y = 2x - 1$, son coefficient directeur est donc $2$."
    },
    {
        "id": "eam-deriv-3",
        "category": "Fonctions",
        "question": "Le tableau de signes de $f'$ est tel que $f'$ est positive sur $]-\\infty\\,;\\,2[$ et négative sur $]2\\,;\\,+\\infty[$.\nLaquelle des descriptions correspond à $f$ ?",
        "options": ["$f$ est croissante puis décroissante, avec un maximum en $x=2$", "$f$ est décroissante sur $\\mathbb{R}$", "$f$ est décroissante puis croissante, avec un minimum en $x=2$", "$f$ est croissante sur $\\mathbb{R}$"],
        "correctAnswerIndex": 0,
        "explanation": "Si $f'$ est positive puis négative, cela signifie que la fonction $f$ est croissante puis décroissante. Le changement de variation s'opère en $x=2$ qui est donc un maximum local."
    },
    {
        "id": "eam-deriv-4",
        "category": "Fonctions",
        "question": "La fonction polynomiale définie par $f(x) = -x^2 + 6x - 5$ est croissante sur l'intervalle :",
        "options": ["$\\left]-\\infty\\,;\\,3\\right]$", "$\\left[3\\,;+\\infty\\right[$", "$\\mathbb{R}$", "$\\left]-\\infty\\,;\\,0\\right]$"],
        "correctAnswerIndex": 0,
        "explanation": "On calcule la dérivée : $f'(x) = -2x + 6$. La fonction est croissante quand $f'(x) \\geq 0 \\iff -2x \\geq -6 \\iff x \\leq 3$. L'intervalle est donc $\\left]-\\infty\\,;\\,3\\right]$."
    },
    {
        "id": "eam-stats-1",
        "category": "Calcul numérique et algébrique",
        "question": "Le nombre $e^0$ est égal à :",
        "options": ["$0$", "$1$", "$e$", "$-1$"],
        "correctAnswerIndex": 1,
        "explanation": "Tout nombre (non nul) élevé à la puissance $0$ vaut $1$, en particulier $e^0 = 1$."
    },
    {
        "id": "eam-stats-2",
        "category": "Calcul numérique et algébrique",
        "question": "L'ensemble des solutions de l'équation $e^x = 1$ est :",
        "options": ["$\\{-1\\}$", "$\\{e\\}$", "$\\{0\\}$", "$\\{1\\}$"],
        "correctAnswerIndex": 2,
        "explanation": "$e^x = 1 \\iff e^x = e^0 \\iff x = 0$."
    },
    {
        "id": "eam-stats-3",
        "category": "Probabilités",
        "question": "On considère une expérience aléatoire modélisée par un arbre pondéré. On a $P(F) = 0{,}6$ et $P_F(E) = 0{,}3$. La probabilité $P(F \\cap E)$ est :",
        "options": ["$0{,}3$", "$0{,}6$", "$0{,}18$", "$0{,}9$"],
        "correctAnswerIndex": 2,
        "explanation": "Le calcul de l'intersection se fait en multipliant le long du chemin sur l'arbre de probabilités : $P(F \\cap E) = P(F) \\times P_F(E) = 0{,}6 \\times 0{,}3 = 0{,}18$."
    },
    {
        "id": "eam-stats-6",
        "category": "Statistiques",
        "question": "On considère un diagramme en boîte représentant les notes d'une classe. Les 5 valeurs du résumé sont (dans l'ordre) : 3, 6, 11, 15, 18.\nLa médiane des notes est :",
        "options": ["$6$", "$15$", "$11$", "$18$"],
        "correctAnswerIndex": 2,
        "explanation": "Le résumé statistique à 5 valeurs d'un diagramme en boîte est composé de (Min, Q1, Médiane, Q3, Max). La médiane est donc la valeur centrale, fixée ici à $11$."
    },
    {
        "id": "eam-stats-7",
        "category": "Statistiques",
        "question": "D'après un diagramme en boîte dont les quartiles sont $Q_1=6$ et $Q_3=15$, environ $50\\%$ des élèves ont une note :",
        "options": ["Inférieure à $6$", "Comprise entre $6$ et $15$", "Supérieure à $15$", "Égale à $11$"],
        "correctAnswerIndex": 1,
        "explanation": "La boîte \"centrale\" est délimitée par les quartiles $Q_1$ et $Q_3$. L'écart interquartile regroupe donc environ les $50\\%$ valeurs centrales de la série statistique. Ainsi, $50\\%$ des notes sont comprises entre $6$ et $15$."
    },
    {
        "id": "eam-stats-8",
        "category": "Probabilités",
        "question": "On tire au hasard une carte dans un jeu de $52$ cartes. La probabilité de tirer un as est :",
        "options": ["$\\dfrac{1}{13}$", "$\\dfrac{1}{52}$", "$\\dfrac{4}{13}$", "$\\dfrac{1}{4}$"],
        "correctAnswerIndex": 0,
        "explanation": "Il y a $4$ as dans un jeu de $52$ cartes. La probabilité est donc $\\dfrac{4}{52} = \\dfrac{1}{13}$."
    },
    {
        "id": "eam-stats-9",
        "category": "Probabilités",
        "question": "On lance un dé à $6$ faces équilibré. La probabilité d'obtenir un nombre strictement supérieur à $4$ est :",
        "options": ["$\\dfrac{1}{6}$", "$\\dfrac{1}{3}$", "$\\dfrac{2}{3}$", "$\\dfrac{1}{2}$"],
        "correctAnswerIndex": 1,
        "explanation": "Les seules issues favorables sont d'obtenir un $5$ ou un $6$. Il y a donc $2$ issues favorables sur $6$ possibilités au total, ce qui donne une probabilité de $\\dfrac{2}{6} = \\dfrac{1}{3}$."
    },

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

    // --- EAM 1ère - Sujet 1 - Calcul numérique et algébrique ---
    {
        id: "eam1-calc-1",
        category: "Calcul numérique et algébrique",
        question: "Mettre $\\dfrac{1}{3}-\\dfrac{2-x}{2}$ sous la forme $\\dfrac{a+bx}{c}$.",
        options: [
            "$\\dfrac{-1+x}{1}$",
            "$\\dfrac{2-3x}{6}$",
            "$\\dfrac{3-x}{5}$",
            "$\\dfrac{-4+3x}{6}$"
        ],
        correctAnswerIndex: 3
    },
    {
        id: "eam1-calc-2",
        category: "Calcul numérique et algébrique",
        question: "Calculer $B = \\dfrac{a}{c} + \\dfrac{1/2}{b}$ pour $a = \\dfrac{1}{6}, b = \\dfrac{1}{2}, c = \\dfrac{1}{3}$.",
        options: [
            "$\\dfrac{1}{6}$",
            "$\\dfrac{3}{2}$",
            "$\\dfrac{1}{2}$",
            "$1$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "eam1-calc-3",
        category: "Calcul numérique et algébrique",
        question: "Soit la relation $C = \\dfrac{2}{x} + \\dfrac{3}{y}$. On peut alors affirmer que :",
        options: [
            "$x = 2\\left(\\dfrac{1}{C} - \\dfrac{y}{3}\\right)$",
            "$x = \\dfrac{2y}{Cy-3}$",
            "$x = \\dfrac{5-Cy}{C}$",
            "$x = \\dfrac{Cy-3}{2y}$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "eam1-calc-4",
        category: "Calcul numérique et algébrique",
        question: "Factoriser l'expression $x^2 - 16$.",
        options: [
            "$(x-8)^2$",
            "$(x-4)^2$",
            "$(x-4)(x+4)$",
            "$x(x-16)$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "eam1-calc-5",
        category: "Calcul numérique et algébrique",
        question: "Résoudre l'équation $3x + 4 = 0$.",
        options: [
            "$x = \\dfrac{4}{3}$",
            "$x = -\\dfrac{4}{3}$",
            "$x = -\\dfrac{3}{4}$",
            "$x = \\dfrac{3}{4}$"
        ],
        correctAnswerIndex: 1
    },

    // --- EAM 1ère - Sujet 1 - Évolutions ---
    {
        id: "eam1-evol-1",
        category: "Évolutions et variations",
        question: "Une baisse de 30\\% suivie d'une baisse de 20\\% correspond à une baisse globale de :",
        options: [
            "$10\\%$",
            "$56\\%$",
            "$44\\%$",
            "$60\\%$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "eam1-evol-2",
        category: "Évolutions et variations",
        question: "Quel est le coefficient multiplicateur d'une hausse de $0,5\\%$ ?",
        options: [
            "$1,5$",
            "$1,05$",
            "$1,005$",
            "$0,5$"
        ],
        correctAnswerIndex: 2
    },

    // --- EAM 1ère - Sujet 1 - Fonctions ---
    {
        id: "eam1-fonc-1",
        category: "Fonctions",
        question: "Résoudre graphiquement $f(x) \\le 5$ pour $f(x) = -x^2 + 10$.",
        options: [
            "$[-\\sqrt{5} ; \\sqrt{5}]$",
            "$]-\\infty ; -\\sqrt{5}] \\cup [\\sqrt{5} ; +\\infty[$",
            "$x \\ge \\sqrt{5}$",
            "$x \\le -\\sqrt{5}$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "eam1-fonc-2",
        category: "Fonctions",
        question: "L'image de $-1$ par la fonction $g(x) = 2x^2 - 3x + 1$ est :",
        options: [
            "$0$",
            "$6$",
            "$-4$",
            "$2$"
        ],
        correctAnswerIndex: 1
    },

    // --- EAM 1ère - Sujet 1 - Statistiques ---
    {
        id: "eam1-stat-1",
        category: "Statistiques",
        question: "Soit la série statistique suivante : Note 10 (coef 1), Note 7 (coef 2), Note $X$ (coef 2). Que doit valoir $X$ pour que la moyenne soit égale à 12 ?",
        options: [
            "$17$",
            "$18$",
            "$19$",
            "$20$"
        ],
        correctAnswerIndex: 1
    },

    // --- EAM 1ère - Sujet 1 - Proportions ---
    {
        id: "eam1-prop-1",
        category: "Proportions et pourcentages",
        question: "Un débit de $36 \\text{ m}^3\\cdot\\text{h}^{-1}$ correspond en $\\text{L}\\cdot\\text{s}^{-1}$ à :",
        options: [
            "$3600$",
            "$10$",
            "$100$",
            "$1000$"
        ],
        correctAnswerIndex: 1
    },

    // --- EAM 1ère - Sujet A - Calcul numérique ---
    {
        id: "eamA-calc-1",
        category: "Calcul numérique et algébrique",
        question: "On peut affirmer que :",
        options: [
            "$\\dfrac{5}{6} < \\dfrac{6}{7}$",
            "$\\dfrac{5}{6} > \\dfrac{6}{7}$",
            "$\\dfrac{5}{6} = \\dfrac{6}{7}$",
            "On ne peut pas comparer ces deux nombres"
        ],
        correctAnswerIndex: 0
    },
    {
        id: "eamA-calc-2",
        category: "Calcul numérique et algébrique",
        question: "$1\\ \\text{m}^2$ correspond à :",
        options: [
            "$0,0001\\ \\text{cm}^2$",
            "$0,01\\ \\text{cm}^2$",
            "$100\\ \\text{cm}^2$",
            "$10\\,000\\ \\text{cm}^2$"
        ],
        correctAnswerIndex: 3
    },
    {
        id: "eamA-calc-3",
        category: "Calcul numérique et algébrique",
        question: "L'équation $x^2 = 9$ a pour solutions :",
        options: [
            "$x = 3$ seulement",
            "$x = -3$ seulement",
            "$x = 3$ ou $x = -3$",
            "$x = \\sqrt{3}$ ou $x = -\\sqrt{3}$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "eamA-calc-4",
        category: "Calcul numérique et algébrique",
        question: "La forme factorisée de $(x+3)^2 - 4(x+3)$ est :",
        options: [
            "$(x+3)(x-1)$",
            "$(x+3)(x+1)$",
            "$(x-3)(x+1)$",
            "$(x-3)(x-1)$"
        ],
        correctAnswerIndex: 0
    },

    // --- EAM 1ère - Sujet A - Proportions ---
    {
        id: "eamA-prop-1",
        category: "Proportions et pourcentages",
        question: "Dans une classe de 30 élèves, 40\\% sont des filles. Le nombre de filles est :",
        options: [
            "$12$",
            "$15$",
            "$18$",
            "$20$"
        ],
        correctAnswerIndex: 0
    },

    // --- EAM 1ère - Sujet A - Évolutions ---
    {
        id: "eamA-evol-1",
        category: "Évolutions et variations",
        question: "Le prix d'un article subit une augmentation de 20\\% puis une augmentation de 10\\%. Le taux d'évolution global est :",
        options: [
            "$30\\%$",
            "$32\\%$",
            "$22\\%$",
            "$35\\%$"
        ],
        correctAnswerIndex: 1
    },

    // --- EAM 1ère - Sujet A - Fonctions ---
    {
        id: "eamA-fonc-1",
        category: "Fonctions",
        question: "On donne la courbe représentative d'une fonction $f$ définie par $f(x) = -0,5(x-2)^2+3$. On lit graphiquement que $f(2)$ est égal à :",
        options: [
            "$0$",
            "$1$",
            "$2$",
            "$3$"
        ],
        correctAnswerIndex: 3
    },
    {
        id: "eamA-fonc-2",
        category: "Fonctions",
        question: "Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=2x-4$. Le tableau de signes de $f$ est :",
        options: [
            "Négatif sur $]-\\infty ; 2[$, nul en $2$, positif sur $]2 ; +\\infty[$",
            "Positif sur $]-\\infty ; 2[$, nul en $2$, négatif sur $]2 ; +\\infty[$",
            "Négatif sur $]-\\infty ; 0[$, nul en $0$, positif sur $]0 ; +\\infty[$",
            "Positif sur $]-\\infty ; 0[$, nul en $0$, négatif sur $]0 ; +\\infty[$"
        ],
        correctAnswerIndex: 0
    },

    // --- EAM 1ère - Sujet A - Statistiques ---
    {
        id: "eamA-stat-1",
        category: "Statistiques",
        question: "La répartition des élèves d'un lycée selon leur âge est : 16 ans (25), 17 ans (40), 18 ans (30), 19 ans (5). La médiane de cette série est :",
        options: [
            "$17$",
            "$17,5$",
            "$18$",
            "$18,5$"
        ],
        correctAnswerIndex: 0
    },

    // --- EAM 1ère - Sujet A - Probabilités ---
    {
        id: "eamA-prob-1",
        category: "Probabilités",
        question: "On lance trois fois de suite un dé truqué. La probabilité d'obtenir un 6 à chaque lancer est $0,2$. La probabilité d'obtenir au moins un 6 est :",
        options: [
            "$0,512$",
            "$0,488$",
            "$0,6$",
            "$0,8$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "eamA-prob-2",
        category: "Probabilités",
        question: "Pour tout événement, la probabilité $p$ d'un événement vérifie :",
        options: [
            "$-1 \\le p \\le 1$",
            "$0 \\le p \\le 1$",
            "$p \\ge 0$",
            "$p \\le 1$"
        ],
        correctAnswerIndex: 1
    },

    // --- Série Probabilités Spécifique (Pablo Picasso) ---
    {
        id: "prob-spec-1",
        category: "Probabilités",
        question: "Une probabilité est nécessairement un nombre compris entre :",
        options: [
            "$-1$ et $1$",
            "$0$ et $100$",
            "$0$ et $1$",
            "$0$ et $10$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "prob-spec-2",
        category: "Probabilités",
        question: "Si la probabilité d'un événement $A$ est $P(A) = 0,34$, alors la probabilité de son événement contraire est :",
        options: [
            "$0,66$",
            "$-0,34$",
            "$1,34$",
            "$0,34$"
        ],
        correctAnswerIndex: 0
    },
    {
        id: "prob-spec-3",
        category: "Probabilités",
        question: "Dans une situation d'équiprobabilité, la probabilité d'un événement $A$ se calcule par :",
        options: [
            "$P(A) = \\text{Card}(A) \\times \\text{Card}(\\Omega)$",
            "$P(A) = \\dfrac{\\text{Card}(A)}{\\text{Card}(\\Omega)}$",
            "$P(A) = \\dfrac{\\text{Card}(\\Omega)}{\\text{Card}(A)}$",
            "$P(A) = \\text{Card}(A) + \\text{Card}(\\Omega)$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-spec-4",
        category: "Probabilités",
        question: "On lance un dé équilibré à 6 faces. La probabilité d'obtenir un nombre pair est :",
        options: [
            "$\\dfrac{1}{6}$",
            "$\\dfrac{1}{2}$",
            "$\\dfrac{2}{3}$",
            "$\\dfrac{1}{3}$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-spec-5",
        category: "Probabilités",
        question: "Si deux événements $A$ et $B$ sont tels que $P(A) = 0,2$ et $P(B) = 0,5$, et qu'ils sont incompatibles, alors $P(A \\cup B)$ est :",
        options: [
            "$0,1$",
            "$0,7$",
            "$0,3$",
            "$0,35$"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-spec-6",
        category: "Probabilités",
        question: "Dans un tableau croisé d'effectifs, la probabilité conditionnelle $P_A(B)$ se calcule en divisant l'effectif de $A \\cap B$ par :",
        options: [
            "L'effectif total",
            "L'effectif de l'événement $B$",
            "L'effectif de l'événement $A$",
            "L'effectif de $A \\cup B$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "prob-spec-7",
        category: "Probabilités",
        question: "Sur un arbre pondéré, la probabilité d'un chemin est égale à :",
        options: [
            "La somme des probabilités des branches du chemin",
            "Le produit des probabilités des branches du chemin",
            "La moyenne des probabilités des branches du chemin",
            "Le quotient des probabilités"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-spec-8",
        category: "Probabilités",
        question: "La notation $P(A \\cap B)$ désigne la probabilité que :",
        options: [
            "$A$ ou $B$ se réalise",
            "$A$ et $B$ se réalisent simultanément",
            "$B$ se réalise sachant que $A$ est réalisé",
            "Ni $A$ ni $B$ ne se réalise"
        ],
        correctAnswerIndex: 1
    },
    {
        id: "prob-spec-9",
        category: "Probabilités",
        question: "Si on sait que l'événement $A$ est réalisé, la probabilité que l'événement $B$ se réalise se note :",
        options: [
            "$P(A \\cap B)$",
            "$P(B \\cap A)$",
            "$P_A(B)$",
            "$P_B(A)$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "prob-spec-10",
        category: "Probabilités",
        question: "Dans une classe de 30 élèves, 12 étudient l'espagnol. La probabilité qu'un élève choisi au hasard étudie l'espagnol est :",
        options: [
            "$0,3$",
            "$0,4$",
            "$0,5$",
            "$0,6$"
        ],
        correctAnswerIndex: 1
    },

    // --- Bac Blanc 2 - Sujet A - Calcul numérique ---
    {
        id: "bac2-calc-1",
        category: "Calcul numérique et algébrique",
        question: "On considère la relation $M = x + \\dfrac{y - z}{2t}$. Lorsque $x = -1,\\; y = 5,\\; z = 1,\\; t = -2$, la valeur de $M$ est égale à :",
        options: [
            "$-2$",
            "$0$",
            "$2$",
            "$-3$"
        ],
        correctAnswerIndex: 0
    },
    {
        id: "bac2-calc-2",
        category: "Calcul numérique et algébrique",
        question: "On considère trois fonctions : $k_1(x) = (2x-1)^2 - (x+1)(2x-1)$, $k_2(x) = 3x - \\left(5 - \\dfrac{x}{2}\\right)$, $k_3(x) = \\dfrac{4x^2 - (2x-3)^2}{2}$. Parmi ces trois fonctions, lesquelles sont des fonctions affines ?",
        options: [
            "Aucune",
            "Toutes",
            "Uniquement $k_2$",
            "Uniquement $k_2$ et $k_3$"
        ],
        correctAnswerIndex: 3
    },
    {
        id: "bac2-calc-3",
        category: "Calcul numérique et algébrique",
        question: "$\\dfrac{4^3 \\times 3^2}{6^2} = $",
        options: [
            "$4$",
            "$8$",
            "$16$",
            "$2$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "bac2-calc-4",
        category: "Calcul numérique et algébrique",
        question: "L'expression développée réduite de $(5x+4)^2$ est :",
        options: [
            "$25x^2 + 8x + 16$",
            "$10x^2 + 20x + 16$",
            "$25x^2 + 16x + 4$",
            "$25x^2 + 40x + 16$"
        ],
        correctAnswerIndex: 3
    },
    {
        id: "bac2-calc-5",
        category: "Calcul numérique et algébrique",
        question: "L'ordre de grandeur de $(3\\pi)^2 \\times 120$ (avec $\\pi \\approx 3,14$) est :",
        options: [
            "$1\\,000$",
            "$10\\,000$",
            "$100\\,000$",
            "$1\\,000\\,000$"
        ],
        correctAnswerIndex: 1
    },

    // --- Bac Blanc 2 - Sujet A - Proportions ---
    {
        id: "bac2-prop-1",
        category: "Proportions et pourcentages",
        question: "Un boulanger observe que sur 260 viennoiseries vendues, 85 sont des pains au chocolat. Les pains au chocolat représentent (en pourcentage, arrondi à l'unité) :",
        options: [
            "$25\\%$",
            "$33\\%$",
            "$75\\%$",
            "$35\\%$"
        ],
        correctAnswerIndex: 1
    },

    // --- Bac Blanc 2 - Sujet A - Évolutions ---
    {
        id: "bac2-evol-1",
        category: "Évolutions et variations",
        question: "Une bactérie de $0,8$ g voit sa masse diminuer de $25\\%$. La nouvelle masse est égale à :",
        options: [
            "$0,6$ g",
            "$1$ g",
            "$0,75$ g",
            "$0,2$ g"
        ],
        correctAnswerIndex: 0
    },

    // --- Bac Blanc 2 - Sujet A - Fonctions ---
    {
        id: "bac2-fonc-1",
        category: "Fonctions",
        question: "La fonction $f$ définie sur $\\mathbb{R}$ par $f(x) = 3x - 1$ admet pour tableau de signes :",
        options: [
            "Négatif sur $]-\\infty ; \\frac{1}{3}[$, nul en $\\frac{1}{3}$, positif sur $]\\frac{1}{3} ; +\\infty[$",
            "Positif sur $]-\\infty ; \\frac{1}{3}[$, nul en $\\frac{1}{3}$, négatif sur $]\\frac{1}{3} ; +\\infty[$",
            "Négatif sur $]-\\infty ; 0[$, nul en $0$, positif sur $]0 ; +\\infty[$",
            "Positif sur $]-\\infty ; 0[$, nul en $0$, négatif sur $]0 ; +\\infty[$"
        ],
        correctAnswerIndex: 0
    },

    // --- Bac Blanc 2 - Sujet A - Statistiques ---
    {
        id: "bac2-stat-1",
        category: "Statistiques",
        question: "Deux séries statistiques sont représentées par des boîtes à moustaches. Série 1 : médiane 9, Q1=7, Q3=13, min=5, max=15. Série 2 : médiane 9, Q1=7, Q3=13, min=3, max=19. On peut affirmer que :",
        options: [
            "Dans la série 1, la médiane est égale à 9",
            "Dans la série 2, au moins $75\\%$ des valeurs sont inférieures ou égales à 13",
            "Les deux séries ont la même étendue",
            "L'écart interquartile est plus grand pour la série 1"
        ],
        correctAnswerIndex: 0
    },

    // --- Bac Blanc 2 - Sujet A - Sciences ---
    {
        id: "bac2-sci-1",
        category: "Calcul numérique et algébrique",
        question: "La loi d'interaction gravitationnelle est $F = G\\dfrac{m_1 m_2}{d^2}$. L'expression de $d$ est :",
        options: [
            "$d = \\dfrac{F - G}{2m_1 m_2}$",
            "$d = \\sqrt{\\dfrac{G m_1 m_2}{F}}$",
            "$d = \\dfrac{G m_1 m_2}{F^2}$",
            "$d = \\sqrt{\\dfrac{F}{G m_1 m_2}}$"
        ],
        correctAnswerIndex: 1
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
    {
        id: "fonc-5",
        category: "Fonctions",
        question: "Soit $f$ une fonction définie sur $[-3 ; 4]$ dont le tableau de variations est donné ci-dessous. \n\nCombien de solutions l'équation $f(x) = 0$ admet-elle ?",
        questionTableData: {
            xValues: ["-3", "0", "4"],
            rows: [
                {
                    label: "Variations de $f$",
                    type: "variation",
                    content: ["-2", "nearrow", "5", "searrow", "-1"]
                }
            ]
        },
        options: [
            "Aucune solution",
            "Une seule solution",
            "Deux solutions",
            "Trois solutions"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "fonc-6",
        category: "Fonctions",
        question: "Quel est le tableau de signes de la fonction affine $f(x) = -2x + 6$ ?",
        options: [
            "Signe positif puis négatif",
            "Signe négatif puis positif",
            "Toujours positif",
            "Toujours négatif"
        ],
        optionsTableData: [
            {
                xValues: ["-\\infty", "3", "+\\infty"],
                rows: [
                    { label: "Signe de $f$", type: "sign", content: ["+", "0", "-"] }
                ]
            },
            {
                xValues: ["-\\infty", "-3", "+\\infty"],
                rows: [
                    { label: "Signe de $f$", type: "sign", content: ["-", "0", "+"] }
                ]
            },
            {
                xValues: ["-\\infty", "6", "+\\infty"],
                rows: [
                    { label: "Signe de $f$", type: "sign", content: ["+", "0", "-"] }
                ]
            },
            {
                xValues: ["-\\infty", "+\\infty"],
                rows: [
                    { label: "Signe de $f$", type: "sign", content: ["+"] }
                ]
            }
        ],
        correctAnswerIndex: 0
    },
    {
        id: "fonc-7",
        category: "Fonctions",
        question: "La courbe ci-dessous représente une fonction polynomiale du second degré $f(x) = ax^2 + bx + c$. \n\nQuel est le signe du coefficient $a$ ?",
        questionGraphData: {
            domain: { x: [-4, 4], y: [-5, 5] },
            functions: [ { fn: "-x^2 + 2x + 1", color: "#f43f5e" } ]
        },
        options: [
            "Positif car la parabole a un maximum",
            "Négatif car la parabole est tournée vers le bas",
            "Négatif car elle croise l'axe des ordonnées en $y=1$",
            "On ne peut pas le déterminer à l'œil nu"
        ],
        correctAnswerIndex: 1,
        explanation: "La fonction représentée est un polynôme du second degré de la forme $ax^2 + bx + c$. La courbe est une parabole. Puisqu'elle est **tournée vers le bas** (ses branches sont dirigées vers le bas), on en déduit immédiatement que le coefficient dominant $a$ est strictement négatif."
    },
    {
        id: "fonc-8",
        category: "Fonctions",
        question: "Le graphe ci-dessous illustre une fonction $f$. Sur quel intervalle la fonction est-elle manifestement **croissante** ?",
        questionGraphData: {
            domain: { x: [-3, 5], y: [-4, 6] },
            functions: [ { fn: "0.5*x^3 - 1.5*x^2 - 1", color: "#3b82f6" } ]
        },
        options: [
            "$]-\\infty, 0]$",
            "$[0, 2]$",
            "$[2, +\\infty[$",
            "$[-3, 5]$"
        ],
        correctAnswerIndex: 2
    },
    {
        id: "fonc-9",
        category: "Fonctions",
        question: "On considère la fonction rationnelle $g(x) = \\dfrac{x+1}{x-2}$. Quel est le tableau de signes correct ?",
        options: [
            "Signe positif sur $]-\\infty, -1]$ puis négatif",
            "Négatif entre $-1$ et $2$, positif ailleurs",
            "Positif entre $-1$ et $2$, négatif ailleurs",
            "Toujours positif sauf en $x=2$"
        ],
        optionsTableData: [
            {
                xValues: ["-\\infty", "-1", "2", "+\\infty"],
                rows: [ 
                    { label: "$x+1$", type: "sign", content: ["-", "0", "+", " ", "+"] }, 
                    { label: "$x-2$", type: "sign", content: ["-", " ", "-", "0", "+"] }, 
                    { label: "$g(x)$", type: "sign", content: ["+", "0", "-", "||", "+"] } 
                ]
            },
            {
                xValues: ["-\\infty", "-1", "2", "+\\infty"],
                rows: [ { label: "$g(x)$", type: "sign", content: ["+", "0", "-", "||", "+"] } ]
            },
            {
                xValues: ["-\\infty", "-1", "2", "+\\infty"],
                rows: [ { label: "$g(x)$", type: "sign", content: ["-", "0", "+", "||", "-"] } ]
            },
            {
                xValues: ["-\\infty", "2", "+\\infty"],
                rows: [ { label: "$g(x)$", type: "sign", content: ["+", "||", "+"] } ]
            }
        ],
        correctAnswerIndex: 1
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
    },
    // --- SUJET AUTOMATISMES 15/04/2026 ---
    // Bloc A — Calcul numérique et algébrique
    {
        id: "auto-avril26-q1",
        category: "Calcul numérique et algébrique",
        question: "Laquelle de ces expressions est égale à $\\dfrac{3}{4} - \\dfrac{1}{6}$ ?",
        options: [
            "$\\dfrac{2}{10}$",
            "$\\dfrac{7}{12}$",
            "$\\dfrac{1}{3}$",
            "$\\dfrac{5}{12}$"
        ],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{3}{4} - \\dfrac{1}{6} = \\dfrac{9}{12} - \\dfrac{2}{12} = \\dfrac{7}{12}$"
    },
    {
        id: "auto-avril26-q2",
        category: "Calcul numérique et algébrique",
        question: "On a $2^3 \\times 2^{-5} =$",
        options: [
            "$2^{-2}$",
            "$2^{-15}$",
            "$4^{-2}$",
            "$2^{8}$"
        ],
        correctAnswerIndex: 0,
        explanation: "$2^{3+(-5)} = 2^{-2}$"
    },
    {
        id: "auto-avril26-q3",
        category: "Calcul numérique et algébrique",
        question: "Quelle est la forme factorisée de $x^2 - 9$ ?",
        options: [
            "$(x-3)^2$",
            "$(x+3)(x-3)$",
            "$(x-9)(x+1)$",
            "$(x+3)^2$"
        ],
        correctAnswerIndex: 1,
        explanation: "$x^2 - 9 = (x-3)(x+3)$"
    },
    // Bloc B — Évolutions et pourcentages
    {
        id: "auto-avril26-q4",
        category: "Évolutions et variations",
        question: "Augmenter une valeur de $15\\,\\%$ revient à la multiplier par :",
        options: [
            "$1{,}015$",
            "$1{,}15$",
            "$0{,}85$",
            "$15$"
        ],
        correctAnswerIndex: 1,
        explanation: "$+15\\%$ $\\rightarrow$ coefficient multiplicateur $1{,}15$"
    },
    {
        id: "auto-avril26-q5",
        category: "Évolutions et variations",
        question: "Un article coûtait $80$\\,€. Son prix augmente de $20\\,\\%$, puis diminue de $20\\,\\%$. Son prix final est :",
        options: [
            "$80$\\,€",
            "$76{,}80$\\,€",
            "$96$\\,€",
            "$64$\\,€"
        ],
        correctAnswerIndex: 1,
        explanation: "$80 \\times 1{,}2 \\times 0{,}8 = 76{,}80$\\,€"
    },
    {
        id: "auto-avril26-q6",
        category: "Évolutions et variations",
        question: "Le taux d'évolution global de deux évolutions successives de $+10\\,\\%$ puis $-10\\,\\%$ est :",
        options: [
            "$0\\,\\%$",
            "$-1\\,\\%$",
            "$+1\\,\\%$",
            "$-20\\,\\%$"
        ],
        correctAnswerIndex: 1,
        explanation: "$1{,}1 \\times 0{,}9 = 0{,}99$ $\\rightarrow$ taux global $-1\\%$"
    },
    // Bloc C — Fonctions et représentations
    {
        id: "auto-avril26-q7",
        category: "Fonctions",
        question: "La fonction $f$ définie par $f(x) = -2x + 5$ est :",
        options: [
            "croissante sur $\\mathbb{R}$",
            "décroissante sur $\\mathbb{R}$",
            "ni croissante ni décroissante",
            "paire"
        ],
        correctAnswerIndex: 1,
        explanation: "Coefficient directeur $-2 < 0$ donc $f$ décroissante sur $\\mathbb{R}$"
    },
    {
        id: "auto-avril26-q8",
        category: "Fonctions",
        question: "La droite d'équation $y = 3x - 2$ passe par le point :",
        options: [
            "$(1\\,;\\,2)$",
            "$(0\\,;\\,3)$",
            "$(2\\,;\\,4)$",
            "$(1\\,;\\,1)$"
        ],
        correctAnswerIndex: 2,
        explanation: "$f(2) = 3(2) - 2 = 4$ $\\checkmark$"
    },
    {
        id: "auto-avril26-q9",
        category: "Fonctions",
        question: "On considère $f(x) = x^2 - 4x + 3$. La valeur de $f(0)$ est :",
        options: [
            "$-1$",
            "$0$",
            "$3$",
            "$4$"
        ],
        correctAnswerIndex: 2,
        explanation: "$f(0) = 0 - 0 + 3 = 3$"
    },
    // Bloc D — Probabilités et statistiques
    {
        id: "auto-avril26-q10",
        category: "Statistiques",
        question: "Une série de 5 valeurs est : $2\\,;\\,5\\,;\\,7\\,;\\,8\\,;\\,3$. Sa moyenne est :",
        options: [
            "$5$",
            "$6$",
            "$7$",
            "$4{,}5$"
        ],
        correctAnswerIndex: 0,
        explanation: "$(2+5+7+8+3) \\div 5 = 25 \\div 5 = 5$"
    },
    {
        id: "auto-avril26-q11",
        category: "Probabilités",
        question: "On lance un dé équilibré à 6 faces. La probabilité d'obtenir un nombre pair est :",
        options: [
            "$\\dfrac{1}{6}$",
            "$\\dfrac{1}{3}$",
            "$\\dfrac{1}{2}$",
            "$\\dfrac{2}{3}$"
        ],
        correctAnswerIndex: 2,
        explanation: "$P(\\text{pair}) = \\dfrac{3}{6} = \\dfrac{1}{2}$"
    },
    {
        id: "auto-avril26-q12",
        category: "Probabilités",
        question: "Dans une classe, $25\\,\\%$ des élèves ont une note supérieure à 15. Sur 32 élèves, combien cela représente-t-il ?",
        options: [
            "$6$",
            "$8$",
            "$10$",
            "$12$"
        ],
        correctAnswerIndex: 1,
        explanation: "$32 \\times 0{,}25 = 8$"
    },
    // Bloc E — Formules : isoler une variable
    {
        id: "auto-avril26-q13",
        category: "Calcul numérique et algébrique",
        question: "La loi des gaz parfaits est $PV = nRT$. Exprimer $T$ en fonction des autres variables :",
        options: [
            "$T = PV - nR$",
            "$T = \\dfrac{nR}{PV}$",
            "$T = \\dfrac{PV}{nR}$",
            "$T = \\dfrac{P}{nRV}$"
        ],
        correctAnswerIndex: 2,
        explanation: "$PV = nRT \\Rightarrow T = \\dfrac{PV}{nR}$"
    },
    {
        id: "auto-avril26-q14",
        category: "Calcul numérique et algébrique",
        question: "La loi d'Ohm est $U = RI$, avec $I \\neq 0$. Exprimer $R$ :",
        options: [
            "$R = UI$",
            "$R = U - I$",
            "$R = \\dfrac{I}{U}$",
            "$R = \\dfrac{U}{I}$"
        ],
        correctAnswerIndex: 3,
        explanation: "$U = RI \\Rightarrow R = \\dfrac{U}{I}$"
    },
    {
        id: "auto-avril26-q15",
        category: "Calcul numérique et algébrique",
        question: "La vitesse moyenne est $v = \\dfrac{d}{t}$. Exprimer $d$ en fonction de $v$ et $t$ :",
        options: [
            "$d = \\dfrac{v}{t}$",
            "$d = v + t$",
            "$d = vt$",
            "$d = \\dfrac{t}{v}$"
        ],
        correctAnswerIndex: 2,
        explanation: "$v = \\dfrac{d}{t} \\Rightarrow d = vt$"
    },
    {
        id: "auto-avril26-q16",
        category: "Calcul numérique et algébrique",
        question: "L'énergie cinétique est $E_c = \\dfrac{1}{2}mv^2$, avec $v \\neq 0$. Exprimer $m$ :",
        options: [
            "$m = \\dfrac{2E_c}{v^2}$",
            "$m = \\dfrac{E_c}{2v^2}$",
            "$m = 2E_c v^2$",
            "$m = \\dfrac{v^2}{2E_c}$"
        ],
        correctAnswerIndex: 0,
        explanation: "$E_c = \\dfrac{1}{2}mv^2 \\Rightarrow m = \\dfrac{2E_c}{v^2}$"
    },
    {
        id: "auto-avril26-q17",
        category: "Calcul numérique et algébrique",
        question: "On a $\\Pi = \\dfrac{nRT}{V}$. Exprimer $n$ en fonction des autres variables :",
        options: [
            "$n = \\Pi RT - V$",
            "$n = \\dfrac{\\Pi V}{RT}$",
            "$n = \\dfrac{RT}{\\Pi V}$",
            "$n = \\Pi VRT$"
        ],
        correctAnswerIndex: 1,
        explanation: "$\\Pi = \\dfrac{nRT}{V} \\Rightarrow n = \\dfrac{\\Pi V}{RT}$"
    },
    // Bloc F — Expressions algébriques : réduire / simplifier
    {
        id: "auto-avril26-q18",
        category: "Calcul numérique et algébrique",
        question: "Réduire l'expression $3x + 2 - 5x + 7$ :",
        options: [
            "$-2x + 9$",
            "$8x + 9$",
            "$-2x - 5$",
            "$2x + 9$"
        ],
        correctAnswerIndex: 0,
        explanation: "$3x - 5x = -2x$ et $2 + 7 = 9$"
    },
    {
        id: "auto-avril26-q19",
        category: "Calcul numérique et algébrique",
        question: "Développer et réduire $(x + 3)^2 - (x-1)(x+1)$ :",
        options: [
            "$6x + 10$",
            "$6x + 8$",
            "$2x^2 + 6x + 8$",
            "$6x + 9$"
        ],
        correctAnswerIndex: 0,
        explanation: "$(x^2 + 6x + 9) - (x^2 - 1) = 6x + 10$"
    },
    {
        id: "auto-avril26-q20",
        category: "Calcul numérique et algébrique",
        question: "Simplifier $\\dfrac{x^2 - 4}{x - 2}$ pour $x \\neq 2$ :",
        options: [
            "$x - 2$",
            "$x + 2$",
            "$\\dfrac{x}{2}$",
            "$x^2 + 2$"
        ],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{(x-2)(x+2)}{x-2} = x+2$"
    },
    {
        id: "auto-avril26-q21",
        category: "Calcul numérique et algébrique",
        question: "Pour $x \\neq 0$ et $y \\neq 0$, simplifier :\n$\\dfrac{x+y}{x} - \\dfrac{(x-y)^2}{xy}$",
        options: [
            "$\\dfrac{y^2 + 4xy - x^2}{xy}$",
            "$\\dfrac{2y^2 + 4xy - x^2}{xy}$",
            "$\\dfrac{3y - x}{y}$",
            "$\\dfrac{3x - y}{x}$"
        ],
        correctAnswerIndex: 2,
        explanation: "$\\dfrac{y(x+y) - (x-y)^2}{xy} = \\dfrac{3xy - x^2}{xy} = \\dfrac{3y - x}{y}$"
    },
    {
        id: "auto-avril26-q22",
        category: "Calcul numérique et algébrique",
        question: "Développer et réduire $(2x - 1)(3x + 4)$ :",
        options: [
            "$6x^2 + 5x - 4$",
            "$6x^2 - 5x + 4$",
            "$5x^2 + 5x - 4$",
            "$6x^2 + 5x + 4$"
        ],
        correctAnswerIndex: 0,
        explanation: "$6x^2 + 8x - 3x - 4 = 6x^2 + 5x - 4$"
    },
    {
        id: "auto-avril26-q23",
        category: "Calcul numérique et algébrique",
        question: "Factoriser $4x^2 - 1$ :",
        options: [
            "$(2x - 1)^2$",
            "$(4x - 1)(x + 1)$",
            "$(2x - 1)(2x + 1)$",
            "$2(2x^2 - 1)$"
        ],
        correctAnswerIndex: 2,
        explanation: "$4x^2 - 1 = (2x)^2 - 1^2 = (2x-1)(2x+1)$"
    },
    // --- SUJET QCM 30 QUESTIONS (sujet1.tex) ---
    {
        id: "sujet1-q1",
        category: "Calcul numérique et algébrique",
        question: "La valeur de $\\dfrac{2}{3} + \\dfrac{5}{6}$ est :",
        options: [
            "$\\dfrac{7}{9}$",
            "$\\dfrac{9}{6}$",
            "$\\dfrac{3}{2}$",
            "$\\dfrac{7}{18}$"
        ],
        correctAnswerIndex: 2,
        explanation: "$\\dfrac{2}{3} + \\dfrac{5}{6} = \\dfrac{4}{6} + \\dfrac{5}{6} = \\dfrac{9}{6} = \\dfrac{3}{2}$"
    },
    {
        id: "sujet1-q2",
        category: "Calcul numérique et algébrique",
        question: "$(2x - 3)^2$ est égal à :",
        options: [
            "$4x^2 - 9$",
            "$4x^2 - 6x + 9$",
            "$4x^2 - 12x + 9$",
            "$4x^2 + 12x + 9$"
        ],
        correctAnswerIndex: 2,
        explanation: "$(2x-3)^2 = (2x)^2 - 2 \\times 2x \\times 3 + 3^2 = 4x^2 - 12x + 9$"
    },
    {
        id: "sujet1-q3",
        category: "Calcul numérique et algébrique",
        question: "La forme factorisée de $x^2 - 25$ est :",
        options: [
            "$(x-5)^2$",
            "$(x+5)^2$",
            "$(x-25)(x+25)$",
            "$(x-5)(x+5)$"
        ],
        correctAnswerIndex: 3,
        explanation: "$x^2 - 25 = x^2 - 5^2 = (x-5)(x+5)$"
    },
    {
        id: "sujet1-q4",
        category: "Calcul numérique et algébrique",
        question: "L'équation $3x + 2 = 5x - 4$ a pour solution :",
        options: [
            "$x = 3$",
            "$x = -3$",
            "$x = 1$",
            "$x = 6$"
        ],
        correctAnswerIndex: 0,
        explanation: "$3x + 2 = 5x - 4 \\Leftrightarrow 2 + 4 = 5x - 3x \\Leftrightarrow 6 = 2x \\Leftrightarrow x = 3$"
    },
    {
        id: "sujet1-q5",
        category: "Calcul numérique et algébrique",
        question: "La solution de $\\dfrac{3}{x} = 6$ est :",
        options: [
            "$x = 2$",
            "$x = \\dfrac{1}{2}$",
            "$x = 18$",
            "$x = 0{,}5$"
        ],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{3}{x} = 6 \\Leftrightarrow 3 = 6x \\Leftrightarrow x = \\dfrac{3}{6} = \\dfrac{1}{2}$"
    },
    {
        id: "sujet1-q6",
        category: "Fonctions",
        question: "Le signe de $f(x) = 2x - 6$ pour $x > 3$ est :",
        options: [
            "positif",
            "négatif",
            "nul",
            "impossible à déterminer"
        ],
        correctAnswerIndex: 0,
        explanation: "$f(x) = 2x - 6 = 2(x - 3)$. Pour $x > 3$, $x - 3 > 0$ donc $f(x) > 0$."
    },
    {
        id: "sujet1-q7",
        category: "Calcul numérique et algébrique",
        question: "$10^{-3} \\times 10^5$ est égal à :",
        options: [
            "$10^{-15}$",
            "$10^{-2}$",
            "$10^{2}$",
            "$10^{8}$"
        ],
        correctAnswerIndex: 2,
        explanation: "$10^{-3} \\times 10^5 = 10^{-3+5} = 10^2$"
    },
    {
        id: "sujet1-q8",
        category: "Évolutions et variations",
        question: "Augmenter un prix de $10\\,\\%$ revient à le multiplier par :",
        options: [
            "$0{,}1$",
            "$1{,}1$",
            "$0{,}9$",
            "$1{,}01$"
        ],
        correctAnswerIndex: 1,
        explanation: "$+10\\%$ $\\rightarrow$ coefficient multiplicateur $1 + 0{,}1 = 1{,}1$"
    },
    {
        id: "sujet1-q9",
        category: "Évolutions et variations",
        question: "Une baisse de $20\\,\\%$ suivie d'une hausse de $20\\,\\%$ correspond à :",
        options: [
            "une hausse de $4\\,\\%$",
            "une baisse de $4\\,\\%$",
            "aucun changement",
            "une baisse de $0\\,\\%$"
        ],
        correctAnswerIndex: 1,
        explanation: "$0{,}8 \\times 1{,}2 = 0{,}96$ $\\rightarrow$ baisse de $4\\,\\%$"
    },
    {
        id: "sujet1-q10",
        category: "Fonctions",
        question: "L'image de $2$ par la fonction $f(x) = 3x - 5$ est :",
        options: [
            "$1$",
            "$-1$",
            "$11$",
            "$0$"
        ],
        correctAnswerIndex: 0,
        explanation: "$f(2) = 3 \\times 2 - 5 = 6 - 5 = 1$"
    },
    {
        id: "sujet1-q11",
        category: "Statistiques",
        question: "La médiane de la série $3, 7, 8, 10, 12$ est :",
        options: [
            "$7$",
            "$8$",
            "$9$",
            "$10$"
        ],
        correctAnswerIndex: 1,
        explanation: "La série est déjà ordonnée (5 valeurs). La médiane est la 3ᵉ valeur : $8$."
    },
    {
        id: "sujet1-q12",
        category: "Probabilités",
        question: "La probabilité de tirer un as dans un jeu de 32 cartes est :",
        options: [
            "$\\dfrac{1}{32}$",
            "$\\dfrac{4}{32}$",
            "$\\dfrac{1}{6}$",
            "$\\dfrac{1}{4}$"
        ],
        correctAnswerIndex: 1,
        explanation: "Il y a 4 as dans un jeu de 32 cartes : $P = \\dfrac{4}{32} = \\dfrac{1}{8}$"
    },
    {
        id: "sujet1-q13",
        category: "Probabilités",
        question: "Si $P(A) = 0{,}3$, alors $P(\\overline{A})$ vaut :",
        options: [
            "$0{,}7$",
            "$0{,}3$",
            "$1$",
            "$0$"
        ],
        correctAnswerIndex: 0,
        explanation: "$P(\\overline{A}) = 1 - P(A) = 1 - 0{,}3 = 0{,}7$"
    },
    {
        id: "sujet1-q14",
        category: "Fonctions",
        question: "La droite d'équation $y = 2x + 1$ a pour coefficient directeur :",
        options: [
            "$1$",
            "$2$",
            "$x$",
            "$3$"
        ],
        correctAnswerIndex: 1,
        explanation: "Dans $y = ax + b$, le coefficient directeur est $a = 2$."
    },
    {
        id: "sujet1-q15",
        category: "Calcul numérique et algébrique",
        question: "$\\dfrac{2}{3} \\times \\dfrac{9}{4}$ est égal à :",
        options: [
            "$\\dfrac{18}{12}$",
            "$\\dfrac{3}{2}$",
            "$\\dfrac{6}{7}$",
            "$\\dfrac{11}{7}$"
        ],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{2}{3} \\times \\dfrac{9}{4} = \\dfrac{18}{12} = \\dfrac{3}{2}$"
    },
    {
        id: "sujet1-q16",
        category: "Calcul numérique et algébrique",
        question: "L'équation $x^2 = 16$ a pour solutions :",
        options: [
            "$x=4$ seulement",
            "$x=-4$ seulement",
            "$x=4$ ou $x=-4$",
            "$x=8$ ou $x=-8$"
        ],
        correctAnswerIndex: 2,
        explanation: "$x^2 = 16 \\Leftrightarrow x = \\sqrt{16} = 4$ ou $x = -\\sqrt{16} = -4$"
    },
    {
        id: "sujet1-q17",
        category: "Calcul numérique et algébrique",
        question: "$-(a - b)$ est égal à :",
        options: [
            "$-a - b$",
            "$b - a$",
            "$a + b$",
            "$-a + b$"
        ],
        correctAnswerIndex: 1,
        explanation: "$-(a - b) = -a + b = b - a$"
    },
    {
        id: "sujet1-q18",
        category: "Calcul numérique et algébrique",
        question: "$5$ heures en minutes correspondent à :",
        options: [
            "$300$",
            "$500$",
            "$60$",
            "$360$"
        ],
        correctAnswerIndex: 0,
        explanation: "$5 \\times 60 = 300$ minutes"
    },
    {
        id: "sujet1-q19",
        category: "Statistiques",
        question: "La moyenne de $12$, $15$, $18$ est :",
        options: [
            "$12$",
            "$15$",
            "$18$",
            "$16$"
        ],
        correctAnswerIndex: 1,
        explanation: "$\\dfrac{12 + 15 + 18}{3} = \\dfrac{45}{3} = 15$"
    },
    {
        id: "sujet1-q20",
        category: "Probabilités",
        question: "$P(A \\cap B) = 0{,}2$ et $P(A) = 0{,}5$, alors $P_A(B)$ vaut :",
        options: [
            "$0{,}1$",
            "$0{,}4$",
            "$0{,}7$",
            "$0{,}3$"
        ],
        correctAnswerIndex: 1,
        explanation: "$P_A(B) = \\dfrac{P(A \\cap B)}{P(A)} = \\dfrac{0{,}2}{0{,}5} = 0{,}4$"
    },
    {
        id: "sujet1-q21",
        category: "Fonctions",
        question: "La représentation graphique de $f(x) = 4$ est :",
        options: [
            "une droite horizontale",
            "une droite verticale",
            "une parabole",
            "une hyperbole"
        ],
        correctAnswerIndex: 0,
        explanation: "$f(x) = 4$ est une fonction constante. Sa représentation est une droite horizontale passant par $y = 4$."
    },
    {
        id: "sujet1-q22",
        category: "Proportions et pourcentages",
        question: "$25\\,\\%$ d'une quantité de $200$ euros est :",
        options: [
            "$25$",
            "$50$",
            "$75$",
            "$100$"
        ],
        correctAnswerIndex: 1,
        explanation: "$200 \\times 0{,}25 = 50$"
    },
    {
        id: "sujet1-q23",
        category: "Calcul numérique et algébrique",
        question: "$3 \\times 10^2 + 4 \\times 10^1$ est égal à :",
        options: [
            "$34$",
            "$340$",
            "$304$",
            "$3004$"
        ],
        correctAnswerIndex: 1,
        explanation: "$3 \\times 100 + 4 \\times 10 = 300 + 40 = 340$"
    },
    {
        id: "sujet1-q24",
        category: "Calcul numérique et algébrique",
        question: "Résoudre $x(x - 3) = 0$ donne :",
        options: [
            "$x=0$ ou $x=3$",
            "$x=0$ ou $x=-3$",
            "$x=3$ seulement",
            "$x=0$ seulement"
        ],
        correctAnswerIndex: 0,
        explanation: "Un produit est nul si l'un de ses facteurs est nul : $x = 0$ ou $x - 3 = 0$ soit $x = 3$."
    },
    {
        id: "sujet1-q25",
        category: "Calcul numérique et algébrique",
        question: "L'inéquation $-2x + 4 > 0$ a pour solution :",
        options: [
            "$x > 2$",
            "$x < 2$",
            "$x > -2$",
            "$x < -2$"
        ],
        correctAnswerIndex: 1,
        explanation: "$-2x + 4 > 0 \\Leftrightarrow -2x > -4 \\Leftrightarrow x < 2$ (on divise par $-2$, le sens change)."
    },
    {
        id: "sujet1-q26",
        category: "Calcul numérique et algébrique",
        question: "Si $v = \\dfrac{d}{t}$, alors $d$ vaut :",
        options: [
            "$v \\times t$",
            "$\\dfrac{v}{t}$",
            "$\\dfrac{t}{v}$",
            "$v + t$"
        ],
        correctAnswerIndex: 0,
        explanation: "$v = \\dfrac{d}{t} \\Leftrightarrow d = v \\times t$"
    },
    {
        id: "sujet1-q27",
        category: "Statistiques",
        question: "Dans un diagramme circulaire, $50\\,\\%$ représentent :",
        options: [
            "un angle droit",
            "$180^\\circ$",
            "$90^\\circ$",
            "$360^\\circ$"
        ],
        correctAnswerIndex: 1,
        explanation: "$50\\,\\%$ de $360^\\circ = 180^\\circ$"
    },
    {
        id: "sujet1-q28",
        category: "Calcul numérique et algébrique",
        question: "$1$ litre en $m^3$ vaut :",
        options: [
            "$10^{-3}$",
            "$10^{3}$",
            "$1$",
            "$0{,}1$"
        ],
        correctAnswerIndex: 0,
        explanation: "$1$ litre $= 1$ dm³ $= 10^{-3}$ m³"
    },
    {
        id: "sujet1-q29",
        category: "Fonctions",
        question: "La fonction affine passant par $(0\\,;\\,1)$ et $(2\\,;\\,5)$ est :",
        options: [
            "$y = 2x + 1$",
            "$y = x + 1$",
            "$y = 4x + 1$",
            "$y = 2x - 1$"
        ],
        correctAnswerIndex: 0,
        explanation: "Coefficient directeur : $a = \\dfrac{5 - 1}{2 - 0} = 2$. Ordonnée à l'origine : $b = 1$. Donc $y = 2x + 1$."
    },
    {
        id: "sujet1-q30",
        category: "Évolutions et variations",
        question: "Le taux réciproque d'une hausse de $25\\,\\%$ est une baisse de :",
        options: [
            "$20\\,\\%$",
            "$25\\,\\%$",
            "$30\\,\\%$",
            "$50\\,\\%$"
        ],
        correctAnswerIndex: 0,
        explanation: "CM = $1{,}25$. CM réciproque $= \\dfrac{1}{1{,}25} = 0{,}8$ $\\rightarrow$ baisse de $20\\,\\%$."
    }
];

export function generateRandomQcmSession(numberOfQuestions: number = 12): QcmQuestion[] {
    // Organiser par catégories (en filtrant les questions invalides)
    const questionsByCategory: Record<string, QcmQuestion[]> = {};
    for (const q of qcmDatabase) {
        // Exclure les questions sans bonne réponse valide
        if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) continue;
        if (!questionsByCategory[q.category]) questionsByCategory[q.category] = [];
        questionsByCategory[q.category].push(q);
    }

    const categories = Object.keys(questionsByCategory);
    const selected: QcmQuestion[] = [];
    const questionsPerCategory = Math.max(1, Math.floor(numberOfQuestions / categories.length));

    // Pour chaque catégorie, on pioche un mix
    for (const cat of categories) {
        const catQuestions = [...questionsByCategory[cat]].sort(() => Math.random() - 0.5);
        // Trier pour donner priorité aux questions avec graph
        catQuestions.sort((a,b) => (b.questionGraphData ? 1 : 0) - (a.questionGraphData ? 1 : 0));
        
        for (let i = 0; i < questionsPerCategory; i++) {
            // 70% de généré procéduralement, 30% issu de la base fixe
            if (Math.random() < 0.7 || i >= catQuestions.length) {
                selected.push(generateProceduralQuestion(cat as QcmCategory));
            } else {
                selected.push(catQuestions[i]);
            }
        }
    }

    // Compléter avec du procédural si jamais le compte n'est pas bon
    while (selected.length < numberOfQuestions) {
        const randomCat = categories[Math.floor(Math.random() * categories.length)] as QcmCategory;
        selected.push(generateProceduralQuestion(randomCat));
    }

    // Filtrer pour toujours afficher les questions avec graphiques en premier lors de la phase de test
    const finalSelection = [
        ...selected.filter(q => q.questionGraphData || q.category === 'Statistiques'),
        ...selected.filter(q => !q.questionGraphData && q.category !== 'Statistiques')
    ];

    // Ne pas mélanger globalement si on veut observer les statistiques d'abord
    return finalSelection.slice(0, numberOfQuestions);
}
