import { QcmCategory, QcmQuestion } from './qcm-data';

// --- Helpers Proceduraux ---
function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function randomSign() {
    return Math.random() < 0.5 ? 1 : -1;
}

// --- Generateurs par Catégorie ---

function genCalcul(): QcmQuestion {
    const type = randInt(1, 3);
    const id = "gen-calc-" + Math.random().toString(36).substring(7);
    const cat: QcmCategory = "Calcul numérique et algébrique";
    
    if (type === 1) {
        let a = randInt(2, 6);
        let b = randInt(1, 6) * randomSign();
        let question = `Quelle est la forme développée et réduite de l'expression $A(x) = (${a}x ${b > 0 ? '+' : ''}${b})^2$ ?`;
        let correct = `$${a*a}x^2 ${2*a*b > 0 ? '+' : ''}${2*a*b}x + ${b*b}$`;
        let opts = shuffle([
            correct,
            `$${a*a}x^2 + ${b*b}$`,
            `$${a*a}x^2 ${a*b > 0 ? '+' : ''}${a*b}x + ${b*b}$`,
            `$${a}x^2 ${2*a*b > 0 ? '+' : ''}${2*a*b}x + ${b*b}$`
        ]);
        return {
            id, category: cat, question, options: opts,
            correctAnswerIndex: opts.indexOf(correct),
            explanation: `On utilise l'identité remarquable $(u+v)^2 = u^2 + 2uv + v^2$. Ici $u=${a}x$ et $v=${b}$, donc $(${a}x)^2 + 2 \\times ${a}x \\times ${b} + (${b})^2 = ${a*a}x^2 + ${2*a*b}x + ${b*b}$.`
        };
    } else if (type === 2) {
        let c = randInt(1, 10) * randInt(1, 10);
        let sqrtC = Math.sqrt(c);
        let question = `Combien de solutions réelles l'équation $x^2 = ${c}$ possède-t-elle ?`;
        let correct = `Deux solutions : $-${sqrtC}$ et $${sqrtC}$`;
        let opts = shuffle([correct, `Une seule solution : $${sqrtC}$`, `Aucune solution`, `Deux solutions : $-${c}$ et $${c}$`]);
        return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `Pour tout nombre réel $c > 0$, l'équation $x^2 = c$ admet toujours deux solutions distinctes : $x = -\\sqrt{c}$ et $x = \\sqrt{c}$.`};
    } else {
        let a = randInt(1, 8) * randomSign();
        let b = randInt(2, 5);
        let c = randInt(1, 7) * randomSign();
        let question = `Quelles sont les solutions de l'équation $(x ${a > 0 ? '-' : '+'}${Math.abs(a)})(${b}x ${c > 0 ? '+' : ''}${c}) = 0$ ?`;
        let sol1 = `${a}`;
        let sol2Numerator = -c;
        let correct = `$${sol1}$ et $${sol2Numerator}/${b}$`;
        let opts = shuffle([correct, `$${-a}$ et $${sol2Numerator}/${b}$`, `$${sol1}$ et $${c}/${b}$`, `$${-a}$ et $${c}/${b}$`]);
        return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `Un produit vaut zéro si l'un de ses facteurs vaut zéro. Soit $x - ${a} = 0 \\implies x = ${sol1}$. Soit $${b}x + ${c} = 0 \\implies x = ${sol2Numerator}/${b}$.`};
    }
}

function genProportions(): QcmQuestion {
    const id = "gen-prop-" + Math.random().toString(36).substring(7);
    const cat: QcmCategory = "Proportions et pourcentages";
    let N = randInt(2, 5) * 10;
    let P = randInt(5, N - 5);
    let pct = Math.round((P/N)*100);
    let question = `Dans un groupe de ${N} personnes, ${P} portent des lunettes. Quelle est la proportion (en pourcentage, arrondie à l'entier) de personnes portant des lunettes ?`;
    let correct = `$${pct}\\%$`;
    let opts = shuffle([correct, `$${pct + randInt(2, 5)}\\%$`, `$${pct - randInt(2, 5)}\\%$`, `$${Math.round((P/(N-P))*100)}\\%$`]);
    return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `La proportion est donnée par le rapport entre la sous-population et la population totale : $\\dfrac{${P}}{${N}}$. Pour l'avoir en pourcentage, on la multiplie par 100 : $\\dfrac{${P}}{${N}} \\times 100 \\approx ${pct}\\%$.`};
}

