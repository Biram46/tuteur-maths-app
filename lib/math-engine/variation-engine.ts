/**
 * COUCHE 3 — MOTEUR TABLEAU DE VARIATIONS (v2)
 * ==============================================
 * Génère automatiquement un tableau de variations pour une fonction f(x).
 *
 * 🔧 RÈGLES MÉTIER PAR TYPE DE FONCTION :
 *  [1] Fonctions affines  → coeff a direct, PAS de dérivée
 *  [2] Fonctions de référence (x², x³, √x, 1/x, |x|) → propriétés connues
 *  [3] Polynômes du 2nd degré → forme canonique (discriminant), PAS de dérivée
 *  [4] Autres fonctions → dérivée symbolique + zéros + signe de f'
 *
 * 📚 LIMITES affichées UNIQUEMENT pour :
 *  • terminale_spe, terminale_comp, terminale_expert, terminale_techno
 * JAMAIS pour : seconde, premiere_*, terminale STMG (pas dans notre enum)
 */

import type { TableSpec, TableRow, SignRow, VariationRow } from '../math-spec-types';
import type { NiveauLycee } from '../niveaux';
import {
    evalAt, computeDerivative, findZeros, findDiscontinuities,
    signOnInterval, buildXValues, formatForTable, round4, sanitizeExpression
} from './expression-parser';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface VariationTableInput {
    expression: string;       // f(x) ex: "x^3 - 3*x"
    niveau: NiveauLycee;
    derivativeExpr?: string;  // f'(x) fournie si déjà calculée
    searchDomain?: [number, number];
    title?: string;
}

export interface VariationTableResult {
    success: boolean;
    tableSpec?: TableSpec;
    aaaBlock?: string;
    derivativeExpr?: string;
    extrema?: { x: number; y: number; type: 'max' | 'min' }[];
    method?: string;          // Méthode utilisée pour l'explication pédagogique
    aiContext?: string;       // Instructions pédagogiques pour l'IA (adaptées au niveau + méthode)
    error?: string;
    needsAI?: boolean;        // Fallback IA si le moteur JS échoue
}

// ─────────────────────────────────────────────────────────────
// DÉTECTION DU TYPE DE FONCTION
// ─────────────────────────────────────────────────────────────

type FunctionCategory =
    | 'affine'               // ax + b
    | 'reference_x2'         // x²
    | 'reference_x3'         // x³
    | 'reference_sqrt'       // √x
    | 'reference_inv'        // 1/x
    | 'reference_abs'        // |x|
    | 'quadratic'            // ax² + bx + c (a≠0, b≠0 ou c≠0)
    | 'general';             // Tout le reste

interface AffineCoeffs { a: number; b: number }
interface QuadraticCoeffs { a: number; b: number; c: number }

/**
 * Détecte la catégorie d'une expression via évaluation numérique.
 * On utilise des tests ponctuels pour identifier le pattern
 * plutôt que du pattern matching textuel (plus robuste).
 */
