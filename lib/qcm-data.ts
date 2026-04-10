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

    // --- AUTOMATISMES EDUSCOL — Fonctions / Suites ---
    {
        id: "eduscol-suite-1",
        category: "Fonctions",
        question: "Les nombres $11\\,; 15\\,; 19\\,; 23$ sont des termes consécutifs d'une suite. Cette suite est :",
        options: [
            "Arithmétique de raison $4$",
            "Arithmétique de raison $3$",
            "Géométrique de raison $4$",
            "Ni arithmétique, ni géométrique"
        ],
        correctAnswerIndex: 0,
        explanation: "$15 - 11 = 4$, $19 - 15 = 4$, $23 - 19 = 4$. La différence est constante et égale à $4$, c'est une suite arithmétique de raison $4$."
    },
    {
        id: "eduscol-suite-2",
        category: "Fonctions",
        question: "Un enfant dépose chaque semaine $5$€ dans sa tirelire. La suite $(u_n)$, où $u_n$ est la somme dans la tirelire après $n$ semaines, est :",
        options: ["Arithmétique", "Géométrique", "Ni l'une ni l'autre", "Constante"],
        correctAnswerIndex: 0,
        explanation: "La somme augmente de $5$€ chaque semaine : $u_{n+1} = u_n + 5$. C'est une suite arithmétique de raison $5$."
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
            // 30% de généré procéduralement, 70% issu de la base fixe (pour favoriser l'apparition des diagrammes en test)
            if (Math.random() < 0.3 || i >= catQuestions.length) {
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