function genEvolutions(): QcmQuestion {
    const id = "gen-evol-" + Math.random().toString(36).substring(7);
    const cat: QcmCategory = "Évolutions et variations";
    let R = randInt(1, 9) * 10;
    if (Math.random() > 0.5) {
        let R2 = randInt(1, 9) * 10;
        let sign1 = randomSign();
        let sign2 = randomSign();
        let CM1 = 1 + sign1 * R / 100;
        let CM2 = 1 + sign2 * R2 / 100;
        let global = CM1 * CM2;
        let question = `Quel est le coefficient multiplicateur (CM) global correspondant à une ${sign1 > 0 ? 'hausse' : 'baisse'} de $${R}\\%$ suivie d'une ${sign2 > 0 ? 'hausse' : 'baisse'} de $${R2}\\%$ ?`;
        let correct = `$${global.toFixed(2)}$`;
        let fakeGlobal1 = 1 + (sign1 * R + sign2 * R2) / 100;
        let optsSet = new Set([correct, `$${fakeGlobal1.toFixed(2)}$`, `$${(global + 0.1).toFixed(2)}$`, `$${(fakeGlobal1 - 0.1).toFixed(2)}$`]);
        let opts = Array.from(optsSet);
        while (opts.length < 4) opts.push(`$${(Math.random() + 0.5).toFixed(2)}$`);
        opts = shuffle(opts);
        return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `Les taux d'évolution s'appliquent de manière multiplicative sur les coefficients ! Les coefficients multiplicateurs successifs sont $CM_1 = 1 ${sign1 > 0 ? '+' : '-'} \\frac{${R}}{100} = ${CM1}$ et $CM_2 = 1 ${sign2 > 0 ? '+' : '-'} \\frac{${R2}}{100} = ${CM2}$. Le nouveau coefficient global est $CM_{global} = CM_1 \\times CM_2 = ${global.toFixed(2)}$.`};
    } else {
        let RM = 1 + R / 100;
        let recip = ((1/RM) - 1)*100;
        let question = `Une action en bourse subit une hausse de $${R}\\%$. Quelle évolution théorique (arrondie) doit-elle subir pour retrouver sa valeur initiale ?`;
        let correct = `Baisse de $${Math.abs(Math.round(recip))}\\%$`;
        let opts = shuffle([correct, `Baisse de $${R}\\%$`, `Baisse de $${R+10}\\%$`, `Baisse de $${Math.abs(Math.round(recip))+5}\\%$`]);
        return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `L'évolution réciproque a pour coefficient multiplicateur $CM_{reciproque} = \\dfrac{1}{CM}$. Ici $CM = ${RM}$, donc le réciproque est d'environ ${(1/RM).toFixed(3)}$, ce qui équivaut à un taux d'évolution de $(${1/RM} - 1) \\times 100 \\approx ${recip.toFixed(2)}\\%$.`};
    }
}