function detectFunctionCategory(expr: string): {
    category: FunctionCategory;
    affine?: AffineCoeffs;
    quadratic?: QuadraticCoeffs;
} {
    const san = sanitizeExpression(expr);

    // ── Test fonctions de référence exactes ──
    // On compare f(x) aux résultats attendus sur plusieurs points
    const testPoints = [-3.7, -2, -0.5, 0, 0.5, 1, 2, 3.7, 5];

    // f(x) = x²
    if (isExactMatch(san, testPoints.filter(x => x !== 0), x => x * x)) {
        return { category: 'reference_x2' };
    }

    // f(x) = x³
    if (isExactMatch(san, testPoints, x => x * x * x)) {
        return { category: 'reference_x3' };
    }

    // f(x) = |x|
    if (isExactMatch(san, testPoints, x => Math.abs(x))) {
        return { category: 'reference_abs' };
    }

    // f(x) = √x (définie uniquement pour x ≥ 0)
    const sqrtPoints = [0, 0.25, 1, 4, 9, 16];
    if (isExactMatch(san, sqrtPoints, x => Math.sqrt(x))) {
        // Vérifier que f(-1) est non-défini
        if (evalAt(san, -1) === null) {
            return { category: 'reference_sqrt' };
        }
    }

    // f(x) = 1/x
    const invPoints = [-5, -2, -1, -0.5, 0.5, 1, 2, 5];
    if (isExactMatch(san, invPoints, x => 1 / x)) {
        if (evalAt(san, 0) === null) {
            return { category: 'reference_inv' };
        }
    }

    // ── Test affine : f(x) = ax + b ──
    // Si f(x) est affine, f(1)-f(0)=a et f(0)=b pour tout x
    const y0 = evalAt(san, 0);
    const y1 = evalAt(san, 1);
    const y2 = evalAt(san, 2);
    const y10 = evalAt(san, 10);
    if (y0 !== null && y1 !== null && y2 !== null && y10 !== null) {
        const a = y1 - y0;
        const b = y0;
        // Vérifier la linéarité sur plusieurs points
        if (Math.abs(y2 - (a * 2 + b)) < 1e-8 && Math.abs(y10 - (a * 10 + b)) < 1e-8) {
            // Vérifier aussi un point négatif
            const yNeg = evalAt(san, -3);
            if (yNeg !== null && Math.abs(yNeg - (a * (-3) + b)) < 1e-8) {
                return { category: 'affine', affine: { a, b } };
            }
        }
    }

    // ── Test quadratique : f(x) = ax² + bx + c ──
    // On utilise 4 points pour résoudre et vérifier
    if (y0 !== null && y1 !== null && y2 !== null) {
        const c = y0;                       // f(0) = c
        const yNeg1 = evalAt(san, -1);
        if (yNeg1 !== null) {
            // f(1) = a + b + c → a + b = y1 - c
            // f(-1) = a - b + c → a - b = yNeg1 - c
            const aPlusB = y1 - c;
            const aMinusB = yNeg1 - c;
            const a = (aPlusB + aMinusB) / 2;
            const b2 = (aPlusB - aMinusB) / 2;

            if (Math.abs(a) > 1e-10) {
                // Vérifier sur d'autres points
                const y3 = evalAt(san, 3);
                const y5 = evalAt(san, 5);
                const yNeg3 = evalAt(san, -3);
                if (y3 !== null && y5 !== null && yNeg3 !== null) {
                    const check3 = Math.abs(y3 - (a * 9 + b2 * 3 + c));
                    const check5 = Math.abs(y5 - (a * 25 + b2 * 5 + c));
                    const checkN3 = Math.abs(yNeg3 - (a * 9 + b2 * (-3) + c));
                    if (check3 < 1e-6 && check5 < 1e-6 && checkN3 < 1e-6) {
                        return { category: 'quadratic', quadratic: { a, b: b2, c } };
                    }
                }
            }
        }
    }

    return { category: 'general' };
}

/** Vérifie si f(x) correspond exactement à expected(x) sur tous les points */
function isExactMatch(
    expr: string,
    testPoints: number[],
    expected: (x: number) => number,
    tol = 1e-8
): boolean {
    for (const x of testPoints) {
        const y = evalAt(expr, x);
        const exp = expected(x);
        if (y === null) return false;
        if (Math.abs(y - exp) > tol) return false;
    }
    return true;
}

// ─────────────────────────────────────────────────────────────
// RÈGLES PÉDAGOGIQUES PAR NIVEAU (v2)
// ─────────────────────────────────────────────────────────────

interface NiveauRules {
    showLimitsAtInfinity: boolean;     // Mettre les valeurs limites à ±∞
    includeDerivativeLine: boolean;    // Inclure la ligne sign: f'(x)
    allowDerivativeCalc: boolean;      // Autorisé à calculer la dérivée
}

function getRulesForNiveau(niveau: NiveauLycee): NiveauRules {
    switch (niveau) {
        case 'seconde':
        case 'seconde_sthr':
            // Seconde : PAS de dérivée, PAS de limites
            return { showLimitsAtInfinity: false, includeDerivativeLine: false, allowDerivativeCalc: false };

        case 'premiere_commune':
        case 'premiere_techno':
            // Première commune/techno : dérivée simple autorisée, PAS de limites
            return { showLimitsAtInfinity: false, includeDerivativeLine: true, allowDerivativeCalc: true };

        case 'premiere_spe':
            // 1ère spé : dérivée pour deg≥3, PAS de limites
            return { showLimitsAtInfinity: false, includeDerivativeLine: true, allowDerivativeCalc: true };

        case 'terminale_spe':
        case 'terminale_comp':
        case 'terminale_expert':
            // Terminale générale : tout est autorisé, limites incluses
            return { showLimitsAtInfinity: true, includeDerivativeLine: true, allowDerivativeCalc: true };

        case 'terminale_techno':
            // Terminale techno (STI2D, STL, etc.) : limites en cas simples, dérivée oui
            return { showLimitsAtInfinity: true, includeDerivativeLine: true, allowDerivativeCalc: true };

        default:
            return { showLimitsAtInfinity: false, includeDerivativeLine: true, allowDerivativeCalc: true };
    }
}

