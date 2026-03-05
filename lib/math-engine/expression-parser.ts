/**
 * COUCHE 3 — PARSEUR D'EXPRESSIONS
 * ===================================
 * Analyse une expression mathématique (string) et extrait :
 * - Les facteurs linéaires / polynomiaux
 * - Les valeurs critiques (zéros + valeurs interdites)
 * - Le signe de chaque facteur sur chaque intervalle
 *
 * Utilise mathjs pour l'évaluation numérique et l'analyse symbolique.
 */

import { evaluate, parse, derivative, simplify } from 'mathjs';

export interface Factor {
    expr: string;         // Expression du facteur, ex: "x + 3"
    type: 'numerator' | 'denominator';
    zeros: number[];      // Valeurs qui annulent ce facteur
}

export interface CriticalPoint {
    x: number;
    type: 'zero' | 'forbidden';  // zéro du numérateur ou valeur interdite
    factorLabel?: string;
}

export interface SignInterval {
    from: number | '-inf';
    to: number | '+inf';
    sign: '+' | '-';
}

export interface ParsedExpression {
    raw: string;
    factors: Factor[];
    criticalPoints: CriticalPoint[];
    isRational: boolean;   // Contient une division
}

// ─────────────────────────────────────────────────────────────
// ÉVALUATION NUMÉRIQUE
// ─────────────────────────────────────────────────────────────

/**
 * Évalue une expression mathématique en un point x.
 * Retourne null si l'évaluation échoue (division par 0, sqrt négatif…)
 */
export function evalAt(expr: string, x: number): number | null {
    try {
        const sanitized = sanitizeExpression(expr);
        const result = evaluate(sanitized, { x });
        if (typeof result === 'number' && isFinite(result)) return result;
        return null;
    } catch {
        return null;
    }
}

/**
 * Sanitise une expression pour mathjs
 * Convertit les notations françaises et LaTeX vers mathjs
 *
 * Pipeline en 3 passes :
 *  1. Normalisation des symboles (Unicode, LaTeX, français)
 *  2. Conversion des fonctions (ln → log, exp → e^, e^x → e^(x))
 *  3. Multiplication implicite (2x → 2*x, xe^ → x*e^, )( → )*( )
 */
export function sanitizeExpression(expr: string): string {
    // ── PASSE 1 : Normalisation ──
    let s = expr
        .replace(/\^/g, '^')
        .replace(/×/g, '*')
        .replace(/\u00b7/g, '*')      // point médian · → *
        .replace(/÷/g, '/')
        .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
        .replace(/√(\w+)/g, 'sqrt($1)')
        .replace(/,/g, '.')            // décimale française → anglaise
        .replace(/\s+/g, ' ')
        .trim();

    // ── PASSE 2 : Fonctions ──
    s = s
        .replace(/\bln\(/g, 'log(')    // mathjs : log = ln
        .replace(/\bexp\(/g, 'e^(')    // exp(u) → e^(u)
        // e^x → e^(x) — variable simple sans parenthèses
        .replace(/\be\^([a-zA-Z_][a-zA-Z0-9_]*)/g, 'e^($1)');

    // ── PASSE 3 : Multiplication implicite ──
    // Liste des noms de fonctions à protéger (ne pas insérer * avant leur '(')
    const funcNames = new Set(['sqrt', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'abs', 'ceil', 'floor', 'round', 'sign', 'exp', 'min', 'max']);

    // 3a. chiffre suivi d'une lettre : 2x → 2*x, 3e → 3*e
    s = s.replace(/(\d)([a-zA-Z])/g, '$1*$2');

    // 3b. lettre suivie de e^ : xe^ → x*e^
    s = s.replace(/([a-zA-Z])(e\^)/g, '$1*$2');

    // 3c. ')' suivie de '(' : )( → )*(
    s = s.replace(/\)\(/g, ')*(');

    // 3d. ')' suivie d'une lettre ou chiffre : )x → )*x, )2 → )*2
    s = s.replace(/\)([a-zA-Z0-9])/g, ')*$1');

    // 3e. lettre ou chiffre suivie de '(' — SAUF si c'est la fin d'un nom de fonction
    // On utilise une approche par scanning pour détecter les fonctions
    let result = '';
    let i = 0;
    while (i < s.length) {
        if (s[i] === '(' && i > 0) {
            // Vérifier si les caractères précédents forment un nom de fonction
            let funcEnd = i;
            let funcStart = i - 1;
            while (funcStart >= 0 && /[a-zA-Z]/.test(s[funcStart])) funcStart--;
            funcStart++;
            const word = s.slice(funcStart, funcEnd);
            if (word.length >= 2 && funcNames.has(word.toLowerCase())) {
                // C'est un nom de fonction → pas de * avant (
                result += s[i];
            } else if (i > 0 && /[a-zA-Z0-9)]/.test(s[i - 1])) {
                // Lettre/chiffre isolée suivie de ( → insérer *
                result += '*' + s[i];
            } else {
                result += s[i];
            }
        } else {
            result += s[i];
        }
        i++;
    }

    return result;
}



