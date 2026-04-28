/**
 * COUCHE 3 — MOTEUR TABLEAU DE SIGNES
 * =========================================
 * Implémente l'algorithme complet « Dresser un tableau de signes »
 * conforme au programme lycée français (Seconde / Première / Terminale).
 *
 * Algorithme :
 * Étape 1 : Déterminer le domaine de définition
 * Étape 2 : Factoriser / réduire l'expression
 * Étape 3 : Trouver les valeurs critiques
 * Étape 4 : Construire le tableau de signes
 * Étape 5 : Retourner un TableSpec complet
 */

import type { TableSpec, TableRow, SignRow } from '../math-spec-types';
import {
    evalAt, findZeros, findDiscontinuities,
    signOnInterval, buildXValues, formatForTable, round4,
    sanitizeExpression, gcd, squareFree,
} from './expression-parser';

// ─────────────────────────────────────────────────────────────
// TYPES INTERNES
// ─────────────────────────────────────────────────────────────

/**
 * Type du facteur détecté dans l'expression.
 * - 'affine'    : ax + b
 * - 'trinomial' : ax² + bx + c  (Δ = b²-4ac)
 * - 'sqrt'      : √(u(x))       → toujours ≥ 0
 * - 'exp'       : exp(u(x))     → toujours > 0
 * - 'ln'        : ln(u(x))      → zéro en u(x) = 1
 * - 'rational'  : facteur du dénominateur (valeur interdite au zéro)
 * - 'generic'   : autre expression analysée numériquement
 */
type FactorType = 'affine' | 'trinomial' | 'sqrt' | 'exp' | 'ln' | 'rational' | 'generic';

interface FactorAnalysis {
    label: string;          // Label affiché dans le tableau
    expr: string;           // Expression évaluable (mathjs)
    innerExpr?: string;     // Expression interne pour sqrt/ln/exp
    type: 'numerator' | 'denominator';
    factorType: FactorType;
    zeros: number[];        // Valeurs qui annulent ce facteur
    discontinuities: number[]; // Valeurs interdites propres à ce facteur
    /** Pour les trinômes : coefficients a, b, c et Δ */
    trinomialInfo?: { a: number; b: number; c: number; delta: number; x1?: number; x2?: number; x1Exact?: string; x2Exact?: string };
    /** Formes exactes (LaTeX) des racines : float → chaîne exacte */
    exactStrings?: Map<number, string>;
    /** Pour ln : valeur de x où u(x) = 1 */
    lnOnePoint?: number;
}

// ─────────────────────────────────────────────────────────────
// ENTRÉE PRINCIPALE
// ─────────────────────────────────────────────────────────────

export interface SignTableInput {
    /** Expression de f(x), ex: "(x+3)*(x-2)/(x-1)" ou "2*x+1" */
    expression: string;
    /** Facteurs du numérateur déjà identifiés (optionnel, sinon auto-détecté) */
    numeratorFactors?: { label: string; expr: string }[];
    /** Facteurs du dénominateur déjà identifiés (optionnel) */
    denominatorFactors?: { label: string; expr: string }[];
    /** Domaine de recherche des zéros */
    searchDomain?: [number, number];
    /** Niveau scolaire (Seconde | Premiere | Terminale) */
    niveau?: 'Seconde' | 'Premiere' | 'Terminale'; // défaut : Seconde
    /** Domaine exact précalculé par SymPy (si disponible) */
    sympyDomain?: {
        domainLeft: number | null;
        domainStrict: boolean;
        forbiddenPoints: number[];
        domainLatex?: string;
    };
}

export interface DiscriminantStep {
    factor: string;
    steps: string[];
}

export interface SignTableResult {
    success: boolean;
    tableSpec?: TableSpec;
    aaaBlock?: string;
    error?: string;
    criticalPoints: number[];
    domain?: string;
    discriminantSteps?: DiscriminantStep[];
    aiContext?: string;       // Instructions pédagogiques pour l'IA (adaptées au niveau + type de facteurs)
}

// ─────────────────────────────────────────────────────────────
// ÉTAPE 1 : DOMAINE DE DÉFINITION
// ─────────────────────────────────────────────────────────────

/**
 * Analyse l'expression et retourne le domaine de définition sous forme textuelle.
 * Détecte : √, ln, dénominateurs.
 */
function determineDomain(expression: string, factors: FactorAnalysis[]): string {
    const constraints: string[] = [];

    for (const f of factors) {
        if (f.factorType === 'sqrt') {
            // √(u) → u ≥ 0
            const inner = f.innerExpr ?? f.expr;
            constraints.push(`${inner} ≥ 0`);
        }
        if (f.factorType === 'ln') {
            // ln(u) → u > 0
            const inner = f.innerExpr ?? f.expr;
            constraints.push(`${inner} > 0`);
        }
        // Détecter ln() dans les expressions génériques (ex: "ln(x) - 1")
        if (f.factorType === 'generic' && (f.expr.includes('ln(') || f.expr.includes('log('))) {
            // Extraire l'argument de ln/log si possible
            const innerMatch = f.expr.match(/(?:ln|log)\(([^)]+)\)/);
            const inner = innerMatch ? innerMatch[1] : 'x';
            constraints.push(`${inner} > 0`);
        }
        // Détecter sqrt() dans les expressions génériques
        if (f.factorType === 'generic' && (f.expr.includes('sqrt(') || f.expr.includes('√'))) {
            const innerMatch = f.expr.match(/(?:sqrt|√)\(([^)]+)\)/);
            const inner = innerMatch ? innerMatch[1] : 'x';
            constraints.push(`${inner} ≥ 0`);
        }
        if (f.type === 'denominator') {
            // Dénominateur ≠ 0
            for (const z of f.zeros) {
                constraints.push(`x ≠ ${formatForTable(z)}`);
            }
        }
    }

    if (constraints.length === 0) return 'ℝ';
    return 'ℝ avec ' + constraints.join(' et ');
}

// ─────────────────────────────────────────────────────────────
// ÉTAPE 2 : FACTORISATION / EXTRACTION DES FACTEURS
// ─────────────────────────────────────────────────────────────

/**
 * Détecte si une expression est de la forme ax + b (facteur affine).
 * Retourne {a, b} si c'est le cas, null sinon.
 */
function detectAffine(expr: string, domain: [number, number]): { a: number; b: number } | null {
    // Évaluer en 3 points pour vérifier la linéarité
    const x0 = 0, x1 = 1, x2 = -1;
    const y0 = evalAt(expr, x0);
    const y1 = evalAt(expr, x1);
    const y2 = evalAt(expr, x2);
    if (y0 === null || y1 === null || y2 === null) return null;

    const a = (y1 - y0);     // pente supposée
    const b = y0;             // ordonnée à l'origine supposée

    // Vérifier que l'expression est bien linéaire sur plusieurs points
    const testPoints = [-5, 0.5, 2, 3, 7];
    for (const x of testPoints) {
        const pred = a * x + b;
        const actual = evalAt(expr, x);
        if (actual === null || Math.abs(actual - pred) > 1e-6) return null;
    }
    return { a: round4(a), b: round4(b) };
}

/**
 * Détecte si une expression est un trinôme ax² + bx + c.
 * Retourne les coefficients et le discriminant si c'est le cas.
 */
/**
 * Retourne la forme LaTeX exacte d'une racine du trinôme a·x²+b·x+c.
 * sign = +1 → (-b + √Δ)/(2a),  sign = -1 → (-b - √Δ)/(2a)
 * Retourne null si a ou b ne sont pas des entiers.
 */
