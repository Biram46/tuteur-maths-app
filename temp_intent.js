"use strict";
/**
 * INTENT DETECTOR — Détecteur d'intentions mathématiques
 * ════════════════════════════════════════════════════════
 * Analyse le texte d'une question de l'élève et extrait :
 * 1. Les sous-questions avec leur type d'intention mathématique
 * 2. Les expressions de fonctions à traiter
 * 3. La priorité de routing (Math Engine ou IA pure)
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTENT_LABELS = void 0;
exports.extractExpression = extractExpression;
exports.analyzeQuestion = analyzeQuestion;
// ─────────────────────────────────────────────────────────────
// PATTERNS DE DÉTECTION
// ─────────────────────────────────────────────────────────────
var INTENT_PATTERNS = [
    {
        intent: 'sign_table',
        patterns: [
            /étudi(?:er|ons|ez)\s+le\s+signe/i,
            /tableau\s+de\s+signes?/i,
            /dresser\s+le\s+tableau\s+de\s+signes?/i,
            /signe\s+de\s+[fg]/i,
            /étude\s+(?:du|des)\s+signe/i,
            /analyse\s+(?:du|des)\s+signe/i,
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
        ],
    },
    {
        intent: 'graph',
        patterns: [
            /trac(?:er|ez|ons)\s+(?:la courbe|le graphe|la représentation)/i,
            /représentation\s+graphique/i,
            /courbe\s+représentative/i,
            /graphe\s+de\s+[fg]/i,
            /esquiss(?:er|ez)\s+(?:la courbe|le graphe)/i,
            /construi(?:re|re)\s+(?:la courbe|le graphe)/i,
        ],
    },
    {
        intent: 'solve_inequality',
        patterns: [
            /résou(?:dre|ds)\s+.*[fg]\s*[><≤≥]/i,
            /résou(?:dre|ds)\s+l['']inéquation/i,
            /[fg]\s*\([^)]*\)\s*[><≤≥]\s*0/i,
            /solution[s]?\s+de\s+.*[><≤≥]/i,
            /[fg]\s*[><≤≥]\s*0/i,
            /inéquation/i,
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
            /limit(?:e|es)\s+en/i,
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
];
// ─────────────────────────────────────────────────────────────
// EXTRACTION D'EXPRESSION DE FONCTION
// ─────────────────────────────────────────────────────────────
/**
 * Extrait l'expression mathématique d'une chaîne.
 * Exemple: "f(x) = (x-3)/(x+2)" → "(x-3)/(x+2)"
 *          "g(x) = 2x² - 3x + 1" → "2x^2 - 3x + 1"
 */
function extractExpression(text) {
    // Normaliser les exposants unicode
    var normalized = text
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/⁴/g, '^4')
        .replace(/−/g, '-')
        .replace(/×/g, '*')
        .replace(/\u00d7/g, '*');
    // Pattern 1 : f(x) = <expression>
    var funcPattern = /[fg]\s*\([^)]*\)\s*=\s*([^,;.\n\r]+)/i;
    var m1 = normalized.match(funcPattern);
    if (m1)
        return m1[1].trim();
    // Pattern 2 : = <fraction> ou = <polynome>
    var eqPattern = /=\s*([-+*/^()\w\s.]+)/;
    var m2 = normalized.match(eqPattern);
    if (m2) {
        var candidate = m2[1].trim();
        // Filtre les faux positifs trop courts et sans x
        if (candidate.includes('x') && candidate.length > 2)
            return candidate;
    }
    // Pattern 3 : expression libre avec x dans le texte
    var exprPattern = /\(([^)]*x[^)]*)\)\s*\/\s*\(/;
    var m3 = normalized.match(exprPattern);
    if (m3)
        return "(".concat(m3[0].trim(), ")");
    return null;
}
/**
 * Extrait les contextes d'inégalité (ex: "> 0", "≤ 0").
 */
function extractInequalityContext(text) {
    var m = text.match(/[fg]\s*(?:\([^)]*\))?\s*([><≤≥]=?\s*[0-9\s]+)/i);
    return m ? m[1].trim() : null;
}
// ─────────────────────────────────────────────────────────────
// DÉTECTEUR DE SOUS-QUESTIONS
// ─────────────────────────────────────────────────────────────
/**
 * Découpe un texte multi-questions en sous-questions numérotées.
 */
function splitIntoSubquestions(text) {
    var _a, _b, _c, _d;
    var parts = [];
    // Pattern : 1) / 1. / a) / a. / Q1: etc.
    var splitPattern = /(?:^|\n)\s*(?:(\d+|[a-zA-Z])\s*[).:\-]\s*)/gm;
    var matches = __spreadArray([], text.matchAll(splitPattern), true);
    if (matches.length <= 1) {
        // Pas de numérotation détectée : texte unique
        return [{ num: '', text: text.trim() }];
    }
    for (var i = 0; i < matches.length; i++) {
        var match = matches[i];
        var start = ((_a = match.index) !== null && _a !== void 0 ? _a : 0) + match[0].length;
        var end = (_c = (_b = matches[i + 1]) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : text.length;
        var num = (_d = match[1]) !== null && _d !== void 0 ? _d : "".concat(i + 1);
        var subText = text.slice(start, end).trim();
        if (subText)
            parts.push({ num: num, text: subText });
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
function analyzeQuestion(userMessage, niveau) {
    var _a;
    if (niveau === void 0) { niveau = 'seconde'; }
    var intents = [];
    var globalExpression = extractExpression(userMessage);
    var subquestions = splitIntoSubquestions(userMessage);
    var _loop_1 = function (sub) {
        var detected = false;
        for (var _b = 0, INTENT_PATTERNS_1 = INTENT_PATTERNS; _b < INTENT_PATTERNS_1.length; _b++) {
            var _c = INTENT_PATTERNS_1[_b], intent = _c.intent, patterns = _c.patterns;
            if (patterns.some(function (p) { return p.test(sub.text); })) {
                // Chercher l'expression dans la sous-question d'abord, puis global
                var localExpr = extractExpression(sub.text);
                var expr = localExpr !== null && localExpr !== void 0 ? localExpr : globalExpression;
                var context = intent === 'solve_inequality'
                    ? extractInequalityContext(sub.text)
                    : undefined;
                intents.push({
                    intent: intent,
                    questionText: sub.text,
                    expression: expr,
                    questionNumber: sub.num || undefined,
                    variable: 'x',
                    context: context !== null && context !== void 0 ? context : undefined,
                });
                detected = true;
                break; // Une seule intention par sous-question
            }
        }
        if (!detected && sub.text.length > 10) {
            intents.push({
                intent: 'unknown',
                questionText: sub.text,
                expression: (_a = extractExpression(sub.text)) !== null && _a !== void 0 ? _a : globalExpression,
                questionNumber: sub.num || undefined,
                variable: 'x',
            });
        }
    };
    for (var _i = 0, subquestions_1 = subquestions; _i < subquestions_1.length; _i++) {
        var sub = subquestions_1[_i];
        _loop_1(sub);
    }
    return {
        intents: intents,
        globalExpression: globalExpression,
        hasMathEngine: intents.some(function (i) { return i.intent !== 'unknown'; }),
        niveau: niveau,
    };
}
// ─────────────────────────────────────────────────────────────
// UTILITAIRES D'AFFICHAGE
// ─────────────────────────────────────────────────────────────
exports.INTENT_LABELS = {
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
    unknown: '💬 Réponse IA',
};
