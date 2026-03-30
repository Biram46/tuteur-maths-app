/**
 * handlers-utils.ts
 * Fonctions pures utilitaires pour les handlers du routeur mathématique.
 * Extraites de useMathRouter.ts pour réduire sa taille et améliorer la testabilité.
 * Aucune dépendance React. Importables côté serveur et client.
 */

// ─── Sanitisation d'expressions pour mathjs ─────────────────────────────────

/**
 * Sanitise une expression mathématique pour évaluation par mathjs.
 * Gère les notations françaises (², ³, √, π, ln) et les multiplications implicites.
 */
export function sanitizeExprForMathJS(e: string): string {
    return e
        .replace(/\*\*/g, '^')
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/⁴/g, '^4')
        .replace(/√/g, 'sqrt')
        .replace(/π/g, 'pi')
        .replace(/\bln\b/g, 'log')
        .replace(/−/g, '-')
        .replace(/(\d)([a-zA-Z])/g, '$1*$2')    // 2x → 2*x
        .replace(/(\d)\(/g, '$1*(')              // 3( → 3*(
        .replace(/\)(\w)/g, ')*$1')              // )x → )*x
        .replace(/\)\(/g, ')*(');                // )( → )*(
}

/**
 * Sanitise une expression pour le moteur graphique D3 (variante légère).
 */
export function sanitizeExprForGraph(e: string): string {
    return e
        .replace(/\*\*/g, '^')
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/√/g, 'sqrt')
        .replace(/π/g, 'pi')
        .replace(/\bln\b/g, 'log');
}

// ─── Beautification pour affichage ───────────────────────────────────────────

/**
 * Convertit une expression mathjs en notation lisible pour l'affichage.
 * (√, ln, ², ×, π...)
 */
export function prettifyExprForDisplay(expr: string): string {
    return expr
        .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
        .replace(/\blog\(/g, 'ln(')
        .replace(/\^2(?![0-9])/g, '²')
        .replace(/\^3(?![0-9])/g, '³')
        .replace(/\^4(?![0-9])/g, '⁴')
        .replace(/\*/g, '×')
        .replace(/\bpi\b/g, 'π');
}

// ─── Parsing de questions d'exercice ─────────────────────────────────────────

/**
 * Types de questions reconnus dans un exercice multi-questions.
 */
export type QuestionType =
    | 'sign_table'
    | 'sign_table_f'
    | 'variation_table'
    | 'graph'
    | 'solve'
    | 'parity'
    | 'limits'
    | 'derivative_sign'
    | 'ai';

/**
 * Structure d'une question d'exercice.
 */
export interface ExerciseQuestion {
    num: string;
    text: string;
    type: QuestionType;
}

/**
 * Détecte le type d'une question à partir de son texte.
 */
export function detectQuestionType(qText: string): QuestionType {
    const qNorm = qText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const hasDerivSign = /deriv|f'\s*\(|signe.*deriv|deriv.*signe/i.test(qNorm);
    const hasVariation = /variation|dresser.*variation|tableau.*variation/i.test(qNorm);
    const hasSignTable = /signe|etudier.*signe|tableau.*signe/i.test(qNorm) && !/deriv|f'/i.test(qNorm);

    // Parité
    if (/parit|pair|impair/i.test(qNorm)) return 'parity';
    // Limites
    if (/limite|borne|comportement.*infini|branche.*infini/i.test(qNorm)) return 'limits';
    // Dérivée + signe de f' → tableau de signes de la dérivée
    if (hasDerivSign) return 'derivative_sign';
    // Tableau de signes de f
    if (hasSignTable) return 'sign_table';
    // Tableau de variations
    if (hasVariation) return 'variation_table';
    // Courbe
    if (/trace|courbe|graphe|graphique|represent|dessine/i.test(qNorm)) return 'graph';
    // Résolution d'inéquation f(x) > 0 ou < 0
    if (/resou|inequation/i.test(qNorm) && /[><≤≥]\s*0|[><≤≥]\s*f\(|f\(x\)\s*[><≤≥]/i.test(qText)) return 'sign_table_f';
    // Résolution d'équation
    if (/resou|inequation|equation/i.test(qNorm)) return 'solve';

    return 'ai';
}

/**
 * Parse les questions numérotées d'un texte d'exercice.
 * Format: "1) ... 2) ..." ou "1. ... 2. ..."
 */
export function parseExerciseQuestions(inputText: string): ExerciseQuestion[] {
    const questions: ExerciseQuestion[] = [];
    const qRegex = /(\d+)\s*[).]\s*(.+?)(?=\n\s*\d+\s*[).]|\s*$)/g;
    let qM;

    while ((qM = qRegex.exec(inputText)) !== null) {
        const qText = qM[2].trim();
        const qNorm = qText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Détection des questions COMPOSÉES
        const hasDerivSign = /deriv|f'\s*\(|signe.*deriv|deriv.*signe/i.test(qNorm);
        const hasVariation = /variation|dresser.*variation|tableau.*variation/i.test(qNorm);
        const isStudyQuestion = /etudier|etude complète|etude complete/i.test(qNorm);

        if (isStudyQuestion && (hasDerivSign || hasVariation)) {
            // Question composite "Étudier la fonction" → générer tous les tableaux nécessaires
            if (hasDerivSign) {
                questions.push({ num: qM[1], text: qText, type: 'derivative_sign' });
            }
            if (hasVariation) {
                questions.push({ num: qM[1], text: qText, type: 'variation_table' });
            }
            // Ajouter aussi la question AI pour l'explication complète
            questions.push({ num: qM[1], text: qText, type: 'ai' });
        } else {
            questions.push({ num: qM[1], text: qText, type: detectQuestionType(qText) });
        }
    }

    return questions;
}