function symbolicRoot(a: number, b: number, deltaInt: number, sign: 1 | -1): string | null {
    const aInt = Math.round(a), bInt = Math.round(b);
    if (Math.abs(a - aInt) > 1e-6 || Math.abs(b - bInt) > 1e-6 || aInt === 0) return null;

    const [k, m] = squareFree(deltaInt);

    if (m <= 1) {
        // Racine rationnelle : (-b ± k) / (2a)
        const num = -bInt + sign * k;
        const den = 2 * aInt;
        const g = gcd(Math.abs(num), Math.abs(den));
        let p = Math.round(num / g), q = Math.round(den / g);
        if (q < 0) { p = -p; q = -q; }
        return q === 1 ? String(p) : `\\dfrac{${p}}{${q}}`;
    }

    // Racine irrationnelle : (p + r·√m) / q
    let p = -bInt;
    let r = sign * k;    // coefficient signé du radical
    let q = 2 * aInt;

    const g = gcd(gcd(Math.abs(p), Math.abs(r)), Math.abs(q));
    p = Math.round(p / g);
    r = Math.round(r / g);
    q = Math.round(q / g);
    if (q < 0) { p = -p; r = -r; q = -q; }

    const absR = Math.abs(r);
    const radStr = absR === 1 ? `\\sqrt{${m}}` : `${absR}\\sqrt{${m}}`;
    let numer: string;
    if (p === 0)      numer = r > 0 ? radStr : `-${radStr}`;
    else if (r > 0)   numer = `${p}+${radStr}`;
    else              numer = `${p}-${radStr}`;

    return q === 1 ? numer : `\\dfrac{${numer}}{${q}}`;
}

function detectTrinomial(expr: string): { a: number; b: number; c: number; delta: number; x1?: number; x2?: number; x1Exact?: string; x2Exact?: string } | null {
    // Évaluer en 4 points pour déterminer a, b, c
    const y0 = evalAt(expr, 0);   // c
    const y1 = evalAt(expr, 1);   // a + b + c
    const ym1 = evalAt(expr, -1); // a - b + c
    const y2 = evalAt(expr, 2);   // 4a + 2b + c

    if (y0 === null || y1 === null || ym1 === null || y2 === null) return null;

    const c = y0;
    const a = (y1 + ym1 - 2 * c) / 2;
    const b = y1 - a - c;

    if (Math.abs(a) < 1e-8) return null; // Ce n'est pas un trinôme (dégénéré en affine/constant)

    // Vérifier avec y2
    const pred2 = 4 * a + 2 * b + c;
    if (Math.abs(pred2 - y2) > 1e-4) return null;

    // Vérifier sur plusieurs points supplémentaires
    const testPoints = [-3, -2, 0.5, 3, 5];
    for (const x of testPoints) {
        const pred = a * x * x + b * x + c;
        const actual = evalAt(expr, x);
        if (actual === null || Math.abs(actual - pred) > 1e-4) return null;
    }

    const delta = b * b - 4 * a * c;
    let x1: number | undefined, x2: number | undefined;
    let x1Exact: string | undefined, x2Exact: string | undefined;

    if (delta > 1e-10) {
        x1 = round4((-b - Math.sqrt(delta)) / (2 * a));
        x2 = round4((-b + Math.sqrt(delta)) / (2 * a));
        // Calcul symbolique (seulement si delta est proche d'un entier)
        const deltaInt = Math.round(delta);
        if (Math.abs(delta - deltaInt) < 1e-4 && deltaInt > 0) {
            // sign=-1 donne (-b-√Δ)/(2a), sign=+1 donne (-b+√Δ)/(2a)
            const r1 = symbolicRoot(a, b, deltaInt, -1);
            const r2 = symbolicRoot(a, b, deltaInt, +1);
            if (r1 !== null && r2 !== null) {
                // Associer chaque label au bon float (tri croissant comme x1/x2)
                if (x1! <= x2!) { x1Exact = r1; x2Exact = r2; }
                else             { x1Exact = r2; x2Exact = r1; }
            }
        }
        if (x1! > x2!) { const tmp = x1; x1 = x2; x2 = tmp; }
    } else if (Math.abs(delta) < 1e-10) {
        x1 = round4(-b / (2 * a));
    }

    return { a: round4(a), b: round4(b), c: round4(c), delta: round4(delta), x1, x2, x1Exact, x2Exact };
}

/**
 * Détecte si une expression est de la forme sqrt(u(x)).
 * Retourne l'expression interne u(x) si c'est le cas.
 */
function detectSqrt(expr: string): string | null {
    const sanitized = sanitizeExpression(expr);
    // Correspond à sqrt(...) au niveau top-level
    const m = sanitized.match(/^sqrt\((.+)\)$/);
    if (m) return m[1];
    // Correspond à √(...)
    const m2 = expr.match(/^√\((.+)\)$/);
    if (m2) return m2[1];
    return null;
}

/**
 * Détecte si une expression est de la forme exp(u(x)) ou e^(u(x)) ou e^x.
 */
function detectExp(expr: string): string | null {
    const sanitized = sanitizeExpression(expr);
    // Après sanitize : e^(u) ou e^x ont déjà été normalisés en e^(u)
    const m = sanitized.match(/^e\^\((.+)\)$/);
    if (m) return m[1];
    // exp(u) encore présent (au cas où)
    const m2 = sanitized.match(/^exp\((.+)\)$/);
    if (m2) return m2[1];
    return null;
}

/**
 * Détecte si une expression est de la forme ln(u(x)).
 * Retourne u(x) si c'est le cas.
 */
function detectLn(expr: string): string | null {
    const sanitized = sanitizeExpression(expr);
    // log = ln en mathjs
    const m = sanitized.match(/^log\((.+)\)$/);
    if (m) return m[1];
    // ln symbolique conservé
    const m2 = expr.match(/^ln\((.+)\)$/);
    if (m2) return m2[1];
    return null;
}

/**
 * Classe un facteur selon son type et calcule ses zéros/valeurs critiques.
 */
function classifyFactor(
    label: string,
    expr: string,
    role: 'numerator' | 'denominator',
    domain: [number, number]
): FactorAnalysis {
    const base: Omit<FactorAnalysis, 'factorType' | 'zeros' | 'discontinuities'> & { zeros?: number[]; discontinuities?: number[] } = {
        label,
        expr,
        type: role,
    };

    // ── Test √
    const sqrtInner = detectSqrt(expr);
    if (sqrtInner !== null) {
        const zeros = findZeros(sqrtInner, domain[0], domain[1]);
        return {
            ...base,
            factorType: 'sqrt',
            innerExpr: sqrtInner,
            zeros,
            discontinuities: [],
        } as FactorAnalysis;
    }

    // ── Test exp
    const expInner = detectExp(expr);
    if (expInner !== null) {
        return {
            ...base,
            factorType: 'exp',
            innerExpr: expInner,
            zeros: [],         // exp > 0 toujours
            discontinuities: [],
        } as FactorAnalysis;
    }

    // ── Test ln
    const lnInner = detectLn(expr);
    if (lnInner !== null) {
        // zéro de ln(u) quand u = 1
        const lnOnePoint = findLnOnePoint(lnInner, domain);
        // Pour ln(u), les valeurs interdites sont là où u(x) = 0.
        // On les calcule via les zéros de u(x), pas numériquement
        // (findDiscontinuities retourne des artefacts proches de x=0).
        const innerZeros = findZeros(lnInner, domain[0], domain[1]);
        return {
            ...base,
            factorType: 'ln',
            innerExpr: lnInner,
            zeros: lnOnePoint !== null ? [lnOnePoint] : [],
            discontinuities: innerZeros,  // u(x)=0 → ln indéfini
            lnOnePoint: lnOnePoint ?? undefined,
        } as FactorAnalysis;
    }

    // ── Test trinôme (avant affine, plus restrictif)
    const tri = detectTrinomial(expr);
    if (tri !== null) {
        const zeros: number[] = [];
        if (tri.x1 !== undefined) zeros.push(tri.x1);
        if (tri.x2 !== undefined && Math.abs(tri.x2 - tri.x1!) > 1e-6) zeros.push(tri.x2);
        // ── Filtrer les racines hors du domaine de recherche ──
        const filteredZeros = zeros
            .filter(z => z >= domain[0] - 1e-6 && z <= domain[1] + 1e-6)
            .sort((a, b) => a - b);
        // ── Formes exactes (symboliques) des racines ──
        const exactStrings = new Map<number, string>();
        if (tri.x1 !== undefined && tri.x1Exact) exactStrings.set(tri.x1, tri.x1Exact);
        if (tri.x2 !== undefined && tri.x2Exact) exactStrings.set(tri.x2, tri.x2Exact);
        return {
            ...base,
            factorType: 'trinomial',
            zeros: filteredZeros,
            discontinuities: [],
            trinomialInfo: tri,
            exactStrings,
        } as FactorAnalysis;
    }

    // ── Test affine
    const aff = detectAffine(expr, domain);
    if (aff !== null) {
        const zeros = Math.abs(aff.a) < 1e-10 ? [] : [round4(-aff.b / aff.a)];
        return {
            ...base,
            factorType: 'affine',
            zeros,
            discontinuities: [],
        } as FactorAnalysis;
    }

    // ── Fallback générique (analyse numérique)
    const zeros = findZeros(expr, domain[0], domain[1]);
    const discontinuities = role === 'denominator' ? findDiscontinuities(expr, domain[0], domain[1]) : [];
    return {
        ...base,
        factorType: 'generic',
        zeros,
        discontinuities,
    } as FactorAnalysis;
}

