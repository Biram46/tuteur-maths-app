/**
 * ORCHESTRATEUR PÉDAGOGIQUE — mimmaths@ai ↔ SymPy
 * =================================================
 * Ce module est le CHEF D'ORCHESTRE du protocole synchrone.
 *
 * Responsabilités :
 * 1. CLASSIFIER  : identifier le type de fonction (affine, référence, degré 2, général)
 * 2. ROUTER      : choisir la méthode pédagogique selon type × niveau
 * 3. ENRICHIR    : construire le contexte SymPy injecté dans le prompt IA
 * 4. PROTÉGER    : bloquer les méthodes hors-programme selon le niveau
 *
 * Workflow de synchronisation :
 *   Expression + Niveau
 *       ↓
 *   classifyFunction()          ← type de fonction
 *       ↓
 *   buildPedagogicalContext()   ← appel SymPy + règles BO
 *       ↓
 *   buildAIPromptContext()      ← texte injecté dans le prompt IA
 *       ↓
 *   mimmaths@ai répond avec les contraintes exactes
 */

import type { NiveauLycee } from '@/lib/niveaux';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

/** Classification du type de fonction — détermine la méthode pédagogique */
export type FunctionClass =
    | 'affine'          // ax + b  → signe de a, PAS de dérivée
    | 'reference_x2'    // x²      → forme canonique, sommet
    | 'reference_inv'   // 1/x     → valeur interdite en 0, propriétés cours
    | 'reference_sqrt'  // √x      → domaine [0;+∞[, croissante
    | 'reference_cube'  // x³      → impaire, croissante sur ℝ
    | 'degree2'         // ax²+bx+c général → Δ obligatoire, forme canonique
    | 'rational'        // P(x)/Q(x) avec Q non constant → dérivée + valeurs interdites
    | 'transcendental'  // exp, ln, sin, cos → dérivée
    | 'general';        // Autre → f'(x) et son signe

/** Méthode pédagogique à appliquer selon classe × niveau */
export type PedagogicalMethod =
    | 'sign_of_a'                // Affine : signe de a, pas de dérivée
    | 'reference_properties'     // Fonctions de référence : propriétés de cours
    | 'canonical_form'           // Degré 2 : forme canonique + Δ + sommet (α;β)
    | 'derivative_sign'          // Général : f'(x) et son signe
    | 'forbidden_degree';        // Niveau insuffisant pour cette méthode

/** Résultat de la classification */
export interface FunctionAnalysis {
    expression: string;
    classe: FunctionClass;
    method: PedagogicalMethod;
    niveau: NiveauLycee;
    blocked: boolean;           // Méthode bloquée par le niveau
    blockReason?: string;       // Explication si bloqué
}

/** Contexte pédagogique complet à injecter dans le prompt IA */
export interface PedagogicalContext {
    analysis: FunctionAnalysis;

    // Données SymPy brutes (undefined si non applicable)
    sympyData?: {
        factors?: { label: string; type: string }[];
        discriminantSteps?: { factor: string; steps: string[] }[];
        canonicalForm?: {
            alpha: string;      // LaTeX de α = -b/(2a)
            beta: string;       // LaTeX de β = f(α)
            a: string;          // Coefficient a en LaTeX
            label: string;      // ex: "f(x) = 2(x - 3)² - 1"
        };
        limits?: {              // Uniquement si niveau Terminale
            atPlusInf?: string; // LaTeX de la limite en +∞
            atMinusInf?: string;
            atForbidden?: { x: string; left?: string; right?: string }[];
        };
        derivative?: string;    // f'(x) en LaTeX
        zeros?: string[];       // Racines formatées
        forbiddenValues?: string[]; // Valeurs interdites
    };