function genFonctions(): QcmQuestion {
    const id = "gen-fonc-" + Math.random().toString(36).substring(7);
    const cat: QcmCategory = "Fonctions";
    const type = randInt(1, 3);
    
    if (type === 1) { // Parabola
        let a = randInt(1, 4) * randomSign();
        // alpha ≠ 0 : évite b=0 qui rendrait -alpha, -b et correct tous égaux à $0$
        let alpha = randInt(1, 3) * randomSign();
        let beta = randInt(-3, 3);
        let b = -2 * a * alpha;
        let c = a * alpha * alpha + beta;
        let fnTitle = `${a}*x^2 ${b >= 0 ? '+' : ''}${b}*x ${c >= 0 ? '+' : ''}${c}`;
        let question = `La courbe ci-dessous représente une fonction polynomiale du second degré $f(x) = ax^2 + bx + c$. \n\nQue vaut l'abscisse du **sommet** de la parabole, soit $-\\dfrac{b}{2a}$ ?`;

        // Distracteurs pédagogiques garantis distincts entre eux et de alpha
        // d1 : erreur de signe (oubli du «-» dans -b/2a)
        const d1 = -alpha; // ≠ alpha car alpha ≠ 0
        // d2 : confusion ordonnée/abscisse du sommet (beta = f(alpha))
        let d2 = beta;
        while (d2 === alpha || d2 === d1) d2 += (d2 >= 0 ? 1 : -1);
        // d3 : valeur décalée (erreur de lecture graphique)
        let d3 = alpha + (alpha > 0 ? 1 : -1);
        while (d3 === alpha || d3 === d1 || d3 === d2) d3 += (alpha > 0 ? 1 : -1);

        let correct = `$${alpha}$`;
        let opts = shuffle([correct, `$${d1}$`, `$${d2}$`, `$${d3}$`]);
        return {
            id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct),
            questionGraphData: { domain: { x: [-5, 5], y: [-10, 10] }, functions: [{ fn: fnTitle, color: "#3b82f6" }] },
            explanation: `Le sommet de la parabole correspond au point extremum de la courbe. Son abscisse, définie par $-\\dfrac{b}{2a}$, est lisible directement sur l'axe des abscisses. Le sommet se trouve ici à l'abscisse $x = ${alpha}$.`
        };
    } else if (type === 2) { // Sign Table Rational
        let rootNum = randInt(-4, 4);
        let rootDen = randInt(-4, 4);
        while(rootDen === rootNum) rootDen = randInt(-4, 4);
        let sorted = [rootNum, rootDen].sort((a,b)=>a-b);
        let question = `On considère la fonction rationnelle $g(x) = \\dfrac{x ${rootNum > 0 ? '-' : '+'}${Math.abs(rootNum)}}{x ${rootDen > 0 ? '-' : '+'}${Math.abs(rootDen)}}$. Quel est le tableau de signes correct ?`;
        
        // Let's generate valid MathTable formatting: 2N-3 rules
        let correctTable = {
            xValues: ["-\\infty", sorted[0].toString(), sorted[1].toString(), "+\\infty"],
            // 4 xValues => intervals: (-inf, v1), v1, (v1, v2), v2, (v2, inf) => length 5
            rows: [ { label: "$g(x)$", type: "sign", content: ["+", rootNum===sorted[0]?"0":"||", "-", rootNum===sorted[1]?"0":"||", "+"] } ]
        };
        let fakeTable1 = {
            ...correctTable,
            rows: [ { label: "$g(x)$", type: "sign", content: ["-", rootNum===sorted[0]?"0":"||", "+", rootNum===sorted[1]?"0":"||", "-"] } ]
        };
        let fakeTable2 = {
            ...correctTable,
            rows: [ { label: "$g(x)$", type: "sign", content: ["+", rootDen===sorted[0]?"0":"||", "-", rootDen===sorted[1]?"0":"||", "+"] } ]
        };
        let fakeTable3 = {
            ...correctTable,
            rows: [ { label: "$g(x)$", type: "sign", content: ["+", "0", "-", "0", "+"] } ]
        };
        
        let indices = shuffle([0, 1, 2, 3]);
        let finalOptsTable = indices.map(i => [correctTable, fakeTable1, fakeTable2, fakeTable3][i]);
        return {
            id, category: cat, question, options: ["Option A", "Option B", "Option C", "Option D"], 
            optionsTableData: finalOptsTable,
            correctAnswerIndex: indices.indexOf(0),
            explanation: `L'annulation strict du numérateur (en $x = ${rootNum}$) justifie un **zéro** en ligne finale. Par contre, le dénominateur s'annulant en $x = ${rootDen}$, il s'agit d'une **valeur interdite** ($||$). De plus le quotient des deux donne un signe "+" aux infinis.`
        };
    } else { // Variations TVI
        let c1 = randInt(-5, -2);
        let v1 = randInt(3, 8);
        let c2 = randInt(-1, 2);
        let v2 = randInt(-6, -1);
        let c3 = randInt(3, 5);
        let v3 = randInt(2, 6);
        let seq = [v1, v2, v3]; // Min/max alternate: it goes from v1 to v2 to v3
        
        let questionTableData = {
            xValues: [c1.toString(), c2.toString(), c3.toString()],
            // Content matches 2N-1
            rows: [ { label: "Variations de $f$", type: "variation", content: [v1.toString(), "searrow", v2.toString(), "nearrow", v3.toString()] } ]
        };
        let correct = "Deux solutions"; // Since it goes v1(+) -> v2(-) -> v3(+), crosses 0 twice.
        let opts = shuffle(["Aucune solution", "Une seule solution", correct, "Trois solutions"]);
        return {
            id, category: cat, question: `Soit $f$ une fonction définie sur $[-5 ; 5]$ dont le tableau de variations est donné ci-dessous. \n\nCombien de solutions l'équation $f(x) = 0$ admet-elle ?`, 
            options: opts, correctAnswerIndex: opts.indexOf(correct), questionTableData,
            explanation: `Via le fameux Corollaire du Théorème des Valeurs Intermédiaires (TVI), on lit l'annulation de $f(x) = 0$ sur chaque intervalle monotone. \n- De $${v1}$ à $${v2}$, $f$ repasse par zéro (une solution). \n- De $${v2}$ à $${v3}$, $f$ franchit un nouveau le zéro (une solution).\nAu total : $2$ solutions.`
        };
    }
}

