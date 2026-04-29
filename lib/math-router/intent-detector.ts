/**
 * INTENT DETECTOR — Détecteur d'intentions mathématiques
 * ════════════════════════════════════════════════════════
 * Analyse le texte d'une question de l'élève et extrait :
 * 1. Les sous-questions avec leur type d'intention mathématique
 * 2. Les expressions de fonctions à traiter
 * 3. La priorité de routing (Math Engine ou IA pure)
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type MathIntent =
    | 'sign_table'        // Tableau de signes / étude du signe
    | 'variation_table'   // Tableau de variations
    | 'graph'             // Tracer la courbe / graphique
    | 'solve_equation'    // Résoudre f(x) = 0
    | 'solve_inequality'  // Résoudre f(x) > 0, < 0, etc.
    | 'derivative'        // Calculer f'(x)
    | 'integral'          // Calculer une primitive / intégrale
    | 'factorize'         // Factoriser
    | 'limits'            // Calculer des limites
    | 'literal_calc'      // Calcul symbolique général
    | 'expand'            // Développer / réduire une expression
    | 'solve_system'      // Résoudre un système d'équations
    | 'sequence'          // Suites arithmétiques / géométriques
    | 'trig'              // Trigonométrie — valeurs exactes + équations
    | 'vector'            // Vecteurs — produit scalaire, norme, colinéarité
    | 'probability'       // Probabilités — loi binomiale, P(X=k)...
    | 'statistics'        // Statistiques — moyenne, médiane, écart-type
    | 'complex_calc'      // Nombres complexes — module, argument, forme
    | 'exp_log'           // Équations / simplifications exp et ln
    | 'unknown';          // IA pure sans routing

export interface DetectedIntent {
    intent: MathIntent;
    questionText: string;       // Texte de la sous-question
    expression: string | null;  // Expression extraite (ex: "(x-3)/(x+2)")
    questionNumber?: string;    // "1", "2a", "3"…
    variable: string;           // 'x' par défaut
    context?: string;           // ex: "f(x) > 0" pour solve_inequality
}

export interface RouterAnalysis {
    intents: DetectedIntent[];
    globalExpression: string | null; // Expression principale de l'exercice
    hasMathEngine: boolean;          // Au moins une intention routée au Math Engine
    niveau: string;
}

// ─────────────────────────────────────────────────────────────
// PATTERNS DE DÉTECTION
// ─────────────────────────────────────────────────────────────

const INTENT_PATTERNS: { intent: MathIntent; patterns: RegExp[] }[] = [
    {
        intent: 'sign_table',
        patterns: [
            /étudi(?:er|ons|ez)\s+le\s+signe/i,
            /tableau\s+de\s+signes?/i,
            /dresser\s+le\s+tableau\s+de\s+signes?/i,
            /signe\s+de\s+[fg]/i,
            /étude\s+(?:du|des)\s+signe/i,
            /analyse\s+(?:du|des)\s+signe/i,
            /signe|sign|tableau\s*de\s*signe|étudier?\s*(le\s*)?signe/i
        ],
    },
    {
        intent: 'variation_table',
        patterns: [
            /tableau\s+de\s+vari(?:ation|ations)/i,
            /dresser\s+le\s+tableau\s+de\s+vari/i,
            /étudi(?:er|ons|ez)\s+les?\s+vari(?:ation|ations)/i,
            /dresser\s+un\s+tableau\s+de\s+vari/i,
            /vari(?:ation|ations)\s+de\s+[fg]/i,
            /tableau\s+des\s+vari/i,
            /variation|tableau\s*de\s*variation|étudier?\s*(les?\s*)?variation/i
        ],
    },
    {
        intent: 'graph',
        patterns: [
            /trac(?:e|er|ez|ons(?:-\w+)?)\s+(?:moi\s+)?(?:la courbe|le graphe|la représentation)/i,
            /représentation\s+graphique/i,
            /courbe\s+représentative/i,
            /graphe\s+de\s+[fg]/i,
            /esquiss(?:e|er|ez)\s+(?:la courbe|le graphe)/i,
            /construi(?:re|s|sez)\s+(?:la courbe|le graphe)/i,
        ],
    },
    {
        intent: 'solve_inequality',
        patterns: [
            /résou(?:dre|ds)\s+.*[><≤≥]/i,
            /résou(?:dre|ds|tion)\s+l['']inéquation/i,
            /[fg]?\s*\([^)]*\)\s*[><≤≥]\s*0/i,
            /solution[s]?\s+.*[><≤≥]/i,
            /inéquation/i,
            /[><≤≥]\s*0/i,
            /[><≤≥]/,
        ],
    },
    {
        intent: 'solve_equation',
        patterns: [
            /résou(?:dre|ds)\s+l[''](?:é|e)quation/i,
            /résou(?:dre|ds)\s+.*[fg]\s*=\s*0/i,
            /[fg]\s*\([^)]*\)\s*=\s*0/i,
            /(?:zéros?|racines?)\s+de\s+[fg]/i,
            /antécédent\s+de\s+0/i,
        ],
    },
    {
        intent: 'derivative',
        patterns: [
            /calculer?\s+[fg][']\s*\(/i,
            /déterm[ei]n(?:er|ez)\s+[fg]['']/i,
            /dérivée?\s+de\s+[fg]/i,
            /nombre\s+dérivé/i,
            /[fg][']\s*\([^)]*\)/i,
            /dériver\s+[fg]/i,
            /calculer?\s+(?:la\s+)?d[eé]riv[eé]e\s+(?:de\s+)?[fghk]\s*\(|d[eé]terminer\s+[fghk]'\s*\(|^[fghk]'\s*\([^)]*\)\s*$|^d[eé]riv[eé]e\s+de\s+[fghk]\s*\(/i
        ],
    },
    {
        intent: 'integral',
        patterns: [
            /primitiv(?:e|es)\s+de\s+[fg]/i,
            /calculer?\s+l['']intégrale/i,
            /∫\s*[fg]/,
            /intégrale\s+de\s+[fg]/i,
            /aire\s+(?:sous|de)\s+(?:la courbe|[fg])/i,
        ],
    },
    {
        intent: 'limits',
        patterns: [
            /limit(?:e|es)/i,
            /lim\s*[({]/i,
            /lim\s+[fg]/i,
            /comportement\s+(?:en|à)\s+l'infini/i,
            /asymptot(?:e|es)/i,
            /tend\s+vers/i,
        ],
    },
    {
        intent: 'factorize',
        patterns: [
            /factori(?:ser|ser|sez)\s+/i,
            /factorisation/i,
            /mise\s+en\s+facteur/i,
        ],
    },
    {
        intent: 'expand',
        patterns: [
            /développ(?:er|ez|ons)\s+/i,
            /développement\s+de/i,
            /réduire?\s+(?:l['']expression|cette\s+expression|le\s+développement)/i,
            /développer?\s+et\s+réduire?/i,
            /\(.*[+\-].*\)\s*[\^²]\s*[23]/,
            /\(.*[+\-].*\)\s*\(.*[+\-].*\)/,
            /identit[eé]\s+remarquable/i,
        ],
    },
    {
        intent: 'solve_system',
        patterns: [
            /syst[eè]me\s+d[''](?:é|e)quation/i,
            /r[eé]soudre?\s+le\s+syst[eè]me/i,
            /r[eé]solution\s+du\s+syst[eè]me/i,
            /syst[eè]me\s*\{/i,
            /\{\s*[0-9a-z].*=.*\n?\s*[0-9a-z].*=/i,
        ],
    },
    {
        intent: 'sequence',
        patterns: [
            /suite\s+arithm[eé]tique/i,
            /suite\s+g[eé]om[eé]trique/i,
            /terme\s+g[eé]n[eé]ral\s+(?:de\s+)?(?:la\s+)?suite/i,
            /suite\s+(?:\(u_?n\)|u_?n)/i,
            /u_?(?:n|0|1)\s*=/i,
            /raison\s+[rq]\s*=/i,
            /premier\s+terme/i,
            /somme\s+des\s+(?:n\s+)?premiers?\s+termes?/i,
            /S_?n\s*=/i,
        ],
    },
    {
        intent: 'trig',
        patterns: [
            /(?:valeur\s+(?:exacte|de)\s+)?(?:cos|sin|tan)\s*\(/i,
            /valeurs?\s+remarquables?\s+(?:de\s+)?(?:cos|sin|tan)/i,
            /(?:r[eé]soudre?|r[eé]solution)\s+.*(?:cos|sin|tan)/i,
            /[eé]quation\s+(?:trig|trigonom[eé]trique)/i,
            /cercle\s+trigonom[eé]trique/i,
            /cos\s*\(\s*(?:\d+|pi|π)/i,
            /sin\s*\(\s*(?:\d+|pi|π)/i,
            /tan\s*\(\s*(?:\d+|pi|π)/i,
        ],
    },
    {
        intent: 'vector',
        patterns: [
            /produit\s+scalaire/i,
            /vecteurs?\s+colin[eé]aires?/i,
            /norme\s+(?:du\s+)?vecteur/i,
            /\\\s*overrightarrow/i,
            /\bvec(?:teur)?\s+[A-Z]{2}/i,
            /\b[A-Z]{2}\s*(?:→|⃗)/,
            /colin[eé]arit[eé]/i,
            /coordonn[eé]es\s+du\s+vecteur/i,
        ],
    },
    {
        intent: 'probability',
        patterns: [
            /loi\s+binomiale/i,
            /[Xx]\s*~\s*[Bb]\s*\(/,
            /[Pp]\s*\(\s*[Xx]\s*=\s*\d/i,
            /[Pp]\s*\(\s*[Xx]\s*[≤≥<>]/i,
            /esp[eé]rance\s+(?:math[eé]matique\s+)?de\s+[Xx]/i,
            /variance\s+de\s+[Xx]/i,
            /[eé]cart-type\s+de\s+[Xx]/i,
            /tirage?\s+(?:avec|sans)\s+remise/i,
            /probabilit[eé]\s+(?:que|d[''])/i,
        ],
    },
    {
        intent: 'statistics',
        patterns: [
            /calculer?\s+(?:la\s+)?moyenne/i,
            /m[eé]diane\s+(?:de\s+)?(?:la\s+)?s[eé]rie/i,
            /[eé]cart[\s-]type\s+(?:de\s+)?(?:la\s+)?s[eé]rie/i,
            /variance\s+(?:de\s+)?(?:la\s+)?s[eé]rie/i,
            /s[eé]rie\s+statistique/i,
            /quartiles?\s+[Qq][13]/i,
            /indicateurs?\s+statistiques?/i,
            /(?:les?\s+)?notes?\s+(?:sont|de\s+la\s+classe)/i,
        ],
    },
    {
        intent: 'exp_log',
        patterns: [
            /[eé]quation\s+(?:exponentielle|logarithmique)/i,
            /r[eé]soudre?\s+.*(?:\bln\b|\blog\b|\bexp\b)/i,
            /r[eé]soudre?\s+.*\be\^/i,
            /\bln\s*\(.*\)\s*=/i,
            /\bexp\s*\(.*\)\s*=/i,
            /\be\s*\^\s*(?:\w+|\([^)]+\))\s*=/i,
            /simplif(?:ier|ier)\s+.*(?:\bln\b|\bexp\b)/i,
            /propri[eé]t[eé]s?\s+(?:de\s+)?(?:ln|exp|logarithm)/i,
            /r[eé]soudre?\s+.*(?:e\^|e\*\*\d|ln\b)/i,
        ],
    },
    {
        intent: 'complex_calc',
        patterns: [
            /nombre\s+complexe/i,
            /module\s+(?:de\s+)?z/i,
            /argument\s+(?:de\s+)?z/i,
            /partie\s+(?:r[eé]elle|imaginaire)/i,
            /conjugu[eé]\s+de\s+z/i,
            /forme\s+(?:alg[eé]brique|trigonom[eé]trique|exponentielle)/i,
            /z\s*=\s*[0-9.+-]+\s*[+\-]\s*[0-9.]*\s*i/i,
            /\bi\s*=\s*\\?sqrt\s*\{?-1\}?/i,
        ],
    },
];

// ─────────────────────────────────────────────────────────────
// EXTRACTION D'EXPRESSION DE FONCTION
// ─────────────────────────────────────────────────────────────

/**
 * Extrait l'expression mathématique d'une chaîne.
 * Exemple: "f(x) = (x-3)/(x+2)" → "(x-3)/(x+2)"
 *          "g(x) = 2x² - 3x + 1" → "2x^2 - 3x + 1"
 */