    // Texte à injecter directement dans le prompt IA
    promptInjection: string;
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATEUR DE FONCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Classifie une expression mathématique.
 * Opère sur la forme nettoyée (après sanitizeExpression).
 *
 * Ordre de test crucial : du plus spécifique au plus général.
 */
export function classifyFunction(expression: string): FunctionClass {
    // Normaliser pour la classification
    const e = expression
        .trim()
        .replace(/\s+/g, '')
        .replace(/\*\*/g, '^');

    // ── Fonctions de référence exactes ──────────────────────
    // x³ exact (ou -x³)
    if (/^-?x\^3$/.test(e)) return 'reference_cube';

    // x² exact (ou -x², 2x², -2x², etc. SANS terme de degré 1 ni constante)
    if (/^-?\d*\.?\d*x\^2$/.test(e)) return 'reference_x2';

    // 1/x exact
    if (/^1\/x$/.test(e) || /^x\^-1$/.test(e)) return 'reference_inv';

    // √x exact
    if (/^sqrt\(x\)$/.test(e) || /^√x$/.test(e)) return 'reference_sqrt';

    // ── Fonctions transcendantes ─────────────────────────────
    if (/\b(exp|log|sin|cos|tan|asin|acos|atan)\b/.test(e) ||
        /e\^/.test(e)) return 'transcendental';

    // ── Fonction affine ax + b ────────────────────────────────
    // Doit être de la forme exacte : coefficient × x ± constante
    // Pas de x², pas de x³, pas de division, pas de racine
    // Accepte les formes : 2*x+3, -3*x, 0.5*x-1, x+5, -x, etc.
    if (!e.includes('^') && !e.includes('/') && !e.includes('sqrt') &&
        !e.includes('exp') && !e.includes('log') &&
        /^-?\d*\.?\d*\*?x([+-]\d+\.?\d*)?$/.test(e)) return 'affine';

    // Forme "ax" pure (avec ou sans *)
    if (/^-?\d*\.?\d*\*?x$/.test(e) && !e.includes('^')) return 'affine';

    // Forme "b" (constante pure — pas de x)
    if (!e.includes('x')) return 'affine';

    // ── Degré 2 (ax² + bx + c) ──────────────────────────────
    // Polynôme de degré exactement 2, sans fraction ni transcendant
    if (!e.includes('/') && !e.includes('sqrt') &&
        !e.includes('exp') && !e.includes('log') &&
        /x\^2/.test(e) && !/x\^[3-9]/.test(e)) return 'degree2';

    // ── Fraction rationnelle ─────────────────────────────────
    if (e.includes('/')) return 'rational';

    // ── Général ─────────────────────────────────────────────
    if (/x\^[3-9]/.test(e) || /x\^\d{2,}/.test(e)) return 'general';

    return 'general';
}

// ─────────────────────────────────────────────────────────────
// SÉLECTION DE LA MÉTHODE PÉDAGOGIQUE
// ─────────────────────────────────────────────────────────────

/**
 * Sélectionne la méthode pédagogique correcte selon le Programme BO.
 *
 * Matrice classe × niveau → méthode :
 *
 * | Classe          | Seconde      | 1ère Spé        | Terminale       |
 * |-----------------|--------------|-----------------|-----------------|
 * | affine          | sign_of_a    | sign_of_a       | sign_of_a       |
 * | reference_*     | ref_props    | ref_props       | ref_props       |
 * | degree2         | BLOCKED*     | canonical_form  | canonical_form  |
 * | rational        | BLOCKED      | derivative_sign | derivative_sign |
 * | transcendental  | BLOCKED      | BLOCKED         | derivative_sign |
 * | general         | BLOCKED      | derivative_sign | derivative_sign |
 *
 * (*) Les polynômes du second degré NE SONT PLUS au programme de Seconde (BO 2025)
 */
export function selectMethod(
    classe: FunctionClass,
    niveau: NiveauLycee
): { method: PedagogicalMethod; blocked: boolean; blockReason?: string } {

    const isSeconde = niveau === 'seconde' || niveau === 'seconde_sthr';
    const isPremiereComm = niveau === 'premiere_commune';
    const isPremiereTechno = niveau === 'premiere_techno';
    const isPremiereSpe = niveau === 'premiere_spe';
    // Pour les transcendantes, Première Spé est aussi bloquée (exp/ln hors programme)
    const isPremiereOrBelowForTranscendental = isSeconde || isPremiereComm || isPremiereTechno || isPremiereSpe;
    // Pour les autres types (rational, general) : 1ère spé est autorisée
    const isPremiereOrBelow = isSeconde || isPremiereComm || isPremiereTechno;
    const isTerminale = niveau.startsWith('terminale');
    const isTermianaleSci = niveau === 'terminale_spe' || niveau === 'terminale_expert' || niveau === 'terminale_comp';

    switch (classe) {
        case 'affine':
            return { method: 'sign_of_a', blocked: false };

        case 'reference_x2':
        case 'reference_inv':
        case 'reference_sqrt':
        case 'reference_cube':
            return { method: 'reference_properties', blocked: false };

        case 'degree2':
            if (isSeconde) {
                return {
                    method: 'forbidden_degree',
                    blocked: true,
                    blockReason: '⛔ Les polynômes de degré 2 ne sont PLUS au programme de Seconde (BO 2025). Utilise uniquement les fonctions de référence.',
                };
            }
            // 1ère et Terminale : forme canonique + Δ (JAMAIS la dérivée pour un trinôme)
            return { method: 'canonical_form', blocked: false };

        case 'rational':
            if (isSeconde) {
                return {
                    method: 'forbidden_degree',
                    blocked: true,
                    blockReason: '⛔ Les fonctions rationnelles complexes ne sont pas au programme de Seconde.',
                };
            }
            return { method: 'derivative_sign', blocked: false };

        case 'transcendental':
            if (isPremiereOrBelowForTranscendental) {
                return {
                    method: 'forbidden_degree',
                    blocked: true,
                    blockReason: `⛔ Les fonctions exp/ln/trig ne sont pas au programme de ${isSeconde ? 'Seconde' : isPremiereSpe ? 'Première Spécialité' : 'Première'}.`,
                };
            }
            return { method: 'derivative_sign', blocked: false };

        case 'general':
            if (isSeconde) {
                return {
                    method: 'forbidden_degree',
                    blocked: true,
                    blockReason: '⛔ Les polynômes de degré ≥ 3 ne sont pas au programme de Seconde.',
                };
            }
            return { method: 'derivative_sign', blocked: false };
    }
}

// ─────────────────────────────────────────────────────────────
// CONSTRUCTEUR DU CONTEXTE PÉDAGOGIQUE
// ─────────────────────────────────────────────────────────────

/**
 * Construit le contexte pédagogique complet depuis les données SymPy.
 *
 * À appeler APRÈS l'appel à /api/math-engine (qui appelle SymPy).
 * Transforme les données brutes SymPy en texte d'instruction pour l'IA.
 */
export function buildPedagogicalContext(
    expression: string,
    niveau: NiveauLycee,
    sympyResponse?: Record<string, any> // Réponse brute de /api/math-engine
): PedagogicalContext {
    const classe = classifyFunction(expression);
    const { method, blocked, blockReason } = selectMethod(classe, niveau);
    const isTerminaleSci = niveau === 'terminale_spe' || niveau === 'terminale_expert' || niveau === 'terminale_comp';
    const isTerminaleStmg = niveau === 'terminale_techno';

    const analysis: FunctionAnalysis = {
        expression,
        classe,
        method,
        niveau,
        blocked,
        blockReason,
    };

    // Extraire les données SymPy pertinentes
    const sympyData: PedagogicalContext['sympyData'] = sympyResponse ? {
        factors: sympyResponse.factors?.map((f: any) => ({
            label: f.label,
            type: f.type ?? (f.degree === 1 ? 'linear' : f.degree === 2 ? 'quadratic' : 'poly'),
        })),
        discriminantSteps: sympyResponse.discriminantSteps,
        canonicalForm: sympyResponse.canonicalForm,
        limits: (isTerminaleSci || isTerminaleStmg) ? sympyResponse.limits : undefined,
        derivative: sympyResponse.derivative,
        zeros: sympyResponse.numZeros,
        forbiddenValues: sympyResponse.denZeros,
    } : undefined;

    const promptInjection = buildPromptInjection(analysis, sympyData);

    return { analysis, sympyData, promptInjection };
}

// ─────────────────────────────────────────────────────────────
// GÉNÉRATEUR DE PROMPT
// ─────────────────────────────────────────────────────────────

/**
 * Construit le texte d'injection dans le prompt IA.
 * C'est le "langage commun" entre SymPy et mimmaths@ai.
 *
 * Format :
 * ┌─ ORCHESTRATEUR PÉDAGOGIQUE ───────────────────────────────
 * │  Niveau : Première Spécialité
 * │  Type   : Polynôme du 2nd degré
 * │  Méthode: Forme canonique + sommet (α ; β)
 * │  ─────────────────────────────────────────────────
 * │  📐 Données SymPy exactes :
 * │  • Forme canonique : f(x) = 2(x - 3)² - 1
 * │  • Sommet : (3 ; -1)
 * │  • Δ = b² - 4ac = ...
 * │  ─────────────────────────────────────────────────
 * │  ⛔ INTERDICTIONS pour ce niveau × type :
 * │  • NE PAS calculer la dérivée (trinôme → forme canonique obligatoire)
 * │  • NE PAS calculer de limites en ±∞ (hors programme)
 * └───────────────────────────────────────────────────────────
 */
function buildPromptInjection(
    analysis: FunctionAnalysis,
    sympyData?: PedagogicalContext['sympyData']
): string {
    const lines: string[] = [];

    // ── En-tête ─────────────────────────────────────────────
    lines.push('┌─ ORCHESTRATEUR PÉDAGOGIQUE (synchronisation SymPy × mimmaths@ai) ─');
    lines.push(`│  Niveau  : ${formatNiveau(analysis.niveau)}`);
    lines.push(`│  Type    : ${formatClasse(analysis.classe)}`);
    lines.push(`│  Méthode : ${formatMethod(analysis.method)}`);

    // ── Blocage niveau ──────────────────────────────────────
    if (analysis.blocked) {
        lines.push('│');
        lines.push(`│  ${analysis.blockReason}`);
        lines.push('└──────────────────────────────────────────────────────────────');
        return lines.join('\n');
    }

    // ── Données SymPy exactes ────────────────────────────────
    if (sympyData) {
        lines.push('│  ───────────────────────────────────────────────────────────');
        lines.push('│  📐 Données SymPy EXACTES (utilise ces valeurs, ne les recalcule PAS) :');

        // Forme canonique (degré 2)
        if (sympyData.canonicalForm) {
            const cf = sympyData.canonicalForm;
            lines.push(`│  • Forme canonique : ${cf.label}`);
            lines.push(`│  • Sommet S : $(\\alpha ; \\beta) = (${cf.alpha} ; ${cf.beta})$`);
            lines.push(`│  • Coefficient $a = ${cf.a}$`);
            if (parseFloat(cf.a) > 0) {
                lines.push('│  • Sens : parabole "ouverte vers le haut" → minimum en $\\beta$');
            } else {
                lines.push('│  • Sens : parabole "ouverte vers le bas" → maximum en $\\beta$');
            }
        }

        // Discriminant steps (pour les trinômes non-écrits sous forme canonique)
        if (sympyData.discriminantSteps?.length) {
            lines.push('│');
            lines.push('│  📊 Étapes Δ (calcul exact par SymPy) :');
            for (const ds of sympyData.discriminantSteps) {
                lines.push(`│  ▸ ${ds.factor} :`);
                for (const step of ds.steps) {
                    lines.push(`│    ${step}`);
                }
            }
        }

        // Factorisation
        if (sympyData.factors?.length) {
            const numF = sympyData.factors.filter((f: any) => f.type !== 'denominator');
            const denF = sympyData.factors.filter((f: any) => f.type === 'denominator');
            if (numF.length > 0) {
                lines.push(`│  • Factorisation : $f(x) = ${numF.map((f: any) => `(${f.label})`).join(' \\times ')}$`);
            }
            if (denF.length > 0) {
                lines.push(`│  • Dénominateur : $${denF.map((f: any) => `(${f.label})`).join(' \\times ')}$`);
            }
        }

        // Valeurs critiques
        if (sympyData.zeros?.length) {
            lines.push(`│  • Racines : $x = ${sympyData.zeros.join(' \\text{ ; } ')}$`);
        }
        if (sympyData.forbiddenValues?.length) {
            lines.push(`│  • Valeurs interdites : $x = ${sympyData.forbiddenValues.join(' \\text{ ; } ')}$`);
        }

        // Limites (Terminale uniquement — déjà filtré par buildPedagogicalContext)
        if (sympyData.limits) {
            lines.push('│');
            lines.push('│  📊 Limites (à intégrer au tableau) :');
            if (sympyData.limits.atMinusInf)
                lines.push(`│  • $\\lim_{x \\to -\\infty} f(x) = ${sympyData.limits.atMinusInf}$`);
            if (sympyData.limits.atPlusInf)
                lines.push(`│  • $\\lim_{x \\to +\\infty} f(x) = ${sympyData.limits.atPlusInf}$`);
            if (sympyData.limits.atForbidden?.length) {
                for (const lim of sympyData.limits.atForbidden) {
                    if (lim.left) lines.push(`│  • $\\lim_{x \\to ${lim.x}^-} f(x) = ${lim.left}$`);
                    if (lim.right) lines.push(`│  • $\\lim_{x \\to ${lim.x}^+} f(x) = ${lim.right}$`);
                }
            }
        }
    }

    // ── Règles de la méthode ────────────────────────────────
    lines.push('│  ───────────────────────────────────────────────────────────');
    lines.push('│  ⚙️ PROTO­COLE OBLIGATOIRE pour ce type × niveau :');

    const rules = getMethodRules(analysis.method, analysis.classe, analysis.niveau);
    for (const rule of rules.required) {
        lines.push(`│  ✅ ${rule}`);
    }
    for (const rule of rules.forbidden) {
        lines.push(`│  ⛔ ${rule}`);
    }

    // ── Barrière des limites ────────────────────────────────
    const limitsBarrier = getLimitsBarrier(analysis.niveau);
    if (limitsBarrier) {
        lines.push('│');
        lines.push(`│  🚧 BARRIÈRE LIMITES : ${limitsBarrier}`);
    }

    lines.push('└──────────────────────────────────────────────────────────────');

    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// RÈGLES PAR MÉTHODE
// ─────────────────────────────────────────────────────────────

function getMethodRules(
    method: PedagogicalMethod,
    classe: FunctionClass,
    niveau: NiveauLycee
): { required: string[]; forbidden: string[] } {
    switch (method) {
        case 'sign_of_a':
            return {
                required: [
                    'Identifier le coefficient $a$ devant $x$',
                    'Si $a > 0$ : écrire "f est strictement croissante sur $\\mathbb{R}$"',
                    'Si $a < 0$ : écrire "f est strictement décroissante sur $\\mathbb{R}$"',
                    'Si $a = 0$ : écrire "f est constante"',
                    'Pour le signe : lire directement le signe de $a$',
                ],
                forbidden: [
                    'NE PAS calculer $f\'(x)$ — la dérivée est INTERDITE pour les affines',
                    'NE PAS construire un tableau de signes de $f\'(x)$',
                ],
            };

        case 'reference_properties':
            return {
                required: [
                    ...getReferenceProperties(classe, niveau),
                    'Appliquer directement les propriétés de cours, SANS démonstration par la dérivée',
                    'Énoncer : "D\'après le cours, la fonction ... est ..."',
                ],
                forbidden: [
                    `NE PAS calculer $f'(x)$ sauf si l'élève le demande explicitement`,
                    'NE PAS refaire la démonstration des propriétés de cours',
                ],
            };

        case 'canonical_form':
            return {
                required: [
                    'OBLIGATOIRE : mettre sous forme canonique $f(x) = a(x - \\alpha)^2 + \\beta$',
                    'Calculer $\\alpha = \\dfrac{-b}{2a}$ et $\\beta = f(\\alpha)$',
                    'Identifier le sommet $S(\\alpha ; \\beta)$',
                    'Lire le signe de $a$ pour déterminer min/max',
                    'Dresser le tableau de variations AVEC le sommet, SANS ligne $f\'(x)$',
                    'Si demandé : calculer $\\Delta = b^2 - 4ac$ pour les racines',
                ],
                forbidden: [
                    '⛔ NE PAS utiliser la dérivée $f\'(x)$ pour étudier les variations (hors programme pour le 2nd degré en 1ère)',
                    '⛔ NE PAS calculer de limites en $\\pm\\infty$ (hors programme Première)',
                ],
            };

        case 'derivative_sign':
            return {
                required: [
                    'Calculer $f\'(x)$ en utilisant les formules de dérivation du programme',
                    'Résoudre $f\'(x) = 0$ pour trouver les valeurs critiques',
                    'Étudier le signe de $f\'(x)$ sur chaque intervalle',
                    'Utiliser UNIQUEMENT la notation $f\'(x)$ (Lagrange) — JAMAIS $df/dx$',
                    'Dresser le tableau de variations avec la ligne $f\'(x)$',
                ],
                forbidden: [
                    '⛔ JAMAIS écrire $\\dfrac{d}{dx}$, $\\dfrac{df}{dx}$, $\\dfrac{dy}{dx}$ (HORS PROGRAMME)',
                    ...(niveau === 'premiere_spe' ? [
                        '⛔ NE PAS calculer de limites en $\\pm\\infty$ (hors programme Première Spé)',
                        '⛔ NE PAS écrire "tend vers", "a pour limite", "asymptote"',
                    ] : []),
                ],
            };

        default:
            return { required: [], forbidden: [] };
    }
}

function getReferenceProperties(classe: FunctionClass, niveau: NiveauLycee): string[] {
    switch (classe) {
        case 'reference_x2':
            return [
                'Domaine de définition : $\\mathbb{R}$',
                'Parité : fonction paire ($f(-x) = f(x)$), symétrique par rapport à $Oy$',
                'Minimum en $x = 0$ : $f(0) = 0$',
                'Décroissante sur $]-\\infty ; 0]$, croissante sur $[0 ; +\\infty[$',
            ];
        case 'reference_inv':
            return [
                'Domaine de définition : $\\mathbb{R} \\setminus \\{0\\}$',
                'Parité : fonction impaire ($f(-x) = -f(x)$), symétrique par rapport à $O$',
                'Strictement décroissante sur $]-\\infty ; 0[$ et $]0 ; +\\infty[$',
                'Valeur interdite : $x = 0$ (dénominateur nul)',
            ];
        case 'reference_sqrt':
            return [
                'Domaine de définition : $[0 ; +\\infty[$',
                'Strictement croissante sur $[0 ; +\\infty[$',
                '$f(0) = 0$, $f(1) = 1$, $f(4) = 2$',
            ];
        case 'reference_cube':
            return [
                'Domaine de définition : $\\mathbb{R}$',
                'Parité : fonction impaire ($f(-x) = -f(x)$), symétrique par rapport à $O$',
                'Strictement croissante sur $\\mathbb{R}$',
            ];
        default:
            return [];
    }
}

// ─────────────────────────────────────────────────────────────
// BARRIÈRE DES LIMITES
// ─────────────────────────────────────────────────────────────

/**
 * Retourne le message de barrière pour les limites selon le niveau.
 * null = pas de barrière (Terminale Scientifique).
 */
function getLimitsBarrier(niveau: NiveauLycee): string | null {
    if (niveau === 'seconde' || niveau === 'seconde_sthr') {
        return 'BLOQUÉ — Les tableaux s\'arrêtent aux bornes. PAS de limites ni d\'infini calculé.';
    }
    if (niveau === 'premiere_commune' || niveau === 'premiere_spe' ||
        niveau === 'premiere_techno') {
        return 'BLOQUÉ — INTERDICTION ABSOLUE de calculer des limites en ±∞. ' +
            'Utiliser uniquement le symbole ±∞ sans calcul. ' +
            'NE JAMAIS écrire "lim(x→±∞)", "tend vers", "asymptote".';
    }
    if (niveau === 'terminale_techno') {
        return 'PARTIEL — Limites simples autorisées (polynômes). Pas de limites composées ni d\'équivalents.';
    }
    // Terminale Spe / Expert / Comp : toutes les limites autorisées
    return null;
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES D'AFFICHAGE
// ─────────────────────────────────────────────────────────────

function formatNiveau(niveau: NiveauLycee): string {
    const labels: Record<NiveauLycee, string> = {
        'seconde': 'Seconde',
        'seconde_sthr': 'Seconde STHR',
        'premiere_commune': 'Première (tronc commun)',
        'premiere_spe': 'Première Spécialité Maths',
        'premiere_techno': 'Première Techno (STMG/STI2D)',
        'terminale_spe': 'Terminale Spécialité Maths',
        'terminale_expert': 'Terminale Maths Expertes',
        'terminale_comp': 'Terminale Complémentaire',
        'terminale_techno': 'Terminale STMG/STI2D',
    };
    return labels[niveau] ?? niveau;
}

function formatClasse(classe: FunctionClass): string {
    const labels: Record<FunctionClass, string> = {
        'affine': 'Fonction affine (ax + b)',
        'reference_x2': 'Fonction de référence : x²',
        'reference_inv': 'Fonction de référence : 1/x',
        'reference_sqrt': 'Fonction de référence : √x',
        'reference_cube': 'Fonction de référence : x³',
        'degree2': 'Polynôme du second degré (ax² + bx + c)',
        'rational': 'Fonction rationnelle (P(x)/Q(x))',
        'transcendental': 'Fonction transcendante (exp, ln, trig)',
        'general': 'Polynôme de degré ≥ 3 ou fonction générale',
    };
    return labels[classe] ?? classe;
}

function formatMethod(method: PedagogicalMethod): string {
    const labels: Record<PedagogicalMethod, string> = {
        'sign_of_a': 'Signe du coefficient directeur a (SANS dérivée)',
        'reference_properties': 'Propriétés de cours (fonctions de référence)',
        'canonical_form': 'Forme canonique + sommet (α ; β) + Δ',
        'derivative_sign': 'Dérivée f\'(x) et étude de son signe',
        'forbidden_degree': '⛔ Méthode BLOQUÉE (hors programme pour ce niveau)',
    };
    return labels[method] ?? method;
}