// ─── Extraction de vecteurs (géométrie) ──────────────────────────────────────

/**
 * Extrait les noms de vecteurs d'un texte (ex: "AB", "CD").
 * Gère les formats: \vec{AB}, \overrightarrow{AB}, "vecteur AB", "les vecteurs AB et CD"
 */
export function extractVectorNames(inputCleaned: string, inputRaw: string): string[] {
    const vecNames: string[] = [];
    const addVecName = (name: string) => {
        const n = name.trim().toUpperCase();
        // Filtrer les mots comme "VE", "EC", "CT" issus de "vecteur" mal découpé
        if (n.length === 2 && /^[A-Z]{2}$/.test(n) && !vecNames.includes(n)) {
            vecNames.push(n);
        }
    };

    // a) Via inputCleaned ("vecteur AB", "les vecteurs AB et AC")
    const cleanedForVec = inputCleaned.replace(/\bvecteurs?\s+vecteurs?\s+/gi, 'vecteur ');
    const afterVec = [...cleanedForVec.matchAll(/\bvecteurs?\s+([A-Z]{2}(?:\s+et\s+[A-Z]{2})*)/gi)];
    afterVec.forEach(m => {
        m[1].split(/\s+et\s+/i).forEach(v => addVecName(v));
    });

    const commaVec = [...cleanedForVec.matchAll(/\bvecteurs?\s+([A-Z]{2}(?:[,\s]+(?:et\s+)?[A-Z]{2})*)/gi)];
    commaVec.forEach(m => {
        (m[1].match(/[A-Z]{2}/g) || []).forEach(v => addVecName(v));
    });

    // b) Via inputText brut : \vec{AB}, \overrightarrow{AB}
    const rawLatexVecs = [...inputRaw.matchAll(/\\(?:vec|overrightarrow)\s*\{([A-Z]{1,2})([A-Z]{1,2})?\}/g)];
    rawLatexVecs.forEach(m => {
        if (m[2]) addVecName(m[1] + m[2]); // \vec{A}{B} → AB
        else if (m[1].length === 2) addVecName(m[1]); // \vec{AB}
    });

    // c) Via inputText brut simple : \vec AB, \overrightarrow AB
    const rawLatexVecs2 = [...inputRaw.matchAll(/\\(?:vec|overrightarrow)\s+([A-Z]{2})\b/g)];
    rawLatexVecs2.forEach(m => addVecName(m[1]));

    return vecNames;
}