/**
 * Trouve la valeur de x où u(x) = 1 (zéro de ln(u(x))).
 * Résout numériquement u(x) - 1 = 0.
 */
function findLnOnePoint(innerExpr: string, domain: [number, number]): number | null {
    // u(x) - 1 = 0  ⟺  u(x) = 1
    const shiftedExpr = `(${innerExpr}) - 1`;
    const zeros = findZeros(shiftedExpr, domain[0], domain[1]);
    // Filtrer aux valeurs où ln est défini (u(x) > 0)
    const valid = zeros.filter(z => {
        const v = evalAt(innerExpr, z);
        return v !== null && v > 0;
    });
    return valid.length > 0 ? valid[0] : null;
}

// ─────────────────────────────────────────────────────────────
// EXTRACTION DES FACTEURS DE L'EXPRESSION
// ─────────────────────────────────────────────────────────────

function extractFactors(input: SignTableInput): FactorAnalysis[] {
    const { expression, numeratorFactors, denominatorFactors, searchDomain = [-20, 20] } = input;

    // Si les facteurs sont fournis explicitement (venant de l'IA)
    if (numeratorFactors || denominatorFactors) {
        const factors: FactorAnalysis[] = [];
        for (const nf of (numeratorFactors ?? [])) {
            factors.push(classifyFactor(nf.label, nf.expr, 'numerator', searchDomain));
        }
        for (const df of (denominatorFactors ?? [])) {
            factors.push(classifyFactor(df.label, df.expr, 'denominator', searchDomain));
        }
        return factors;
    }

    // Auto-détection depuis l'expression brute
    const factors = autoExtractFactors(expression, searchDomain);

    // ── GARDE-FOU : limiter le nombre de facteurs pour éviter un freeze ──
    // Si l'auto-détection a produit trop de facteurs (bug findZeros),
    // on retombe sur un facteur unique générique avec peu de zéros.
    const MAX_FACTORS = 20;
    if (factors.length > MAX_FACTORS) {
        console.warn(`[SIGN-ENGINE] ⚠️ ${factors.length} facteurs détectés (max ${MAX_FACTORS}) — fallback facteur unique`);
        const zeros = findZeros(expression, searchDomain[0], searchDomain[1], 500)
            .filter((z, i, arr) => i === 0 || Math.abs(z - arr[i - 1]) > 0.5)
            .slice(0, 10);
        const discontinuities = findDiscontinuities(expression, searchDomain[0], searchDomain[1], 500)
            .filter((d, i, arr) => i === 0 || Math.abs(d - arr[i - 1]) > 0.5)
            .slice(0, 10);
        return [{
            label: expression,
            expr: expression,
            type: 'numerator',
            factorType: 'generic',
            zeros,
            discontinuities,
        } as FactorAnalysis];
    }

    return factors;
}

/**
 * Auto-détecte les facteurs d'une expression.
 */
function autoExtractFactors(expression: string, domain: [number, number]): FactorAnalysis[] {
    const expr = expression.trim();

    // ── 1. Division : chercher un / au niveau 0 de parenthèses ──
    // findTopLevelSlash est fiable car il compte la profondeur des parenthèses.
    // Priorité sur la regex divMatch qui est trop fragile pour les expressions
    // comme (2x+1)(x-3)/(x+2) — la regex greedy capture mal le numérateur.
    const topLevelSlash = findTopLevelSlash(expr);
    if (topLevelSlash !== -1) {
        let numPart = expr.slice(0, topLevelSlash).trim();
        let denPart = expr.slice(topLevelSlash + 1).trim();
        // Si numPart ou denPart sont enveloppés par () globales, les retirer
        // Ex: "(x+2)" → "x+2", mais "(2x+1)(x-3)" reste intact
        if (denPart.startsWith('(') && denPart.endsWith(')') && isBalancedSingleGroup(denPart)) {
            denPart = denPart.slice(1, -1);
        }
        const numFactors = parseProductFactors(numPart, 'numerator', domain);
        const denFactors = parseProductFactors(denPart, 'denominator', domain);
        return [...numFactors, ...denFactors];
    }

    // ── 2b. Factorisation de expressions du type : P(x)·e^x + Q(x)·e^x ou P(x)·ln(x) + Q(x)·ln(x)
    //        Ex: x*e^x - e^x = e^x*(x-1) → on détecte le facteur commun exponentiel/log
    const factoized = tryFactorizeCommonFactor(expr, domain);
    if (factoized !== null) return factoized;

    // ── 3. Produit de facteurs : (a)(b)(c) ou a*b ──
    const productFactors = parseProductFactors(expr, 'numerator', domain);
    if (productFactors.length > 1) {
        return productFactors;
    }

    // ── 4. Facteur unique (classifié) ──
    const label = expr.startsWith('(') && expr.endsWith(')') ? expr.slice(1, -1) : expr;
    return [classifyFactor(label, expr, 'numerator', domain)];
}

/**
 * Tente de factoriser une expression du type : P(x)·e^u ± Q(x)·e^u  ou  P(x)·ln(u) ± Q(x)·ln(u)
 * en détectant un facteur commun exponentiel/logarithmique.
 * Ex: "x*e^x - e^x"   → [e^x, x-1]
 *     "x*ln(x) - ln(x)" → [ln(x), x-1]
 *     "2*x*e^(2x) + e^(2x)" → [e^(2x), 2x+1]
 */
