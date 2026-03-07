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
    // ── PASSE 0 : LaTeX et notations avancées ──
    // Convertit les notations LaTeX avant tout autre traitement
    let s = expr
        // \frac{a}{b} → (a)/(b)
        .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
        // \sqrt{expr} → sqrt(expr)
        .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
        // \sqrt expr (sans accolades, un seul token)
        .replace(/\\sqrt\s+(\w+)/g, 'sqrt($1)')
        // \left( et \right) → ( et )
        .replace(/\\left\s*\(/g, '(').replace(/\\right\s*\)/g, ')')
        .replace(/\\left\s*\[/g, '(').replace(/\\right\s*\]/g, ')')
        // \cdot \times → *
        .replace(/\\cdot/g, '*').replace(/\\times/g, '*')
        // \text{...} → contenu brut
        .replace(/\\text\s*\{([^}]*)\}/g, '$1')
        // Backslashes LaTeX restants (ex: \, \; \quad) → espace
        .replace(/\\[,;:!]\s*/g, ' ')
        .replace(/\\quad/g, ' ').replace(/\\qquad/g, ' ');

    // ── PASSE 1 : Normalisation Unicode et français ──
    s = s
        .replace(/²/g, '^2')              // Unicode superscript ²
        .replace(/³/g, '^3')              // Unicode superscript ³
        .replace(/⁴/g, '^4')
        .replace(/\^/g, '^')
        .replace(/×/g, '*')
        .replace(/\u00b7/g, '*')          // point médian · → *
        .replace(/÷/g, '/')
        // Racine carrée : √(expr), √expr, racine(expr), racine de expr
        .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
        .replace(/√(\w+)/g, 'sqrt($1)')
        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?\(([^)]+)\)/gi, 'sqrt($1)')
        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)')
        // Valeur absolue : |expr| → abs(expr) — seulement si pas un séparateur @@@
        .replace(/\|([^|]+)\|/g, 'abs($1)')
        .replace(/,/g, '.')              // décimale française → anglaise
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
 * 
 * Approche hybride :
 * 1. Structurelle : détecter les dénominateurs et arguments de ln/sqrt,
 *    puis trouver leurs zéros.
 * 2. Numérique (fallback) : chercher les transitions null ↔ non-null.
 * 
 * ⚠️ On NE détecte plus les "sauts énormes" car pour des fonctions
 *    à croissance rapide (e^x, x^10) le saut est naturel et non
 *    une asymptote verticale.
 */
export function findDiscontinuities(
    expr: string,
    xMin: number = -20,
    xMax: number = 20,
    steps: number = 2000
): number[] {
    const sanitized = sanitizeExpression(expr);
    const discontinuities: number[] = [];

    // ── 1. Approche structurelle : chercher les dénominateurs ──
    // Trouver la position du '/' au niveau 0 des parenthèses
    let depth = 0;
    for (let i = 0; i < sanitized.length; i++) {
        if (sanitized[i] === '(') depth++;
        else if (sanitized[i] === ')') depth--;
        else if (sanitized[i] === '/' && depth === 0) {
            // Extraire le dénominateur
            let denStart = i + 1;
            // Si le dénominateur commence par (, prendre le groupe entier
            if (sanitized[denStart] === '(') {
                let d = 1;
                let j = denStart + 1;
                while (j < sanitized.length && d > 0) {
                    if (sanitized[j] === '(') d++;
                    else if (sanitized[j] === ')') d--;
                    j++;
                }
                const den = sanitized.slice(denStart + 1, j - 1);
                // Trouver les zéros du dénominateur = discontinuités de f
                const denZeros = findZeros(den, xMin, xMax, steps);
                for (const z of denZeros) {
                    if (!discontinuities.some(d => Math.abs(d - z) < 1e-6)) {
                        discontinuities.push(z);
                    }
                }
            } else {
                // Dénominateur est un simple token (x, variable, etc.)
                const denMatch = sanitized.slice(denStart).match(/^([a-zA-Z_]\w*|\d+)/);
                if (denMatch) {
                    const den = denMatch[1];
                    const denZeros = findZeros(den, xMin, xMax, steps);
                    for (const z of denZeros) {
                        if (!discontinuities.some(d => Math.abs(d - z) < 1e-6)) {
                            discontinuities.push(z);
                        }
                    }
                }
            }
        }
    }

    // ── 2. Fallback numérique : transitions null ↔ non-null ──
    // (pour les cas structurels non détectés, ex: expressions complexes)
    const step = (xMax - xMin) / steps;
    let prevY: number | null = null;
    let prevX: number = xMin;

    for (let i = 0; i <= steps; i++) {
        const x = xMin + i * step;
        const y = evalAt(sanitized, x);

        if (prevY !== null && y === null && i > 0) {
            // Passe de défini à non-défini → discontinuité entre prevX et x
            const disc = round4((x + prevX) / 2);
            if (!discontinuities.some(d => Math.abs(d - disc) < 1e-4)) {
                discontinuities.push(disc);
            }
        } else if (prevY === null && y !== null && i > 0) {
            // Passe de non-défini à défini → discontinuité entre prevX et x
            const disc = round4((x + prevX) / 2);
            if (!discontinuities.some(d => Math.abs(d - disc) < 1e-4)) {
                discontinuities.push(disc);
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
 *
 * ⚠️ Pour les bornes infinies, on utilise des points proches de l'origine
 *    (±100) plutôt que ±1e6, car pour les fractions rationnelles la dérivée
 *    tend vers 0 à l'infini et le signe devient indétectable.
 */
export function signOnInterval(expr: string, a: number | '-inf', b: number | '+inf'): '+' | '-' | '0' | null {
    // Bornes effectives : utiliser ±100 au lieu de ±1e6 pour les infinis
    // Cela donne des valeurs plus significatives pour les quotients
    const xFrom = a === '-inf' ? -100 : (a as number) + 1e-6;
    const xTo = b === '+inf' ? 100 : (b as number) - 1e-6;
    if (xFrom >= xTo) return null;

    const mid = (xFrom + xTo) / 2;
    // Points de test variés : milieu, quartiles, et points proches des bornes finies
    const testPoints = [
        mid,
        xFrom + (xTo - xFrom) * 0.25,
        xFrom + (xTo - xFrom) * 0.75,
    ];

    // Si une borne est finie, ajouter un point très proche (signal plus fort pour les quotients)
    if (a !== '-inf') testPoints.push((a as number) + 0.01);
    if (b !== '+inf') testPoints.push((b as number) - 0.01);

    // Ajouter des points encore plus proches de l'origine si les bornes sont infinies
    if (a === '-inf' && b !== '+inf') testPoints.push((b as number) - 1);
    if (b === '+inf' && a !== '-inf') testPoints.push((a as number) + 1);

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