// ─────────────────────────────────────────────────────────────
// CALCUL DE LA DÉRIVÉE
// ─────────────────────────────────────────────────────────────

/**
 * Calcule la dérivée symbolique d'une expression.
 * Retourne la dérivée simplifiée sous forme de string.
 */
export function computeDerivative(expr: string): string {
    try {
        const sanitized = sanitizeExpression(expr);
        const parsed = parse(sanitized);
        const derived = derivative(parsed, 'x');
        return simplify(derived).toString();
    } catch (err) {
        console.warn('[MathEngine] Erreur dérivée:', err);
        return '';
    }
}

// ─────────────────────────────────────────────────────────────
// DÉTECTION DES ZÉROS PAR MÉTHODE DE BISECTION
// ─────────────────────────────────────────────────────────────

/**
 * Trouve les zéros d'une expression sur [xMin, xMax] par balayage + bisection.
 * Retourne les valeurs arrondies à 4 décimales.
 */
export function findZeros(
    expr: string,
    xMin: number = -20,
    xMax: number = 20,
    steps: number = 2000
): number[] {
    const zeros: number[] = [];
    const step = (xMax - xMin) / steps;

    let prevX = xMin;
    let prevY = evalAt(expr, xMin);

    // Vérifier si xMin lui-même est un zéro (important pour sqrt(x) en x=0, etc.)
    if (prevY !== null && Math.abs(prevY) < 1e-8) {
        zeros.push(round4(xMin));
    }

    for (let i = 1; i <= steps; i++) {
        const x = xMin + i * step;
        const y = evalAt(expr, x);

        if (y === null) { prevX = x; prevY = null; continue; }
        if (prevY === null) { prevX = x; prevY = y; continue; }

        // Changement de signe → zéro entre prevX et x
        if (prevY * y < 0) {
            const zero = bisect(expr, prevX, x);
            if (zero !== null && !zeros.some(z => Math.abs(z - zero) < 1e-6)) {
                zeros.push(round4(zero));
            }
        }
        // Valeur proche de zéro (touche l'axe sans changer de signe)
        if (Math.abs(y) < 1e-8 && !zeros.some(z => Math.abs(z - x) < 1e-6)) {
            zeros.push(round4(x));
        }

        prevX = x;
        prevY = y;
    }

    return zeros.sort((a, b) => a - b);
}

/**
 * Méthode de bisection pour affiner la position d'un zéro.
 */
function bisect(expr: string, a: number, b: number, maxIter = 50): number | null {
    let fa = evalAt(expr, a);
    let fb = evalAt(expr, b);
    if (fa === null || fb === null) return null;

    for (let i = 0; i < maxIter; i++) {
        const mid = (a + b) / 2;
        const fm = evalAt(expr, mid);
        if (fm === null || Math.abs(fm) < 1e-10 || (b - a) / 2 < 1e-10) {
            return mid;
        }
        if (fa! * fm < 0) { b = mid; fb = fm; }
        else { a = mid; fa = fm; }
    }
    return (a + b) / 2;
}