export function extractExpression(text: string): string | null {
    // Normaliser les exposants unicode
    const normalized = text
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/⁴/g, '^4')
        .replace(/−/g, '-')
        .replace(/×/g, '*')
        .replace(/\u00d7/g, '*')
        .replace(/\\ln\b/gi, 'ln')
        .replace(/\\exp\b/gi, 'exp')
        .replace(/\\cos\b/gi, 'cos')
        .replace(/\\sin\b/gi, 'sin')
        .replace(/\\tan\b/gi, 'tan')
        .replace(/\\frac/gi, '')
        .replace(/\\left/gi, '')
        .replace(/\\right/gi, '');

    // Pattern 1: f(x) = <expression>
    const funcPattern = /[fg]\s*\([^)]*\)\s*=\s*([^,;.\n\r?!]+)/i;
    let m = normalized.match(funcPattern);
    if (m) return m[1].trim();

    // Pattern 2: (équation|inéquation|de|fonction|expression) <expression>
    const keywordPattern = /(?:(?:é|e)quation|in(?:é|e)quation|fonction|expression|de|sur)\s+([a-zA-Z0-9.\-+\/*^(){}=><≥≤' ]+?)(?:sur\s|pour\s|,|;|$)/i;
    m = normalized.match(keywordPattern);
    if (m) {
        let candidate = m[1].trim();
        // Remove leading words like "l'expression", "la fonction", "suivante :"
        candidate = candidate.replace(/^(?:l['’]expression|la fonction|l['’]équation|les?|des?|l['’]|la|le|du|de la)\s*/gi, '').trim();
        candidate = candidate.replace(/^(?:suivante|ci-dessous)?\s*:?\s*/gi, '').trim();
        // Remove trailing spaces or words
        candidate = candidate.replace(/[a-zA-ZÀ-ÿ]{2,}\s*$/g, '').trim();
        if (candidate.includes('x') && candidate.length > 2) return candidate;
    }

    // Pattern 3: simply <expression> = 0 at the end
    const endEqPattern = /([0-9a-zA-Z.\-+\/*^(){\s]+(?:=|>|<|>=|<=|≥|≤)[0-9a-zA-Z.\-+\/*^(){\s]+)$/i;
    m = normalized.match(endEqPattern);
    if (m) {
        const candidate = m[1].trim();
        if (candidate.includes('x') && candidate.length > 2) return candidate;
    }
    
    // Fallback: search for math block containing x
    const mathBlockPattern = /([x0-9][0-9a-zA-Z.\-+\/*^(){\s]*[x0-9])/i;
    m = normalized.match(mathBlockPattern);
    if (m && m[1].includes('x') && m[1].length > 2) {
       const candidate = m[1].trim();
       if (candidate.split(' ').every(w => w.length < 5 || ['sqrt', 'cos', 'sin', 'tan', 'ln', 'log', 'exp'].includes(w))) {
           return candidate;
       }
    }

    return null;
}

/**
 * Extrait les contextes d'inégalité (ex: "> 0", "≤ 0").
 */
function extractInequalityContext(text: string): string | null {
    const m = text.match(/[fg]\s*(?:\([^)]*\))?\s*([><≤≥]=?\s*[0-9\s]+)/i);
    return m ? m[1].trim() : null;
}

// ─────────────────────────────────────────────────────────────
// DÉTECTEUR DE SOUS-QUESTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Découpe un texte multi-questions en sous-questions numérotées.
 */
function splitIntoSubquestions(text: string): { num: string; text: string }[] {
    const parts: { num: string; text: string }[] = [];

    // Pattern : 1) / 1. / a) / a. / Q1: etc.
    const splitPattern = /(?:^|\n)\s*(?:(\d+|[a-zA-Z])\s*[).:\-]\s*)/gm;
    const matches = [...text.matchAll(splitPattern)];

    if (matches.length <= 1) {
        // Pas de numérotation détectée : texte unique
        return [{ num: '', text: text.trim() }];
    }

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const start = (match.index ?? 0) + match[0].length;
        const end = matches[i + 1]?.index ?? text.length;
        const num = match[1] ?? `${i + 1}`;
        const subText = text.slice(start, end).trim();
        if (subText) parts.push({ num, text: subText });
    }

    return parts.length > 0 ? parts : [{ num: '', text: text.trim() }];
}