function genStatistiques(): QcmQuestion {
    const id = "gen-stat-" + Math.random().toString(36).substring(7);
    const cat: QcmCategory = "Statistiques";
    let vals = Array.from({length: randInt(5, 7)}, () => randInt(1, 15)).sort((a,b)=>a-b);
    let question = `Dans la série ordonnée de valeurs $(${vals.join(', ')})$, quelle est la médiane ?`;
    let correct = vals.length % 2 === 1 ? vals[Math.floor(vals.length / 2)] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2;
    let opts = shuffle([`$${correct}$`, `$${correct+1}$`, `$${correct-1}$`, `$${vals[0]}$`]);
    return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(`$${correct}$`), explanation: `L'effectif total est de $N=${vals.length}$. La médiane est la mesure séparant la série en deux sous-groupes de même effectif. C'est ici environ le point central, soit la valeur $${correct}$.`};
}

function genProbabilites(): QcmQuestion {
    const id = "gen-prob-" + Math.random().toString(36).substring(7);
    const cat: QcmCategory = "Probabilités";
    let pA = randInt(1, 9) / 10;
    if(Math.random() > 0.5) {
        let question = `L'événement contraire $\\overline{A}$ d'un événement $A$ a pour probabilité $P(\\overline{A}) = ${pA}$. Quelle est la probabilité $P(A)$ ?`;
        let correct = `$${(1 - pA).toFixed(1)}$`;
        let opts = shuffle([correct, `$${pA}$`, `$${(pA/2).toFixed(1)}$`, `$1$`]);
        return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `Un événement et son contraire constituent l'univers entier dont la somme des probabilités est $1$. Donc $P(A) = 1 - P(\\overline{A}) = ${(1-pA).toFixed(1)}$.`};
    } else {
        // Contrainte : somme max = 0.9 → jamais de réponse "1" ou "1.0" (évite doublon dans les options)
        // pA entre 0.1 et 0.7, pB tel que pA + pB ≤ 0.9
        pA = randInt(1, 7) / 10;
        const maxPB = Math.floor((0.9 - pA) * 10); // garantit sum ≤ 0.9
        let pB = randInt(1, Math.max(1, maxPB)) / 10;
        const sum = Math.round((pA + pB) * 10) / 10; // toujours entre 0.2 et 0.9
        let question = `Si deux événements $A$ et $B$ sont incompatibles $\\big($avec $P(A)=${pA}$ et $P(B)=${pB}\\big)$, que vaut $P(A \\cup B)$ ?`;
        let correct = `$${sum.toFixed(1)}$`;
        const fakeProd = parseFloat((pA * pB).toFixed(2));
        const fakeDiff = parseFloat(Math.abs(pA - pB).toFixed(1));
        // "$1$" est un distracteur sûr car la bonne réponse est toujours ≤ 0.9
        let opts = shuffle([correct, `$${fakeProd.toFixed(2)}$`, `$1$`, `$${fakeDiff.toFixed(1)}$`]);
        return {id, category: cat, question, options: opts, correctAnswerIndex: opts.indexOf(correct), explanation: `Pour deux événements incompatibles, $P(A \\cup B) = P(A) + P(B) = ${pA} + ${pB} = ${sum.toFixed(1)}$.`};
    }
}

// L'Orchestrateur
export function generateProceduralQuestion(category: QcmCategory): QcmQuestion {
    switch(category) {
        case "Calcul numérique et algébrique": return genCalcul();
        case "Proportions et pourcentages": return genProportions();
        case "Évolutions et variations": return genEvolutions();
        case "Fonctions": return genFonctions();
        case "Statistiques": return genStatistiques();
        case "Probabilités": return genProbabilites();
    }
}