// ─── Parsing d'intervalles ───────────────────────────────────────────────────

/**
 * Extrait un intervalle [a, b] d'un texte.
 * Format: "[−3; 5]" ou "[-3, 5]"
 */
export function parseInterval(inputText: string): [number, number] | null {
    const intMatch = inputText.match(/\[\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)\s*\]/);
    if (intMatch) {
        return [parseFloat(intMatch[1]), parseFloat(intMatch[2])];
    }
    return null;
}

// ─── Détection de type de repère ─────────────────────────────────────────────

/**
 * Détecte le type de repère demandé dans un texte de géométrie.
 */
export function detectRepereType(inputText: string): 'orthonormal' | 'orthogonal' | null {
    const hasCoords = /[A-Z]\s*\(\s*-?\d/.test(inputText);
    const mentionsRepere = /rep[eè]re/i.test(inputText);

    if (hasCoords || mentionsRepere) {
        if (/orthogonal(?!\S*normal)/i.test(inputText)) {
            return 'orthogonal';
        }
        return 'orthonormal';
    }
    return null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

/**
 * Couleurs pour les graphiques.
 */
export const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'] as const;

/**
 * Auto-offsets pour générer des points automatiques en géométrie.
 */
export const AUTO_POINT_OFFSETS = [[-1, 2], [2, -1], [-2, -1], [1, 3], [-3, 1]] as const;

// ─── Normalisation d'expressions pour SymPy ─────────────────────────────────────

/**
 * Normalise une expression pour l'API SymPy (Python).
 * Gère les notations Unicode, françaises, et nettoie le texte parasite.
 */
export function normalizeExprForSymPy(expr: string): string {
    return expr
        // Unicode superscripts → ^ notation
        .replace(/²/g, '**2').replace(/³/g, '**3').replace(/⁴/g, '**4')
        .replace(/⁰/g, '**0').replace(/¹/g, '**1').replace(/⁵/g, '**5')
        .replace(/⁶/g, '**6').replace(/⁷/g, '**7').replace(/⁸/g, '**8').replace(/⁹/g, '**9')
        // ^ → ** (Python power)
        .replace(/\^/g, '**')
        // French decimal comma → dot
        .replace(/(\d),(\d)/g, '$1.$2')
        // Implicit multiplication
        .replace(/(\d)([xX])/g, '$1*$2')
        // Remove function notation
        .replace(/[fghk]\s*\(x\)\s*=\s*/gi, '')
        // Minus sign normalization
        .replace(/[−]/g, '-')
        // Whitespace cleanup
        .replace(/\s+/g, '')
        .trim();
}

/**
 * Normalise une expression pour mathjs (JavaScript).
 * Variante pour le moteur graphique et les calculs numériques.
 */
export function normalizeExprForMathJS(expr: string): string {
    return expr
        // Unicode superscripts → ^ notation
        .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
        .replace(/⁰/g, '^0').replace(/¹/g, '^1').replace(/⁵/g, '^5')
        .replace(/⁶/g, '^6').replace(/⁷/g, '^7').replace(/⁸/g, '^8').replace(/⁹/g, '^9')
        // Exponential: eˣ, e^x, e**x → exp(x)
        .replace(/e\s*ˣ/g, 'exp(x)')
        .replace(/e\s*\*\*\s*x/gi, 'exp(x)')
        .replace(/e\s*\^\s*x/gi, 'exp(x)')
        .replace(/e\s*\^\s*\(([^)]+)\)/gi, 'exp($1)')
        // Roots: √, ∛, ∜ → sqrt, cbrt
        .replace(/√\s*\(([^)]+)\)/g, 'sqrt($1)')
        .replace(/√\s*([a-zA-Z0-9]+)/g, 'sqrt($1)')
        .replace(/∛\s*\(([^)]+)\)/g, 'cbrt($1)')
        .replace(/∛\s*([a-zA-Z0-9]+)/g, 'cbrt($1)')
        .replace(/∜\s*\(([^)]+)\)/g, '($1)^(1/4)')
        // Logarithm: ln, Ln, Log → log
        .replace(/\bLn\s*\(/g, 'log(')
        .replace(/\bLog\s*\(/g, 'log(')
        .replace(/\bln\s*\(/g, 'log(')
        // Multiplication symbols
        .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-')
        // French decimal comma → dot
        .replace(/(\d),(\d)/g, '$1.$2')
        .trim();
}

/**
 * Nettoie le texte parasite autour d'une expression (domaines, politesse, etc.)
 */
export function cleanExprText(expr: string): string {
    return expr
        // Remove definition domains
        .replace(/\s+sur\s+ℝ\s*\.?\s*$/i, '')
        .replace(/\s+sur\s+[Rr]\s*\.?\s*$/i, '')
        .replace(/\s+sur\s+[\[\]].+$/i, '')
        .replace(/\s+pour\s+tout\s+x\s*\.?\s*$/i, '')
        .replace(/\s+∀\s*x\s*\.?\s*$/i, '')
        .replace(/\s+x\s*[∈∊]\s*ℝ\s*\.?\s*$/i, '')
        // Remove domain constraints
        .replace(/\s+pour\s+x\s*[^=].{0,20}$/i, '')
        .replace(/\s*,?\s*\(?\s*x\s*≠\s*\d*\s*\)?\s*$/g, '')
        .replace(/\s+pour\s*$/i, '')
        // Stop at punctuation
        .split(/[?!]/)[0]
        // Remove trailing French text
        .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
        .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
        .replace(/\.\s+[A-ZÀ-Ÿa-zà-ÿ].+$/s, '')
        // Remove instructions
        .replace(/\s+(?:et|puis|alors|donc|en\s+déduire|fais|dresse|calcule|donne|résous)\s+.*(?:tableau|signes?|variations|courbe|graphe|racines?).*$/i, '')
        // Remove politeness
        .replace(/\s*s'?il\s*(?:te|vous)\s*pla[îi]t\b/gi, '')
        .replace(/\s*s(?:tp|vp)\b/gi, '')
        .replace(/\s*merci\b/gi, '')
        // Final cleanup
        .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');
}

// ─── Création de GraphState ───────────────────────────────────────────────────

/**
 * Interface pour une courbe dans le graphique.
 */
export interface GraphCurve {
    id: string;
    expression: string;
    name: string;
    color: string;
    interval: [number, number];
}

/**
 * Interface pour l'état du graphique.
 */
export interface GraphState {
    curves: GraphCurve[];
    intersections: any[];
    positionsRelatives: any[];
    tangent: any;
    title: string;
}

/**
 * Crée un objet GraphState pour une seule expression.
 */
export function createSingleCurveGraphState(
    expression: string,
    interval: [number, number] = [-10, 10],
    colorIndex: number = 0
): GraphState {
    const prettyName = prettifyExprForDisplay(expression);
    return {
        curves: [{
            id: `curve-${colorIndex}`,
            expression,
            name: `f(x) = ${prettyName}`,
            color: GRAPH_COLORS[colorIndex % GRAPH_COLORS.length],
            interval,
        }],
        intersections: [],
        positionsRelatives: [],
        tangent: null,
        title: `f(x) = ${prettyName}`,
    };
}

/**
 * Extrait un intervalle depuis un texte (format "[a, b]" ou "entre a et b").
 */
export function extractIntervalFromText(inputText: string, defaultInterval: [number, number] = [-10, 10]): [number, number] {
    // Format [a, b] ou [a; b]
    const bracketMatch = inputText.match(/\[\s*([+-]?\d+(?:\.\d+)?)\s*[;,]\s*([+-]?\d+(?:\.\d+)?)\s*\]/);
    if (bracketMatch) {
        return [parseFloat(bracketMatch[1]), parseFloat(bracketMatch[2])];
    }
    // Format "entre a et b" ou "de a à b"
    const textMatch = inputText.match(/(?:entre|de)\s+([+-]?\d+(?:\.\d+)?)\s+(?:et|à)\s+([+-]?\d+(?:\.\d+)?)/i);
    if (textMatch) {
        return [parseFloat(textMatch[1]), parseFloat(textMatch[2])];
    }
    return defaultInterval;
}