// ─────────────────────────────────────────────────────────────
// DÉTECTION DES DISCONTINUITÉS (VALEURS INTERDITES)
// ─────────────────────────────────────────────────────────────

/**
 * Détecte les valeurs interdites (dénominateur = 0 ou ln(0))
 * en cherchant les explosions verticales de la fonction.
 */
export function findDiscontinuities(
    expr: string,
    xMin: number = -20,
    xMax: number = 20,
    steps: number = 2000
): number[] {
    const discontinuities: number[] = [];
    const step = (xMax - xMin) / steps;

    let prevY: number | null = null;
    let prevX: number = xMin;

    for (let i = 0; i <= steps; i++) {
        const x = xMin + i * step;
        const y = evalAt(expr, x);

        // Transition null ↔ non-null sur un petit intervalle → discontinuité
        if ((y === null) !== (prevY === null)) {
            const disc = (x + prevX) / 2;
            if (!discontinuities.some(d => Math.abs(d - disc) < 1e-6)) {
                discontinuities.push(round4(disc));
            }
        }

        // Saut énorme entre deux points → asymptote verticale
        if (y !== null && prevY !== null && Math.abs(y - prevY) > 1e6) {
            const disc = (x + prevX) / 2;
            if (!discontinuities.some(d => Math.abs(d - disc) < 1e-6)) {
                discontinuities.push(round4(disc));
            }
        }

        prevX = x; prevY = y;
    }

    return discontinuities.sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────
// CALCUL DU SIGNE SUR UN INTERVALLE
// ─────────────────────────────────────────────────────────────

/**
 * Retourne le signe d'une expression sur un intervalle ouvert (a, b).
 * Évalue en plusieurs points pour robustesse.
 */
export function signOnInterval(expr: string, a: number | '-inf', b: number | '+inf'): '+' | '-' | '0' | null {
    const xFrom = a === '-inf' ? -1e6 : (a as number) + 1e-6;
    const xTo = b === '+inf' ? 1e6 : (b as number) - 1e-6;
    if (xFrom >= xTo) return null;

    const mid = (xFrom + xTo) / 2;
    const testPoints = [mid, xFrom + (xTo - xFrom) * 0.25, xFrom + (xTo - xFrom) * 0.75];

    for (const tx of testPoints) {
        const v = evalAt(expr, tx);
        if (v !== null && Math.abs(v) > 1e-10) {
            return v > 0 ? '+' : '-';
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────

export function round4(x: number): number {
    return Math.round(x * 10000) / 10000;
}

/**
 * Formate un nombre pour l'affichage dans un tableau @@@
 * Ex: -0.5 → "-1/2", 1.5 → "3/2", 3 → "3"
 */
export function formatForTable(x: number): string {
    if (Number.isInteger(x)) return String(x);

    // Essayer fraction simple (dénominateur ≤ 12)
    // Tolérance 5e-4 : après round4, les erreurs peuvent atteindre ~3e-5 (ex: 2/3 → 0.6667)
    for (let d = 2; d <= 12; d++) {
        const n = Math.round(x * d);
        if (Math.abs(n / d - x) < 5e-4) {
            if (n < 0) return `-${Math.abs(n)}/${d}`;
            return `${n}/${d}`;
        }
    }

    // Arrondir à 2 décimales (notation anglaise — la virgule française casserait le CSV @@@)
    return x.toFixed(2);
}

/**
 * Convertit une liste de points critiques en valeurs @@ format
 * Ex: [-3, 1, 2] + [-inf, +inf] → ["-inf", "-3", "1", "2", "+inf"]
 */
export function buildXValues(criticalPoints: number[]): string[] {
    return ['-inf', ...criticalPoints.map(formatForTable), '+inf'];
}