// ─────────────────────────────────────────────────────────────
// GÉNÉRATION DU CONTEXTE IA (instructions pédagogiques)
// ─────────────────────────────────────────────────────────────

const NIVEAU_LABELS: Record<string, string> = {
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
 * Construit les instructions pédagogiques pour l'IA.
 *
 * Cette fonction est le SEUL endroit où sont définies les contraintes
 * envoyées à l'IA. Pour ajouter une nouvelle catégorie (trigo, log, etc.),
 * il suffit d'ajouter un case ici.
 */
function buildAIContext(
    category: FunctionCategory,
    niveau: NiveauLycee,
    rules: NiveauRules,
    extra: {
        method?: string;
        derivativeExpr?: string;
        coeffs?: { a?: number; b?: number; c?: number };
        extrema?: { x: number; y: number; type: 'max' | 'min' }[];
    } = {}
): string {
    const niveauLabel = NIVEAU_LABELS[niveau] ?? niveau;
    const lines: string[] = [];

    lines.push(`Niveau : ${niveauLabel}.`);
    lines.push(`NE GÉNÈRE AUCUN bloc @@@.`);

    // ── Interdictions globales par niveau ──
    if (!rules.allowDerivativeCalc) {
        lines.push(`⚠️ NE PARLE PAS de dérivée (hors programme pour ce niveau).`);
    }
    if (!rules.showLimitsAtInfinity) {
        lines.push(`⚠️ NE MENTIONNE PAS de limites en ±∞ (hors programme pour ce niveau).`);
    }

    // ── Instructions spécifiques par catégorie ──
    switch (category) {
        case 'affine':
            lines.push(`Méthode : propriétés de la fonction affine.`);
            lines.push(`Explique : le coefficient directeur a, son signe, et la conclusion (croissante/décroissante/constante).`);
            lines.push(`NE PARLE PAS de dérivée pour une fonction affine.`);
            break;

        case 'reference_x2':
            lines.push(`Méthode : propriétés connues de la fonction de référence x².`);
            lines.push(`Explique : c'est une fonction de référence du programme, décroissante puis croissante, minimum en 0.`);
            lines.push(`NE calcule PAS la dérivée (propriété connue par le programme).`);
            break;

        case 'reference_x3':
            lines.push(`Méthode : propriétés connues de la fonction de référence x³.`);
            lines.push(`Explique : fonction de référence, croissante sur ℝ.`);
            lines.push(`NE calcule PAS la dérivée.`);
            break;

        case 'reference_sqrt':
            lines.push(`Méthode : propriétés connues de la fonction de référence √x.`);
            lines.push(`Explique : domaine [0;+∞[, croissante, c'est une propriété connue.`);
            lines.push(`NE calcule PAS la dérivée.`);
            break;

        case 'reference_inv':
            lines.push(`Méthode : propriétés connues de la fonction de référence 1/x.`);
            lines.push(`Explique : domaine ℝ\\{0}, décroissante sur chaque intervalle, valeur interdite en 0.`);
            lines.push(`NE calcule PAS la dérivée.`);
            break;

        case 'reference_abs':
            lines.push(`Méthode : propriétés connues de la fonction de référence |x|.`);
            lines.push(`Explique : minimum en 0, décroissante puis croissante.`);
            lines.push(`NE calcule PAS la dérivée.`);
            break;

        case 'quadratic':
            lines.push(`Méthode : forme canonique du polynôme du second degré (PAS la dérivée).`);
            lines.push(`Explique : calcul du discriminant Δ = b²-4ac, sommet x_s = -b/(2a), f(x_s) = -Δ/(4a), signe de a → minimum ou maximum.`);
            lines.push(`NE PARLE PAS de dérivée pour un polynôme du second degré.`);
            break;

        case 'general':
            if (extra.derivativeExpr) {
                lines.push(`Méthode : étude du signe de la dérivée.`);
                lines.push(`f'(x) = ${extra.derivativeExpr}.`);
                lines.push(`Explique : calcul de f'(x), résolution de f'(x)=0, signe de f'(x) sur chaque intervalle, variation de f.`);
            }
            if (rules.showLimitsAtInfinity) {
                lines.push(`Inclus l'étude des limites en ±∞.`);
            }
            if (extra.extrema && extra.extrema.length > 0) {
                lines.push(`Extremums : ${extra.extrema.map(e => `${e.type === 'max' ? 'maximum' : 'minimum'} en x=${e.x}, f(x)=${e.y}`).join(' ; ')}.`);
            }
            break;

        // ── FUTUR : ajouter les nouvelles catégories ici ──
        // case 'trigonometric':
        //     lines.push(`Méthode : propriétés des fonctions trigonométriques.`);
        //     ...
        //     break;
        // case 'logarithmic':
        //     lines.push(`Méthode : étude avec les propriétés de ln.`);
        //     ...
        //     break;
    }

    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// POINT D'ENTRÉE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function generateVariationTable(input: VariationTableInput): VariationTableResult {
    const { expression, niveau, searchDomain = [-20, 20] } = input;
    const rules = getRulesForNiveau(niveau);

    try {
        const detection = detectFunctionCategory(expression);
        const category = detection.category;

        console.log(`[VarEngine] f(x) = ${expression} → catégorie: ${category}, niveau: ${niveau}`);

        let result: VariationTableResult;

        switch (category) {
            case 'affine':
                result = handleAffine(expression, detection.affine!, rules, input.title);
                break;

            case 'reference_x2':
                result = handleReferenceX2(expression, rules, input.title);
                break;

            case 'reference_x3':
                result = handleReferenceX3(expression, rules, input.title);
                break;

            case 'reference_sqrt':
                result = handleReferenceSqrt(expression, rules, input.title);
                break;

            case 'reference_inv':
                result = handleReferenceInv(expression, rules, input.title);
                break;

            case 'reference_abs':
                result = handleReferenceAbs(expression, rules, input.title);
                break;

            case 'quadratic':
                result = handleQuadratic(expression, detection.quadratic!, niveau, rules, input.title);
                break;

            case 'general':
                result = handleGeneral(expression, niveau, rules, searchDomain, input);
                break;

            default:
                return { success: false, error: `Catégorie inconnue: ${category}`, extrema: [] };
        }

        // ── Injection automatique de l'aiContext ──
        if (result.success) {
            result.aiContext = buildAIContext(category, niveau, rules, {
                method: result.method,
                derivativeExpr: result.derivativeExpr,
                coeffs: detection.quadratic ?? detection.affine,
                extrema: result.extrema,
            });
        }

        return result;

    } catch (err: any) {
        return {
            success: false,
            error: err.message ?? String(err),
            extrema: [],
            needsAI: true,
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// [1] FONCTIONS AFFINES f(x) = ax + b
// ═══════════════════════════════════════════════════════════════

function handleAffine(
    expression: string,
    coeffs: AffineCoeffs,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const { a } = coeffs;
    const rows: TableRow[] = [];

    // PAS de ligne f'(x) pour les fonctions affines
    // PAS de limites

    let direction: string;
    if (a > 0) {
        direction = 'nearrow';  // croissante
    } else if (a < 0) {
        direction = 'searrow';  // décroissante
    } else {
        direction = 'rightarrow'; // constante (a = 0)
    }

    const varRow: VariationRow = {
        label: 'f(x)',
        type: 'variation',
        values: [direction],  // une seule flèche sur ℝ
    };
    rows.push(varRow);

    const tableSpec: TableSpec = {
        xValues: ['-inf', '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: `Fonction affine (a = ${formatForTable(a)}), ${a > 0 ? 'croissante' : a < 0 ? 'décroissante' : 'constante'} sur ℝ`,
        extrema: [],
    };
}

// ═══════════════════════════════════════════════════════════════
// [2] FONCTIONS DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════════

// ── f(x) = x² ──
function handleReferenceX2(
    expression: string,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const rows: TableRow[] = [];

    // PAS de ligne f'(x) pour les fonctions de référence
    // Décroissante sur ]-∞ ; 0], croissante sur [0 ; +∞[, minimum en 0

    const varValues: string[] = [];
    if (rules.showLimitsAtInfinity) varValues.push('+inf');
    varValues.push('searrow');
    varValues.push('0');      // f(0) = 0 — minimum
    varValues.push('nearrow');
    if (rules.showLimitsAtInfinity) varValues.push('+inf');

    rows.push({ label: 'f(x)', type: 'variation', values: varValues });

    const tableSpec: TableSpec = {
        xValues: ['-inf', '0', '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: 'Fonction de référence x² : décroissante sur ]-∞ ; 0], croissante sur [0 ; +∞[, minimum en 0',
        extrema: [{ x: 0, y: 0, type: 'min' }],
    };
}

// ── f(x) = x³ ──
function handleReferenceX3(
    expression: string,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const rows: TableRow[] = [];

    // Croissante sur ℝ
    const varValues: string[] = [];
    if (rules.showLimitsAtInfinity) varValues.push('-inf');
    varValues.push('nearrow');
    if (rules.showLimitsAtInfinity) varValues.push('+inf');

    rows.push({ label: 'f(x)', type: 'variation', values: varValues });

    const tableSpec: TableSpec = {
        xValues: ['-inf', '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: 'Fonction de référence x³ : croissante sur ℝ',
        extrema: [],
    };
}

// ── f(x) = √x ──
function handleReferenceSqrt(
    expression: string,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const rows: TableRow[] = [];

    // Croissante sur [0 ; +∞[
    const varValues: string[] = [];
    varValues.push('0');          // f(0) = 0
    varValues.push('nearrow');
    if (rules.showLimitsAtInfinity) varValues.push('+inf');

    rows.push({ label: 'f(x)', type: 'variation', values: varValues });

    const tableSpec: TableSpec = {
        xValues: ['0', '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: 'Fonction de référence √x : croissante sur [0 ; +∞[',
        extrema: [],
    };
}

// ── f(x) = 1/x ──
function handleReferenceInv(
    expression: string,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const rows: TableRow[] = [];

    // Décroissante sur ]-∞ ; 0[ ET décroissante sur ]0 ; +∞[
    // Jamais définie en 0 → || (double barre)
    const varValues: string[] = [];
    if (rules.showLimitsAtInfinity) varValues.push('0');   // lim(x→-∞) 1/x = 0
    varValues.push('searrow');
    if (rules.showLimitsAtInfinity) {
        varValues.push('-inf');  // lim(x→0⁻) 1/x = -∞
        varValues.push('||');
        varValues.push('+inf');  // lim(x→0⁺) 1/x = +∞
    } else {
        varValues.push('||');
    }
    varValues.push('searrow');
    if (rules.showLimitsAtInfinity) varValues.push('0');   // lim(x→+∞) 1/x = 0

    rows.push({ label: 'f(x)', type: 'variation', values: varValues });

    const tableSpec: TableSpec = {
        xValues: ['-inf', '0', '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: 'Fonction de référence 1/x : décroissante sur ]-∞ ; 0[ et sur ]0 ; +∞[, jamais définie en 0',
        extrema: [],
    };
}

// ── f(x) = |x| ──
function handleReferenceAbs(
    expression: string,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const rows: TableRow[] = [];

    // Décroissante sur ]-∞ ; 0], croissante sur [0 ; +∞[, minimum en 0
    const varValues: string[] = [];
    if (rules.showLimitsAtInfinity) varValues.push('+inf');
    varValues.push('searrow');
    varValues.push('0');      // f(0) = 0 — minimum
    varValues.push('nearrow');
    if (rules.showLimitsAtInfinity) varValues.push('+inf');

    rows.push({ label: 'f(x)', type: 'variation', values: varValues });

    const tableSpec: TableSpec = {
        xValues: ['-inf', '0', '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: 'Fonction de référence |x| : décroissante sur ]-∞ ; 0], croissante sur [0 ; +∞[, minimum en 0',
        extrema: [{ x: 0, y: 0, type: 'min' }],
    };
}

// ═══════════════════════════════════════════════════════════════
// [3] POLYNÔMES DU SECOND DEGRÉ f(x) = ax² + bx + c
// ═══════════════════════════════════════════════════════════════

function handleQuadratic(
    expression: string,
    coeffs: QuadraticCoeffs,
    niveau: NiveauLycee,
    rules: NiveauRules,
    title?: string
): VariationTableResult {
    const { a, b, c } = coeffs;

    // ── Sommet via forme canonique ──
    const xs = -b / (2 * a);                // x du sommet
    const delta = b * b - 4 * a * c;        // discriminant
    const ys = -delta / (4 * a);            // f(xs) = -Δ/(4a)

    const xsStr = formatForTable(round4(xs));
    const ysStr = formatForTable(round4(ys));

    const rows: TableRow[] = [];
    const extrema: { x: number; y: number; type: 'max' | 'min' }[] = [];

    // PAS de ligne f'(x) pour les polynômes du 2nd degré
    // (règle programme : utiliser la forme canonique, pas la dérivée)

    const varValues: string[] = [];

    if (a > 0) {
        // Minimum au sommet
        if (rules.showLimitsAtInfinity) varValues.push('+inf');
        varValues.push('searrow');
        varValues.push(ysStr);
        varValues.push('nearrow');
        if (rules.showLimitsAtInfinity) varValues.push('+inf');
        extrema.push({ x: round4(xs), y: round4(ys), type: 'min' });
    } else {
        // Maximum au sommet
        if (rules.showLimitsAtInfinity) varValues.push('-inf');
        varValues.push('nearrow');
        varValues.push(ysStr);
        varValues.push('searrow');
        if (rules.showLimitsAtInfinity) varValues.push('-inf');
        extrema.push({ x: round4(xs), y: round4(ys), type: 'max' });
    }

    rows.push({ label: 'f(x)', type: 'variation', values: varValues });

    const tableSpec: TableSpec = {
        xValues: ['-inf', xsStr, '+inf'],
        rows,
        title: title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    // Construire la description de la méthode
    const methodLines = [
        `Polynôme du second degré (a=${formatForTable(round4(a))}, b=${formatForTable(round4(b))}, c=${formatForTable(round4(c))})`,
        `Δ = b² - 4ac = ${formatForTable(round4(delta))}`,
        `Sommet : x_s = -b/(2a) = ${xsStr}`,
        `f(x_s) = -Δ/(4a) = ${ysStr}`,
        a > 0 ? `a > 0 → minimum au sommet` : `a < 0 → maximum au sommet`,
    ];

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        method: methodLines.join('\n'),
        extrema,
    };
}

// ═══════════════════════════════════════════════════════════════
// [4] CAS GÉNÉRAL (dérivée symbolique)
// ═══════════════════════════════════════════════════════════════

function handleGeneral(
    expression: string,
    niveau: NiveauLycee,
    rules: NiveauRules,
    searchDomain: [number, number],
    input: VariationTableInput
): VariationTableResult {

    // ── 1. Calculer f'(x) ──
    const derivExpr = input.derivativeExpr ?? computeDerivative(expression);
    if (!derivExpr) {
        return {
            success: false,
            error: `Impossible de calculer f'(x) pour : ${expression}`,
            extrema: [],
            needsAI: true,
        };
    }

    // ── 2. Zéros de f'(x) = points critiques (extremums potentiels) ──
    const derivZeros = findZeros(derivExpr, searchDomain[0], searchDomain[1]);

    // ── 3. Valeurs interdites de f ──
    const rawDiscontinuities = findDiscontinuities(expression, searchDomain[0], searchDomain[1]);

    // ── 3b. Fusionner les discontinuités numériquement proches ──
    // findDiscontinuities peut retourner des artefacts comme [-2.01, -2, -1.99]
    // au lieu de [-2]. On regroupe les points proches (écart < 0.1) et on garde
    // la valeur la plus « propre » (entier ou fraction simple) du groupe.
    const discontinuities = mergeClosePoints(rawDiscontinuities, 0.1);

    // ── 3c. Supprimer les derivZeros qui sont en fait des discontinuités ──
    // (si f'(x) n'est pas définie en x=a, ce n'est pas un vrai zéro de f')
    const cleanDerivZeros = derivZeros.filter(
        z => !discontinuities.some(d => Math.abs(d - z) < 0.05)
    );

    // ── 4. Tous les points critiques triés ──
    const allCritical = [...new Set([...cleanDerivZeros, ...discontinuities])].sort((a, b) => a - b);
    const xValues = buildXValues(allCritical);

    // ── 5. Intervalles ──
    const intervalBounds = buildIntervalBounds(allCritical);

    // ── 6. Construire les lignes ──
    const rows: TableRow[] = [];

    // Ligne sign: f'(x) — selon le niveau
    if (rules.includeDerivativeLine) {
        const derivRow = buildDerivSignRow(derivExpr, allCritical, intervalBounds, cleanDerivZeros, discontinuities);
        rows.push(derivRow);
    }

    // Ligne variation: f(x)
    const extrema: { x: number; y: number; type: 'max' | 'min' }[] = [];
    const varRow = buildVariationRow(
        expression, derivExpr, allCritical, intervalBounds,
        cleanDerivZeros, discontinuities, rules, extrema
    );
    rows.push(varRow);

    const tableSpec: TableSpec = {
        xValues,
        rows,
        title: input.title ?? `Tableau de variations de f(x) = ${expression}`,
    };

    return {
        success: true,
        tableSpec,
        aaaBlock: tableSpecToAAA(tableSpec),
        derivativeExpr: derivExpr,
        method: `Cas général : f'(x) = ${derivExpr}`,
        extrema,
    };
}

// ─────────────────────────────────────────────────────────────
// FUSION DES POINTS NUMÉRIQUEMENT PROCHES
// ─────────────────────────────────────────────────────────────

/**
 * Fusionne les points numériquement proches en un seul point « propre ».
 * Par exemple : [-2.01, -2, -1.99] → [-2]
 *
 * Algorithme :
 * 1. Trier les points
 * 2. Regrouper ceux qui sont à distance < threshold
 * 3. Pour chaque groupe, choisir la valeur la plus propre :
 *    - Préférer un entier (ex: -2 plutôt que -2.01)
 *    - Sinon la moyenne arrondie à 4 décimales
 */
function mergeClosePoints(points: number[], threshold: number = 0.1): number[] {
    if (points.length <= 1) return [...points];

    const sorted = [...points].sort((a, b) => a - b);
    const groups: number[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
        const lastGroup = groups[groups.length - 1];
        const lastVal = lastGroup[lastGroup.length - 1];
        if (Math.abs(sorted[i] - lastVal) < threshold) {
            lastGroup.push(sorted[i]);
        } else {
            groups.push([sorted[i]]);
        }
    }

    return groups.map(group => {
        // Préférer un entier dans le groupe
        const integer = group.find(v => Number.isInteger(v));
        if (integer !== undefined) return integer;

        // Préférer une fraction simple (dénominateur ≤ 6)
        for (const v of group) {
            for (let d = 2; d <= 6; d++) {
                const n = Math.round(v * d);
                if (Math.abs(n / d - v) < 1e-4) return n / d;
            }
        }

        // Sinon, prendre la moyenne du groupe, arrondie
        const avg = group.reduce((s, v) => s + v, 0) / group.length;
        return round4(avg);
    });
}

// ─────────────────────────────────────────────────────────────
// CONSTRUCTION DES LIGNES (cas général)
// ─────────────────────────────────────────────────────────────

function buildIntervalBounds(criticalPoints: number[]): [number | '-inf', number | '+inf'][] {
    const bounds: [number | '-inf', number | '+inf'][] = [];
    if (criticalPoints.length === 0) return [['-inf', '+inf']];

    bounds.push(['-inf', criticalPoints[0]]);
    for (let i = 0; i < criticalPoints.length - 1; i++) {
        bounds.push([criticalPoints[i], criticalPoints[i + 1]]);
    }
    bounds.push([criticalPoints[criticalPoints.length - 1], '+inf']);
    return bounds;
}

/**
 * Ligne sign: f'(x)
 * Format: +/-, 0 ou ||, +/-, 0 ou ||, ..., +/-
 */
function buildDerivSignRow(
    derivExpr: string,
    allCritical: number[],
    intervalBounds: [number | '-inf', number | '+inf'][],
    derivZeros: number[],
    discontinuities: number[]
): SignRow {
    const values: string[] = [];

    for (let i = 0; i < intervalBounds.length; i++) {
        const [from, to] = intervalBounds[i];
        const sign = signOnInterval(derivExpr, from, to);
        values.push(sign ?? '+');

        if (i < allCritical.length) {
            const cp = allCritical[i];
            const isDiscontinuity = discontinuities.some(d => Math.abs(d - cp) < 1e-6);
            const isDerivZero = derivZeros.some(z => Math.abs(z - cp) < 1e-6);

            if (isDiscontinuity) values.push('||');
            else if (isDerivZero) values.push('0');
            else values.push(signOnInterval(derivExpr, cp - 1e-8, cp + 1e-8) ?? '+');
        }
    }

    return { label: "f'(x)", type: 'sign', values };
}

/**
 * Ligne variation: f(x)
 *
 * En Terminale (spe/comp/expert/techno) : valeurs à ±∞ incluses
 * En 1ère (toutes) / Seconde : flèches uniquement, valeurs aux extremums
 */
function buildVariationRow(
    expression: string,
    derivExpr: string,
    allCritical: number[],
    intervalBounds: [number | '-inf', number | '+inf'][],
    derivZeros: number[],
    discontinuities: number[],
    rules: NiveauRules,
    extrema: { x: number; y: number; type: 'max' | 'min' }[]
): VariationRow {
    const values: string[] = [];

    // Valeur à -∞ (Terminale uniquement)
    if (rules.showLimitsAtInfinity) {
        const limitMinus = computeLimitAtInfinity(expression, '-inf');
        values.push(limitMinus);
    }

    for (let i = 0; i < intervalBounds.length; i++) {
        const [from, to] = intervalBounds[i];

        // Flèche (direction de la variation)
        const signDeriv = signOnInterval(derivExpr, from, to);
        values.push(signDeriv === '+' ? 'nearrow' : signDeriv === '-' ? 'searrow' : 'nearrow');

        if (i < allCritical.length) {
            const cp = allCritical[i];
            const isDiscontinuity = discontinuities.some(d => Math.abs(d - cp) < 1e-6);

            if (isDiscontinuity) {
                // Valeur interdite : || et limites latérales en Terminale
                if (rules.showLimitsAtInfinity) {
                    const limitLeft = computeLateralLimit(expression, cp, 'left');
                    const limitRight = computeLateralLimit(expression, cp, 'right');
                    values.push(limitLeft, '||', limitRight);
                } else {
                    values.push('||');
                }
            } else {
                // Extremum : f(cp)
                const yCP = evalAt(expression, cp);
                if (yCP !== null) {
                    const yStr = formatForTable(round4(yCP));
                    values.push(yStr);

                    // Enregistrer l'extremum
                    const derivBefore = signOnInterval(derivExpr, from, cp);
                    const derivAfter = i < intervalBounds.length - 1
                        ? signOnInterval(derivExpr, cp, intervalBounds[i + 1][1])
                        : null;
                    if (derivBefore === '+' && derivAfter === '-') {
                        extrema.push({ x: cp, y: yCP, type: 'max' });
                    } else if (derivBefore === '-' && derivAfter === '+') {
                        extrema.push({ x: cp, y: yCP, type: 'min' });
                    }
                } else {
                    values.push('?');
                }
            }
        }
    }

    // Valeur à +∞ (Terminale uniquement)
    if (rules.showLimitsAtInfinity) {
        const limitPlus = computeLimitAtInfinity(expression, '+inf');
        values.push(limitPlus);
    }

    return { label: 'f(x)', type: 'variation', values };
}

// ─────────────────────────────────────────────────────────────
// CALCUL NUMÉRIQUE DES LIMITES
// ─────────────────────────────────────────────────────────────

/**
 * Approximation numérique de lim(x→±∞) f(x)
 */
function computeLimitAtInfinity(expr: string, direction: '-inf' | '+inf'): string {
    const x = direction === '-inf' ? -1e6 : 1e6;
    const y = evalAt(expr, x);

    if (y === null) return direction === '-inf' ? '-inf' : '+inf';
    if (Math.abs(y) > 1e5) return y > 0 ? '+inf' : '-inf';
    if (Math.abs(y) < 1e-4) return '0';

    return formatForTable(round4(y));
}

/**
 * Approximation numérique de lim(x→a⁻) ou lim(x→a⁺) f(x)
 */
function computeLateralLimit(expr: string, a: number, side: 'left' | 'right'): string {
    const epsilon = 1e-4;
    const x = side === 'left' ? a - epsilon : a + epsilon;
    const y = evalAt(expr, x);

    if (y === null) return side === 'left' ? '-inf' : '+inf';
    if (Math.abs(y) > 1e4) return y > 0 ? '+inf' : '-inf';

    return formatForTable(round4(y));
}

// ─────────────────────────────────────────────────────────────
// CONVERSION @@@
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