function tryFactorizeCommonFactor(expr: string, domain: [number, number]): FactorAnalysis[] | null {
    // Patterns recherchés pour le facteur commun
    const commonPatterns = [
        // e^(u) — avec parenthèses
        /e\^\(([^)]+)\)/g,
        // e^x — variable simple convertie en e^(x) après sanitize
        /e\^([a-zA-Z])(?=[^(]|$)/g,
        // ln(u) / log(u)
        /(?:ln|log)\(([^)]+)\)/g,
        // sqrt(u)
        /sqrt\(([^)]+)\)/g,
    ];

    const sanitized = sanitizeExpression(expr);

    // Chercher un facteur commun exp : e^(u)
    const expMatch = sanitized.match(/e\^\(([^)]+)\)/);
    if (expMatch) {
        const expFactor = `e^(${expMatch[1]})`;
        // Compter les occurrences
        const occurrences = (sanitized.match(new RegExp(expFactor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
        if (occurrences >= 2) {
            // Extraire le cofacteur en divisant symboliquement
            // Remplacer toutes les occurrences par 1 et simplifier
            const remainder = sanitized.split(expFactor).join('1');
            // Vérifier que le reste est une expression valide
            const testVal = evalAt(`(${sanitized}) / (${expFactor})`, 2);
            if (testVal !== null) {
                const cofactorExpr = `(${sanitized}) / (${expFactor})`;
                // Chercher les zéros du cofacteur = zéros de f
                const expFactorAnalysis = classifyFactor(expFactor, expFactor, 'numerator', domain);
                const cofactorAnalysis = classifyFactor(cofactorExpr, cofactorExpr, 'numerator', domain);
                return [expFactorAnalysis, cofactorAnalysis];
            }
        }
    }

    // Chercher un facteur commun ln : log(u) (après sanitize ln→log)
    const lnMatch = sanitized.match(/log\(([^)]+)\)/);
    if (lnMatch) {
        const lnFactor = `log(${lnMatch[1]})`;
        const occurrences = (sanitized.match(new RegExp(lnFactor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
        if (occurrences >= 2) {
            const testVal = evalAt(`(${sanitized}) / (${lnFactor})`, 2);
            if (testVal !== null) {
                const lnDisplayExpr = `ln(${lnMatch[1]})`; // pour l'affichage
                const cofactorExpr = `(${sanitized}) / (${lnFactor})`;
                const lnAnalysis = classifyFactor(lnDisplayExpr, lnFactor, 'numerator', domain);
                const cofactorAnalysis = classifyFactor(cofactorExpr, cofactorExpr, 'numerator', domain);
                return [lnAnalysis, cofactorAnalysis];
            }
        }
    }

    // ── 3. Facteur commun polynomial : x ──
    // Approche SYNTAXIQUE : vérifier que CHAQUE terme additif contient x en facteur multiplicatif.
    // Ex: "x*e^(x) - x" → termes ["x*e^(x)", "- x"] → chaque terme contient x* → OK
    //     "e^(x) - 1"  → termes ["e^(x)", "- 1"] → "- 1" ne contient PAS x → REFUSÉ
    //     "x^2 + 3*x"  → termes ["x^2", "+ 3*x"] → chaque terme contient x → OK

    // Séparer l'expression en termes additifs (au niveau 0 des parenthèses)
    const terms: string[] = [];
    let depth = 0;
    let currentTerm = '';
    for (let ci = 0; ci < sanitized.length; ci++) {
        const ch = sanitized[ci];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (depth === 0 && (ch === '+' || ch === '-') && ci > 0) {
            terms.push(currentTerm.trim());
            currentTerm = ch;
        } else {
            currentTerm += ch;
        }
    }
    if (currentTerm.trim()) terms.push(currentTerm.trim());

    // Vérifier que chaque terme contient x en facteur multiplicatif
    // Pattern : le terme doit contenir x* ou *x ou x^ ou être exactement ±x ou ±coeff*x
    const xFactorPattern = /(?:^[+-]?\s*x\s*[*^])|(?:\*\s*x\s*(?:[*^)]|$))|(?:^[+-]?\s*\d*\s*\*?\s*x\s*$)/;
    const everyTermHasX = terms.length > 0 && terms.every(t => {
        const trimmed = t.trim().replace(/^[+-]\s*/, '');
        return xFactorPattern.test(t) || /^x$/.test(trimmed) || /^\d+\*?x/.test(trimmed) || /x\^/.test(trimmed);
    });

    if (everyTermHasX) {
        // Vérifier numériquement que le cofacteur g(x) = f(x)/x est évaluable
        const cofactorExpr = `(${sanitized}) / x`;
        const testVal = evalAt(cofactorExpr, 1);
        const testVal2 = evalAt(cofactorExpr, -1);

        if (testVal !== null && testVal2 !== null) {
            // ── GUARD : vérifier que f(0) ≈ 0 avant de conclure que x est un facteur ──
            // Sans ça, l'expression (-2x+4)(x-3)(x²+1) détecte faussement x comme facteur
            // à cause du terme x^2 qui fait matcher /x\^/.test() dans everyTermHasX.
            // f(0) = 4*(-3)*1 = -12 ≠ 0 → x n'est PAS un facteur.
            const fAtZero = evalAt(sanitized, 0);
            if (fAtZero === null || Math.abs(fAtZero) > 1e-8) {
                // x n'est vraiment pas un facteur → laisser extractParenProductFactors gérer
                return null;
            }
            const xFactor = classifyFactor('x', 'x', 'numerator', domain);

            // Générer un label lisible : diviser chaque terme par x
            let cofactorLabel = cofactorExpr;
            const simplified = terms.map(term => {
                const t = term.trim();
                let s = t
                    .replace(/^([+-]?\s*)x\s*\*\s*/i, '$1')      // x*e^(x) → e^(x)
                    .replace(/\*\s*x\s*$/i, '')                    // coeff*x → coeff
                    .replace(/^([+-]?\s*)x$/i, '$11')              // x seul → 1
                    .replace(/x\^(\d+)/g, (m, n) => {              // x^n → x^(n-1)
                        const exp = parseInt(n) - 1;
                        return exp === 0 ? '' : exp === 1 ? 'x' : `x^${exp}`;
                    });
                return s;
            }).join(' ').replace(/\s{2,}/g, ' ').trim();

            if (simplified && simplified !== sanitized) {
                cofactorLabel = simplified;
            }

            // Utiliser le label simplifié comme expression d'évaluation aussi
            // Car le cofactorExpr brut "(f(x))/x" a une singularité en x=0
            // alors que le label simplifié (e.g. "e^(x) - 1") s'évalue proprement
            const evalExpr = cofactorLabel !== cofactorExpr ? cofactorLabel : cofactorExpr;
            const cofactorAnalysis = classifyFactor(cofactorLabel, evalExpr, 'numerator', domain);
            return [xFactor, cofactorAnalysis];
        }
    }

    return null;
}

/**
 * Vérifie si une expression est un unique groupe de parenthèses.
 * Ex: "(x+2)" → true, "(2x+1)(x-3)" → false, "x+2" → false
 */
function isBalancedSingleGroup(expr: string): boolean {
    if (!expr.startsWith('(') || !expr.endsWith(')')) return false;
    let depth = 0;
    for (let i = 0; i < expr.length; i++) {
        if (expr[i] === '(') depth++;
        else if (expr[i] === ')') depth--;
        // Si on revient à depth=0 avant la fin, ce n'est pas un groupe unique
        if (depth === 0 && i < expr.length - 1) return false;
    }
    return depth === 0;
}

/**
 * Trouve la position du premier '/' au niveau 0 de parenthèses (non imbriqué).
 * Retourne -1 si aucun.
 */
function findTopLevelSlash(expr: string): number {
    let depth = 0;
    for (let i = 0; i < expr.length; i++) {
        if (expr[i] === '(') depth++;
        else if (expr[i] === ')') depth--;
        else if (expr[i] === '/' && depth === 0) return i;
    }
    return -1;
}

/**
 * Extrait les facteurs d'un produit de parenthèses.
 * Ex: "(-2x+3)(-x²-4x-3)" → [{expr:"-2x+3"}, {expr:"-x²-4x-3"}]
 */
function extractParenProductFactors(expr: string, domain: [number, number]): FactorAnalysis[] {
    const factors: FactorAnalysis[] = [];
    let remaining = expr.trim();

    if (!remaining.startsWith('(')) return [];

    const parenRegex = /^\(([^()]+)\)\s*\*?\s*/;

    while (remaining.length > 0) {
        const match = parenRegex.exec(remaining);
        if (!match) break;

        const factorExpr = match[1].trim();
        factors.push(classifyFactor(factorExpr, factorExpr, 'numerator', domain));
        remaining = remaining.slice(match[0].length);
    }

    if (remaining.length > 0) return [];
    return factors;
}

/**
 * Vérifie si une expression est une somme au niveau 0 (top-level).
 * Ignore les signes unaires au début de l'expression ou après un opérateur.
 */
function hasTopLevelAddSub(expr: string): boolean {
    let depth = 0;
    const s = expr.replace(/\s+/g, '');
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (depth === 0 && (ch === '+' || ch === '-')) {
            if (i > 0) {
                const prev = s[i - 1];
                if (prev !== '*' && prev !== '/' && prev !== '^' && prev !== '(' && prev !== 'e' && prev !== 'E') {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Décompose une expression en facteurs (séparés par *)
 * et les classifie (affine, trinôme, sqrt, exp, ln, générique).
 *
 * ⚠️ On préserve les wrappers fonctionnels (sqrt, ln, log, e^) entiers
 *    au lieu d'extraire seulement leur contenu entre parenthèses.
 */
function parseProductFactors(expr: string, role: 'numerator' | 'denominator', domain: [number, number]): FactorAnalysis[] {
    const factors: FactorAnalysis[] = [];
    let remaining = expr.trim();

    // ── FAST PATH : si pas de *, pas de parenthèses multiples, pas de fonctions,
    //    c'est un facteur unique (ex: "x + 3", "2x - 1", "x^2 - 4x + 3") ──
    const hasMultiplication = remaining.includes('*');
    const hasFunctionWrapper = /^(sqrt|ln|log|exp)\(/.test(remaining) || /^e\^/.test(remaining);
    const hasParenProduct = /\)\s*\(/.test(remaining);
    const isSum = hasTopLevelAddSub(remaining);

    // Si c'est techniquement une somme (ex: x^2 - 4*x + 4), on ne le sépare pas
    if (isSum || (!hasMultiplication && !hasFunctionWrapper && !hasParenProduct)) {
        factors.push(classifyFactor(remaining, remaining, role, domain));
        return factors;
    }

    // Regex pour tokeniser : sqrt(...), ln(...), log(...), e^(...), (facteur ordinaire), scalaire
    // On traite de gauche à droite en consommant les tokens un par un.
    const tokenRe = /^\s*(?:(sqrt|ln|log|exp)\(([^()]+)\)|e\^\(([^()]+)\)|e\^([a-zA-Z0-9_]+)|\(([^()]+)\)|([^()*\/\s]+))\s*\*?\s*/;

    let safetyCounter = 0;
    while (remaining.length > 0 && safetyCounter++ < 50) {
        const m = tokenRe.exec(remaining);
        if (!m) break;

        let factorExpr: string;
        if (m[1] && m[2]) {
            // Fonction : sqrt(u), ln(u), log(u), exp(u)
            factorExpr = `${m[1]}(${m[2]})`;
        } else if (m[3]) {
            // e^(u)
            factorExpr = `e^(${m[3]})`;
        } else if (m[4]) {
            // e^x (variable simple)
            factorExpr = `e^(${m[4]})`;
        } else if (m[5]) {
            // (facteur ordinaire)
            factorExpr = m[5].trim();
        } else {
            // scalaire ou variable seule
            factorExpr = (m[6] ?? '').trim();
        }

        if (factorExpr) {
            factors.push(classifyFactor(factorExpr, factorExpr, role, domain));
        }
        remaining = remaining.slice(m[0].length);
    }

    // Fallback : traiter l'expression entière si rien trouvé
    if (factors.length === 0) {
        const e = expr.trim();
        factors.push(classifyFactor(e, e, role, domain));
    }

    return factors;
}

// ─────────────────────────────────────────────────────────────
// ÉTAPE 3 : VALEURS CRITIQUES
// ─────────────────────────────────────────────────────────────

/**
 * Collecte et trie toutes les valeurs critiques (zéros + valeurs interdites)
 * de tous les facteurs.
 */
function collectCriticalPoints(factors: FactorAnalysis[]): number[] {
    const all = new Set<number>();
    for (const f of factors) {
        f.zeros.forEach(z => all.add(z));
        f.discontinuities.forEach(d => all.add(d));
    }
    return [...all].sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────
// ÉTAPE 4 : CONSTRUCTION DU TABLEAU DE SIGNES
// ─────────────────────────────────────────────────────────────

/**
 * Construit les bornes de chaque intervalle entre les points critiques.
 * @param searchDomain - Si fourni, les bords du tableau utilisent ces bornes au lieu de ±∞.
 *                       Essentiel pour les fonctions à domaine restreint (ln, √).
 */
function buildIntervalBounds(
    criticalPoints: number[],
    searchDomain?: [number, number]
): [number | '-inf', number | '+inf'][] {
    const bounds: [number | '-inf', number | '+inf'][] = [];

    // Bornes extrêmes : utiliser le searchDomain si fourni et fini
    const leftBound: number | '-inf' =
        searchDomain && isFinite(searchDomain[0]) && searchDomain[0] > -1e9
            ? searchDomain[0]
            : '-inf';
    const rightBound: number | '+inf' =
        searchDomain && isFinite(searchDomain[1]) && searchDomain[1] < 1e9
            ? searchDomain[1]
            : '+inf';

    if (criticalPoints.length === 0) {
        bounds.push([leftBound, rightBound]);
        return bounds;
    }

    bounds.push([leftBound, criticalPoints[0]]);
    for (let i = 0; i < criticalPoints.length - 1; i++) {
        bounds.push([criticalPoints[i], criticalPoints[i + 1]]);
    }
    bounds.push([criticalPoints[criticalPoints.length - 1], rightBound]);

    return bounds;
}

/**
 * Détermine si un point critique est une valeur interdite pour un facteur donné.
 * Utilise une tolérance relative pour gérer les nombres à différentes échelles.
 */
function isDiscontinuityPoint(factor: FactorAnalysis, cp: number): boolean {
    const tol = (a: number, b: number) => {
        const scale = Math.max(Math.abs(a), Math.abs(b), 1);
        return Math.abs(a - b) < 1e-6 * scale;
    };
    if (factor.type === 'denominator' && factor.zeros.some(z => tol(z, cp))) return true;
    if (factor.discontinuities.some(d => tol(d, cp))) return true;
    return false;
}

/**
 * Détermine si un point critique est un zéro du facteur.
 * Utilise une tolérance relative pour gérer les nombres à différentes échelles.
 */
function isZeroPoint(factor: FactorAnalysis, cp: number): boolean {
    const scale = Math.max(Math.abs(cp), 1);
    return factor.zeros.some(z => Math.abs(z - cp) < 1e-6 * scale);
}

/**
 * Retourne le signe d'un facteur sur un intervalle ouvert selon son type.
 *
 * Règles :
 * - exp(u) : toujours '+'
 * - sqrt(u) : toujours '+' (sur le domaine)
 * - affine ax+b : signe de a × (x - racine) par analyse
 * - trinôme : signe de a × (x - x1)(x - x2) par analyse (si Δ > 0)
 * - ln(u) : signe déduit de u vs 1
 * - générique : évaluation numérique
 */
function getFactorSignOnInterval(
    factor: FactorAnalysis,
    from: number | '-inf',
    to: number | '+inf'
): '+' | '-' | '0' | null {
    switch (factor.factorType) {
        case 'exp':
            return '+'; // exp > 0 toujours

        case 'sqrt':
            return '+'; // sqrt ≥ 0 sur le domaine (les zéros sont aux bornes)

        case 'affine': {
            if (!factor.trinomialInfo) {
                // Utiliser l'évaluation numérique
                return signOnInterval(factor.expr, from, to);
            }
            return signOnInterval(factor.expr, from, to);
        }

        case 'trinomial': {
            // Évaluation numérique fiable grâce à la détection exacte des racines
            return signOnInterval(factor.expr, from, to);
        }

        case 'ln': {
            // ln(u) < 0 si u < 1, = 0 si u = 1, > 0 si u > 1
            if (!factor.innerExpr) return signOnInterval(factor.expr, from, to);
            // Évaluer u(x) au milieu de l'intervalle
            const mid = computeMidpoint(from, to);
            if (mid === null) return signOnInterval(factor.expr, from, to);
            const uVal = evalAt(factor.innerExpr, mid);
            if (uVal === null) return null;
            if (uVal > 1 + 1e-9) return '+';
            if (uVal < 1 - 1e-9) return '-';
            return '0';
        }

        case 'generic':
        default:
            return signOnInterval(factor.expr, from, to);
    }
}

/** Calcule le point médian d'un intervalle (pour test de signe). */
function computeMidpoint(from: number | '-inf', to: number | '+inf'): number | null {
    const xFrom = from === '-inf' ? -1e6 : (from as number) + 1e-6;
    const xTo = to === '+inf' ? 1e6 : (to as number) - 1e-6;
    if (xFrom >= xTo) return null;
    return (xFrom + xTo) / 2;
}

/**
 * Construit la ligne sign: pour un facteur donné.
 * Format : [signe, valeur_critique, signe, valeur_critique, ..., signe]
 */
function buildFactorSignRow(
    factor: FactorAnalysis,
    criticalPoints: number[],
    intervalBounds: [number | '-inf', number | '+inf'][]
): SignRow {
    const values: string[] = [];

    for (let i = 0; i < intervalBounds.length; i++) {
        const [from, to] = intervalBounds[i];

        // Signe dans l'intervalle
        const sign = getFactorSignOnInterval(factor, from, to);
        values.push(sign ?? '+');

        // Valeur au point critique suivant
        if (i < criticalPoints.length) {
            const cp = criticalPoints[i];

            if (isDiscontinuityPoint(factor, cp)) {
                // Pour un facteur dénominateur : le facteur LUI-MÊME vaut 0 en ce point
                // (car c'est son zéro qui crée la valeur interdite),
                // donc on affiche '0' sur la ligne du facteur.
                // La ligne f(x) recevra '||' via multiplySignValues qui reconnait 'D'.
                // En revanche si c'est une vraie discontinuité (ex: 1/x évalué directement)
                // avec y=null ou infini, on met '||'.
                const yAtCp = evalAt(factor.expr, cp);
                if (yAtCp === null || !isFinite(yAtCp)) {
                    // Vraie discontinuité (ex: facteur 1/x, pas juste x-1)
                    values.push('||');
                } else if (Math.abs(yAtCp) < 1e-6) {
                    // Le facteur s'annule proprement : afficher '0' sur sa ligne,
                    // mais marquer 'D' pour que f(x) reçoive '||'
                    values.push('D');
                } else {
                    values.push('||');
                }
            } else if (isZeroPoint(factor, cp)) {
                // Zéro du facteur → 0
                values.push('0');
            } else {
                // Ce point critique appartient à un autre facteur → signe constant ici
                const sign = getFactorSignOnInterval(factor, cp, cp);
                if (sign !== null) {
                    values.push(sign);
                } else {
                    const v = evalAt(factor.expr, cp);
                    if (v === null || !isFinite(v)) {
                        values.push('||');
                    } else if (Math.abs(v) < 1e-8) {
                        values.push('0');
                    } else {
                        values.push(v > 0 ? '+' : '-');
                    }
                }
            }
        }
    }

    return {
        label: factor.label,
        type: 'sign',
        values,
    };
}

/**
 * Règle du produit/quotient des signes.
 * Numérateurs et dénominateurs contribuent ensemble.
 * Si l'un des facteurs vaut || → résultat ||
 * Si l'un des facteurs vaut 0 et aucun || → résultat 0
 * Sinon : compter le nombre de '-' → impair = '-', pair = '+'
 */
function multiplySignValues(signs: string[]): string {
    // '||' = vraie discontinuité, 'D' = zéro du dénominateur → les deux causent || dans f(x)
    if (signs.includes('||') || signs.includes('D')) return '||';
    if (signs.includes('0')) return '0';
    const negCount = signs.filter(s => s === '-').length;
    return negCount % 2 === 1 ? '-' : '+';
}

/**
 * Construit la ligne sign: f(x) par règle du produit à partir des lignes facteurs.
 */
function buildFxSignRow(
    expression: string,
    criticalPoints: number[],
    intervalBounds: [number | '-inf', number | '+inf'][],
    factors: FactorAnalysis[],
    factorRows: SignRow[]
): SignRow {
    const totalCols = intervalBounds.length + criticalPoints.length; // intervalles + points critiques
    const values: string[] = [];

    for (let col = 0; col < 2 * intervalBounds.length - 1; col++) {
        // Les colonnes paires (0, 2, 4, ...) sont des intervalles
        // Les colonnes impaires (1, 3, 5, ...) sont des points critiques
        const isInterval = col % 2 === 0;
        const colIdx = col; // index dans values[]

        // Collecter les signes de tous les facteurs à cette position
        const colSigns: string[] = factorRows.map(row => row.values[col] ?? '+');

        if (isInterval) {
            // Pour les intervalles : utiliser signOnInterval de l'expression globale
            // comme vérification, mais privilégier la règle du produit
            const productSign = multiplySignValues(colSigns);
            // Vérification numérique pour robustesse
            const intervalIdx = col / 2;
            const [from, to] = intervalBounds[intervalIdx];
            const numericalSign = signOnInterval(expression, from, to);
            // En cas de désaccord, faire confiance au numérique
            if (numericalSign !== null && numericalSign !== productSign && productSign !== '||' && productSign !== '0') {
                values.push(numericalSign);
            } else {
                values.push(productSign);
            }
        } else {
            // Point critique : utiliser la règle du produit pure
            const productSign = multiplySignValues(colSigns);
            // Vérification numérique
            const cpIdx = (col - 1) / 2;
            const cp = criticalPoints[cpIdx];
            const yAtCp = evalAt(expression, cp);
            if (productSign !== '||') {
                if (yAtCp === null || !isFinite(yAtCp)) {
                    values.push('||');
                } else if (Math.abs(yAtCp) < 1e-8) {
                    values.push('0');
                } else {
                    // Faire confiance au produit si la valeur est évaluable
                    values.push(productSign);
                }
            } else {
                values.push('||');
            }
        }
    }

    return {
        label: 'f(x)',
        type: 'sign',
        values,
    };
}

// ─────────────────────────────────────────────────────────────
// ÉTAPES Δ : RÉSUMÉ PÉDAGOGIQUE DU DISCRIMINANT
// ─────────────────────────────────────────────────────────────

/**
 * Génère les étapes de calcul du discriminant pour les trinômes,
 * à afficher AVANT le tableau de signes (obligation pédagogique Première).
 */
function buildDiscriminantSteps(factors: FactorAnalysis[]): DiscriminantStep[] {
    const steps: DiscriminantStep[] = [];

    for (const f of factors) {
        if (f.factorType !== 'trinomial' || !f.trinomialInfo) continue;
        const { a, b, c, delta, x1, x2 } = f.trinomialInfo;

        const stepLines: string[] = [
            `Δ = b² - 4ac = (${b})² - 4 × (${a}) × (${c})`,
            `Δ = ${round4(b * b)} - ${round4(4 * a * c)} = ${round4(delta)}`,
        ];

        if (delta < -1e-10) {
            stepLines.push(`Δ < 0 → pas de racine réelle, expression de signe constant (signe de a = ${a > 0 ? '+' : '-'})`);
        } else if (Math.abs(delta) < 1e-10) {
            stepLines.push(`Δ = 0 → racine double x₀ = -b/(2a) = ${round4(-b / (2 * a))}`);
        } else {
            stepLines.push(`Δ > 0 → deux racines réelles :`);
            stepLines.push(`  x₁ = (-b - √Δ) / (2a) = (${-b} - ${round4(Math.sqrt(delta))}) / (${2 * a}) = ${x1}`);
            stepLines.push(`  x₂ = (-b + √Δ) / (2a) = (${-b} + ${round4(Math.sqrt(delta))}) / (${2 * a}) = ${x2}`);
        }

        steps.push({ factor: f.label, steps: stepLines });
    }

    return steps;
}

// ─────────────────────────────────────────────────────────────
// GÉNÉRATION DU CONTEXTE IA (instructions pédagogiques)
// ─────────────────────────────────────────────────────────────

const SIGN_NIVEAU_LABELS: Record<string, string> = {
    'Seconde': 'Seconde',
    'Premiere': 'Première',
    'Terminale': 'Terminale',
    'seconde': 'Seconde',
    'seconde_sthr': 'Seconde STHR',
    'premiere_commune': 'Première (tronc commun)',
    'premiere_techno': 'Première Technologique',
    'premiere_spe': 'Première Spécialité Maths',
    'terminale_spe': 'Terminale Spécialité Maths',
    'terminale_comp': 'Terminale Maths Complémentaires',
    'terminale_expert': 'Terminale Maths Expertes',
    'terminale_techno': 'Terminale Technologique',
};

/**
 * Construit les instructions pédagogiques pour l'IA concernant les tableaux de signes.
 *
 * Centralise TOUTES les contraintes par type de facteur et par niveau.
 * Pour ajouter une nouvelle catégorie, il suffit d'ajouter un cas ici.
 */
function buildSignTableAIContext(
    factors: FactorAnalysis[],
    niveau: string,
    expression: string
): string {
    const niveauLabel = SIGN_NIVEAU_LABELS[niveau] ?? niveau;
    const lines: string[] = [];

    lines.push(`Niveau : ${niveauLabel}.`);
    lines.push(`NE GÉNÈRE AUCUN bloc @@@.`);

    // ── Détection des types de facteurs présents ──
    const hasAffine = factors.some(f => f.factorType === 'affine');
    const hasTrinomial = factors.some(f => f.factorType === 'trinomial');
    const hasLn = factors.some(f => f.factorType === 'ln');
    const hasExp = factors.some(f => f.factorType === 'exp');
    const hasSqrt = factors.some(f => f.factorType === 'sqrt');
    const hasDenominator = factors.some(f => f.type === 'denominator');
    const isOnlyAffine = factors.length === 1 && hasAffine && !hasDenominator;
    const isOnlyTrinomial = factors.length === 1 && hasTrinomial && !hasDenominator;

    // ── [A] FONCTIONS AFFINES ──
    if (isOnlyAffine) {
        lines.push(`Type : fonction affine f(x) = ax + b.`);
        lines.push(`Propose DEUX méthodes au choix :`);
        lines.push(``);
        lines.push(`MÉTHODE 1 – Règle du signe de a (méthode directe) :`);
        lines.push(`  → Calculer la valeur d'annulation x₀ = -b/a`);
        lines.push(`  → ax + b est du signe de a pour x > x₀, vaut 0 pour x = x₀, du signe de -a pour x < x₀`);
        lines.push(`  → Afficher ce résultat SANS résoudre d'inéquation.`);
        lines.push(``);
        lines.push(`MÉTHODE 2 – Résolution d'inéquations (méthode algébrique) :`);
        lines.push(`  → Résoudre ax + b > 0, ax + b < 0, ax + b = 0`);
        lines.push(`  → Afficher le message pédagogique : "💡 Remarque : en pratique, il suffit de résoudre ax+b > 0 et ax+b = 0. Le signe de ax+b < 0 s'en déduit par complémentarité."`);
    }

    // ── [B] POLYNÔMES DU SECOND DEGRÉ ──
    if (hasTrinomial) {
        const triFactors = factors.filter(f => f.factorType === 'trinomial');
        for (const tf of triFactors) {
            const tri = tf.trinomialInfo;
            if (!tri) continue;

            lines.push(``);
            lines.push(`Type : polynôme du second degré (facteur ${tf.label}).`);
            lines.push(`Étapes obligatoires dans cet ordre :`);
            lines.push(`  1. Calculer Δ = b²-4ac`);

            if (tri.delta > 1e-10) {
                lines.push(`  2. CAS Δ > 0 : deux racines réelles distinctes`);
                lines.push(`     x₁ = (-b-√Δ)/(2a), x₂ = (-b+√Δ)/(2a) avec x₁ < x₂`);
                lines.push(`     Le trinôme est du signe de a pour x < x₁ et x > x₂, du signe de -a pour x₁ < x < x₂`);
                lines.push(`     Afficher les racines exactes (avec √) ET décimales approchées`);
            } else if (Math.abs(tri.delta) < 1e-10) {
                lines.push(`  2. CAS Δ = 0 : une racine double x₀ = -b/(2a)`);
                lines.push(`     Le trinôme est STRICTEMENT DU SIGNE DE "a" pour tout x ≠ x₀, et vaut 0 en x₀`);
                lines.push(`     Message OBLIGATOIRE : "Le trinôme est toujours de signe constant (celui de a = ${tri.a}), sauf en x₀ où il s'annule. INTERDIT d'écrire que c'est positif avant et négatif après."`);
            } else {
                lines.push(`  2. CAS Δ < 0 : pas de racine réelle`);
                lines.push(`     Le trinôme est STRICTEMENT DU SIGNE DE "a" pour tout x ∈ ℝ`);
                lines.push(`     Message OBLIGATOIRE : "Le trinôme est strictement du signe de a = ${tri.a} pour tout réel x (la parabole ne touche jamais l'axe)."`);
                lines.push(`     PAS de factorisation si Δ < 0`);
            }

            lines.push(`  Afficher Δ et les racines de façon pédagogique (étapes visibles)`);
        }

        if (isOnlyTrinomial) {
            lines.push(`PAS de limites (hors programme pour les tableaux de signes).`);
        }
    }

    // ── Facteurs multiples (produit/quotient) ──
    if (factors.length > 1) {
        if (hasAffine) {
            lines.push(``);
            lines.push(`Pour chaque facteur affine : utilise la règle du signe de a (méthode directe).`);
        }
        lines.push(`Explique la règle des signes du produit/quotient : compter le nombre de facteurs négatifs.`);
        if (hasDenominator) {
            lines.push(`Signale les valeurs interdites (dénominateur = 0) avec double barre ||.`);
        }
    }

    // ── Facteurs spéciaux ──
    if (hasExp) {
        lines.push(`Rappelle que e^u(x) > 0 pour tout x (ne change pas le signe).`);
    }
    if (hasSqrt) {
        lines.push(`Rappelle que √u(x) ≥ 0 sur son domaine.`);
    }
    if (hasLn) {
        lines.push(`Rappelle que ln(u) = 0 quand u = 1, ln(u) > 0 quand u > 1, ln(u) < 0 quand 0 < u < 1.`);
    }

    // ── FUTUR : ajouter les nouvelles catégories ici ──
    // if (hasTrig) { ... }

    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// GÉNÉRATION DU TABLEAU DE SIGNES (POINT D'ENTRÉE)
// ─────────────────────────────────────────────────────────────

/**
 * Calcule le domaine effectif pour la construction des intervalles.
 * - Si un facteur est ln(u) : la borne gauche doit être > 0 (domaine ]0,+∞[)
 * - Si un facteur est sqrt(u) : la borne gauche ≥ 0 (domaine [0,+∞[)
 * - Sinon : retourne undefined (intervalles ±∞ par défaut)
 *
 * Ceci évite que signOnInterval évalue ln(x) ou sqrt(x) en des points invalides.
 */
function computeEffectiveDomain(
    factors: FactorAnalysis[],
    searchDomain: [number, number]
): [number, number] | undefined {
    let hasLn = false;
    let hasSqrt = false;
    let sqrtLeftBound = -Infinity; // -Infinity pour ne pas forcer 0 quand la borne est négative

    for (const f of factors) {
        if (f.factorType === 'ln') {
            hasLn = true;
        }
        // Détecter aussi ln() dans des expressions génériques (ex: "ln(x) - 1")
        if (f.factorType === 'generic' && (f.expr.includes('ln(') || f.expr.includes('log('))) {
            hasLn = true;
        }
        if (f.factorType === 'sqrt') {
            hasSqrt = true;
            // La borne gauche = zéro de l'expression interne (là où u(x) = 0)
            // Ex: √(x+2) → zéros=[\u22122], borne=-2
            // Ex: √(x²-9) → zéros=[-3,3], domaine [3;+∞[ (borne = 3)
            const positiveZeros = f.zeros.filter(z => z >= -1e-9);
            if (positiveZeros.length > 0) {
                // Borne droite parmi les zéros positifs (cas sqrt(x²-9) où borne=3)
                sqrtLeftBound = Math.max(sqrtLeftBound, positiveZeros[0]);
            } else if (f.zeros.length > 0) {
                // Tous négatifs : le domaine est [é derniers zéro, +∞[
                // ex: √(x+2) → zéros=[-2], borne=-2
                // ex: √(x+9) → zéros=[-9], borne=-9
                // Prendre le MAX des zéros négatifs (le moins négatif = borne naturelle)
                sqrtLeftBound = Math.max(sqrtLeftBound, f.zeros[f.zeros.length - 1]);
            }
        }
        // Détecter aussi sqrt() dans des expressions génériques
        if (f.factorType === 'generic' && (f.expr.includes('sqrt(') || f.expr.includes('√'))) {
            hasSqrt = true;
        }
    }

    const [sMin, sMax] = searchDomain;

    if (hasLn) {
        // ln(x) : domaine ]0, +∞[ → borne gauche strictement positive
        const leftBound = sMin > 0 ? sMin : 1e-9;
        return [leftBound, sMax > 0 && sMax < 1e9 ? sMax : 20];
    }

    if (hasSqrt) {
        // Borne gauche = sqrtLeftBound (peut être négative ex: sqrt(x+2) → -2)
        // Ne pas forcer Min à 0 quand la borne naturelle est négative
        const boundary = sqrtLeftBound === -Infinity ? 0 : sqrtLeftBound;
        const leftBound = Math.max(sMin, boundary);
        return [leftBound, sMax > 0 && sMax < 1e9 ? sMax : 20];
    }

    // Domaine standard ℝ → pas de contrainte → laisser ±∞
    return undefined;
}

/**
 * Génère automatiquement un tableau de signes complet
 * conforme au programme lycée français.
 */
export function generateSignTable(input: SignTableInput): SignTableResult {
    let { expression, searchDomain = [-20, 20], niveau = 'Seconde' } = input;

    if (!expression) {
        return {
            success: false,
            error: "L'expression est requise.",
            criticalPoints: []
        };
    }

    // Nettoyer les inégalités qui auraient pu fuiter depuis solve_inequality
    // ex: "(x-2)(-x+3) >= 0" -> "(x-2)(-x+3)"
    expression = expression.replace(/\s*(?:<=|>=|<|>|≤|≥)\s*0\s*$/, '').trim();

    try {
        // ── Étape 2 : Identifier et classifier les facteurs ──
        // On passe bien l'expression nettoyée à extractFactors (qui la lit de input.expression)
        const factors = extractFactors({ ...input, expression });


        // ── Étape 1 : Domaine ──
        const domain = input.sympyDomain?.domainLatex ?? determineDomain(expression, factors);

        // ── Étape 4a : Domaine effectif ──
        let effectiveDomain = computeEffectiveDomain(factors, searchDomain);
        if (input.sympyDomain && input.sympyDomain.domainLeft !== null) {
            effectiveDomain = [input.sympyDomain.domainLeft, searchDomain[1]];
        }

        // ── Étape 3 : Valeurs critiques (filtrées des bornes du domaine) ──
        const rawCriticalPoints = collectCriticalPoints(factors);
        if (input.sympyDomain?.forbiddenPoints) {
            rawCriticalPoints.push(...input.sympyDomain.forbiddenPoints);
        }
        const uniqueCriticalPoints = [...new Set(rawCriticalPoints)].sort((a, b) => a - b);

        // Retirer les points qui coïncident avec la borne gauche du domaine effectif.
        // Pour ln(x) : borne = 0 (strictement), mais findDiscontinuities peut retourner ~0.01.
        // On utilise une tolérance de 5% de la distance [borne → premier point critique].
        const leftNum = effectiveDomain ? effectiveDomain[0] : -Infinity;
        // Tolérance large pour attraper les artefacts numériques de findDiscontinuities
        const leftTol = (() => {
            if (!effectiveDomain) return 1e-8;
            // Si borne à 0 : filtrer tout ce qui est dans ]0, 0.1[
            if (Math.abs(leftNum) < 1e-6) return 0.1;
            return Math.abs(leftNum) * 0.1 + 1e-6;
        })();
        const criticalPoints = uniqueCriticalPoints.filter(cp => Math.abs(cp - leftNum) > leftTol);

        const intervalBounds = buildIntervalBounds(criticalPoints, effectiveDomain);

        // xValues : borne gauche = formatée si domaine restreint
        const leftLabel: string = (() => {
            if (input.sympyDomain && input.sympyDomain.domainLeft !== null) {
                return (input.sympyDomain.domainStrict ? ']' : '') + formatForTable(input.sympyDomain.domainLeft);
            }
            if (!effectiveDomain) return '-inf';
            const l = effectiveDomain[0];
            // Ne traiter l comme 0 QUE si la valeur est vraiment nulle (< 1e-9)
            // sqrt(x) : borne = 0 → '0'
            // sqrt(x+2) : borne = -2 → '-2' (pas '0' !)
            if (Math.abs(l) < 1e-9) return '0';
            return formatForTable(l);
        })();
        // Fusionner les formes exactes de tous les facteurs trinomiaux
        const exactMap = new Map<number, string>();
        for (const f of factors) {
            if (f.exactStrings) f.exactStrings.forEach((label, val) => exactMap.set(val, label));
        }
        const xValues = [leftLabel, ...criticalPoints.map(cp => exactMap.get(cp) ?? formatForTable(cp)), '+inf'];




        // ── Étape 4b : Lignes par facteur ──
        const factorRows: SignRow[] = [];
        for (const factor of factors) {
            const row = buildFactorSignRow(factor, criticalPoints, intervalBounds);
            factorRows.push(row);
        }

        // ── Étape 4c : Ligne f(x) ──
        const fxRow = buildFxSignRow(expression, criticalPoints, intervalBounds, factors, factorRows);

        const rows: SignRow[] = [...factorRows, fxRow];

        // ── Injection de la valeur à la borne gauche (si domaine restreint) ──
        // Le frontend MathTable attend un format strict de 2N-3 éléments pour les lignes de signes.
        // La gestion des bornes est gérée côté frontend via le caractère ']' (isDomainBounded).
        // On ne modifie pas les valeurs ici pour éviter un décalage pair/impair qui casse l'affichage.        // ── Étapes Δ pour les trinômes ──
        const discriminantSteps = buildDiscriminantSteps(factors);

        const tableSpec: TableSpec = {
            xValues,
            rows,
            title: `Tableau de signes de f(x) = ${expression}`,
        };

        const aaaBlock = tableSpecToAAA(tableSpec);
        return {
            success: true,
            tableSpec,
            aaaBlock,
            criticalPoints,
            domain,
            discriminantSteps: discriminantSteps.length > 0 ? discriminantSteps : undefined,
            aiContext: buildSignTableAIContext(factors, niveau, expression),
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.message ?? String(err),
            criticalPoints: [],
        };
    }
}

// ─────────────────────────────────────────────────────────────
// CONVERSION EXPRESSION → LATEX (pour l'affichage dans MathTable)
// ─────────────────────────────────────────────────────────────

/**
 * Convertit une expression texte en LaTeX propre, utilisable avec KaTeX.
 * Ex : "2x+1"         → "2x+1"
 *      "x^2-3x+2"     → "x^{2}-3x+2"
 *      "sqrt(x+1)"    → "\\sqrt{x+1}"
 *      "ln(x)"        → "\\ln(x)"
 *      "exp(2x)"      → "e^{2x}"
 *      "(2x+1)/(x-4)" → "\\dfrac{2x+1}{x-4}"
 *      "-inf"         → "-\\infty"
 *      "1/2"          → "\\dfrac{1}{2}"
 */
export function toLatexLabel(expr: string): string {
    if (!expr || expr.trim() === '') return '';
    let s = expr.trim();

    // ── Infinis ──
    if (s === '-inf' || s === '-infty') return '-\\infty';
    if (s === '+inf' || s === '+infty' || s === 'inf') return '+\\infty';

    // ── Exposants : x^2 → x^{2}, x^(n) → x^{n} ──
    s = s.replace(/\^(\w+)/g, '^{$1}');
    s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');

    // ── sqrt(u) → \sqrt{u} ──
    s = s.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');

    // ── ln(u) → \ln(u) ──
    s = s.replace(/\bln\(/g, '\\ln(');
    s = s.replace(/\blog\(/g, '\\ln(');

    // ── exp(u) → e^{u} ──
    s = s.replace(/\bexp\(([^)]+)\)/g, 'e^{$1}');

    // ── Fractions simples : a/b où a et b sont sans parenthèses ──
    // ex: 1/2, -3/4, 2x+1/x-4 (si pas de parenthèses autour)
    // On ne touche qu'aux fractions de nombres : -3/2 → \dfrac{-3}{2}
    s = s.replace(/^(-?\d+)\/(\d+)$/, '\\dfrac{$1}{$2}');

    // ── Quotient (num)/(den) → \dfrac{num}{den} ──
    const fracMatch = s.match(/^\((.+)\)\/\((.+)\)$/);
    if (fracMatch) {
        return `\\dfrac{${toLatexLabel(fracMatch[1])}}{${toLatexLabel(fracMatch[2])}}`;
    }

    // ── Multiplication : * → \cdot ──
    s = s.replace(/\*/g, '\\cdot ');

    // ── Notation décimale française : 3.14 → 3{,}14 ──
    s = s.replace(/(\d)\.(\d)/g, '$1{,}$2');

    // ── Nettoyages finaux ──
    s = s.replace(/\s+/g, ' ').trim();

    return s;
}

// ─────────────────────────────────────────────────────────────
// CONVERSION EN FORMAT @@@
// ─────────────────────────────────────────────────────────────

function tableSpecToAAA(spec: TableSpec): string {
    const lines: string[] = ['table'];
    lines.push(`x: ${spec.xValues.join(', ')}`);

    for (const row of spec.rows) {
        const prefix = row.type === 'sign' ? 'sign' : 'variation';
        lines.push(`${prefix}: ${row.label} : ${row.values.join(', ')}`);
    }

    return `@@@\n${lines.join(' |\n')} |\n@@@`;
}