// ─────────────────────────────────────────────────────────────
// ANALYSEUR PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Analyse complète d'une question pour détecter les intentions.
 * C'est le point d'entrée principal du système de routing.
 */
export function analyzeQuestion(
    userMessage: string,
    niveau: string = 'seconde'
): RouterAnalysis {
    const intents: DetectedIntent[] = [];
    const globalExpression = extractExpression(userMessage);
    const subquestions = splitIntoSubquestions(userMessage);

    for (const sub of subquestions) {
        let detected = false;
        const foundIntents = new Set<MathIntent>();

        for (const { intent, patterns } of INTENT_PATTERNS) {
            if (!foundIntents.has(intent) && patterns.some(p => p.test(sub.text))) {
                // Chercher l'expression dans la sous-question d'abord, puis global
                const localExpr = extractExpression(sub.text);
                const expr = localExpr ?? globalExpression;

                const context = intent === 'solve_inequality'
                    ? extractInequalityContext(sub.text)
                    : undefined;

                intents.push({
                    intent,
                    questionText: sub.text,
                    expression: expr,
                    questionNumber: sub.num || undefined,
                    variable: 'x',
                    context: context ?? undefined,
                });

                detected = true;
                foundIntents.add(intent);
            }
        }

        if (!detected && sub.text.length > 10) {
            intents.push({
                intent: 'unknown',
                questionText: sub.text,
                expression: extractExpression(sub.text) ?? globalExpression,
                questionNumber: sub.num || undefined,
                variable: 'x',
            });
        }
    }

    return {
        intents,
        globalExpression,
        hasMathEngine: intents.some(i => i.intent !== 'unknown'),
        niveau,
    };
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES D'AFFICHAGE
// ─────────────────────────────────────────────────────────────

export const INTENT_LABELS: Record<MathIntent, string> = {
    sign_table: '📋 Tableau de signes',
    variation_table: '📐 Tableau de variations',
    graph: '📈 Tracé de courbe',
    solve_equation: '🔢 Résolution d\'équation',
    solve_inequality: '⚖ Résolution d\'inéquation',
    derivative: '✏ Calcul de dérivée',
    integral: '∫ Calcul d\'intégrale',
    factorize: '🔣 Factorisation',
    limits: '→ Calcul de limites',
    literal_calc: '🧮 Calcul symbolique',
    expand: '🔄 Développement/Réduction',
    solve_system: '⚙ Système d\'équations',
    sequence: '🔢 Suites',
    trig: '📐 Trigonométrie',
    vector: '→ Vecteurs',
    probability: '🎲 Probabilités',
    statistics: '📊 Statistiques',
    complex_calc: '🔵 Nombres complexes',
    exp_log: '📈 Exponentielle / Logarithme',
    unknown: '💬 Réponse IA',
};
