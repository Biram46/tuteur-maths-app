/**
 * COUCHE 2 — TYPES MATHSPEC
 * Spécification structurée pour la communication entre :
 *   - Couche 1 (Interface AI / MathAssistant)
 *   - Couche 3 (Moteur de rendu : MathTable, MathGraph, GeometryFigure, MathTree…)
 *
 * La MathSpec est l'objet canonique qui encode UNE sortie mathématique attendue.
 * Elle est soit :
 *   a) Générée directement par l'IA dans un bloc ```mathspec … ```
 *   b) Construite par le parseur depuis un bloc @@@ existant (rétrocompatibilité)
 */

import type { NiveauLycee, DomaineMaths } from './niveaux';

// ─────────────────────────────────────────────────────────────
// TYPES DE SORTIE
// ─────────────────────────────────────────────────────────────

export type MathOutputType =
    | 'sign_table'        // Tableau de signes  → MathTable (type: sign)
    | 'variation_table'   // Tableau de variations → MathTable (type: variation)
    | 'sign_and_variation'// Les deux tableaux (signes + variations)
    | 'graph'             // Graphique cartésien → MathGraph
    | 'geometry'          // Figure géométrique → GeometryFigure
    | 'probability_tree'  // Arbre de probabilités → MathTree
    | 'interval'          // Axe intervalles → IntervalAxis
    | 'literal_calc'      // Calcul littéral SymPy → future Couche 3
    | 'derivative'        // Dérivation analytique -> Module Dérivation (Python)
    | 'explanation';      // Réponse textuelle + LaTeX uniquement

// ─────────────────────────────────────────────────────────────
// SPEC TABLEAU DE SIGNES / VARIATIONS
// ─────────────────────────────────────────────────────────────

export interface SignRow {
    label: string;         // ex: "x + 3", "f'(x)", "f(x)"
    type: 'sign';
    values: string[];      // ex: ["-", "0", "+", "+", "+"]
}

export interface VariationRow {
    label: string;         // ex: "f(x)"
    type: 'variation';
    values: string[];      // ex: ["nearrow", "2", "searrow", "-1", "nearrow"]
}

export type TableRow = SignRow | VariationRow;

export interface TableSpec {
    xValues: string[];     // ex: ["-inf", "-3", "1", "2", "+inf"]
    rows: TableRow[];
    title?: string;
}

// ─────────────────────────────────────────────────────────────
// SPEC GRAPHIQUE
// ─────────────────────────────────────────────────────────────

export interface GraphSpec {
    functions?: string[];         // ex: ["x^2 - 4", "2*x + 1"]
    points?: { x: number; y: number; label?: string; type?: 'open' | 'closed' }[];
    domain?: [number, number, number, number]; // [xmin, xmax, ymin, ymax]
    title?: string;
    hideAxes?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SPEC GÉOMÉTRIE
// ─────────────────────────────────────────────────────────────

export interface GeomPoint {
    name: string;   // "A", "B", "C"
    x: number;
    y: number;
}

export interface GeomSpec {
    type: 'geometry' | 'coordinates';
    points: GeomPoint[];
    segments?: [string, string][];   // ex: [["A","B"], ["B","C"]]
    lines?: string[][];              // ex: [["A","B"]]
    circles?: { center: string; radius: number }[];
    annotations?: {
        type: 'midpoint' | 'distance' | 'angle';
        points: string[];
        value: string | number;
    }[];
    title?: string;
}

// ─────────────────────────────────────────────────────────────
// SPEC ARBRE DE PROBABILITÉS
// ─────────────────────────────────────────────────────────────

export interface ProbTreeNode {
    id: string;
    label: string;
    parent?: string;
    probability?: string;  // ex: "0,3" ou "1/4"
}

export interface ProbTreeSpec {
    nodes: ProbTreeNode[];
    title?: string;
}

// ─────────────────────────────────────────────────────────────
// SPEC INTERVALLE
// ─────────────────────────────────────────────────────────────

export interface IntervalSpec {
    left: number | '-inf';
    right: number | '+inf';
    leftIncluded: boolean;
    rightIncluded: boolean;
    title?: string;
}

// ─────────────────────────────────────────────────────────────
// MATHSPEC PRINCIPAL (UNION TYPE)
// ─────────────────────────────────────────────────────────────

export interface MathSpecBase {
    /** Identifiant unique de la spec (généré automatiquement) */
    id?: string;

    /** Niveau scolaire cible */
    niveau: NiveauLycee;

    /** Domaine mathématique */
    domaine?: DomaineMaths;

    /** Chapitre ou concept (ex: "Dérivation", "Tableaux de signes") */
    chapitre?: string;

    /** Expression mathématique brute (ex: "(x+1)(x-3)/(x-2)") */
    expression?: string;

    /** Méthode pédagogique imposée */
    method?: string;

    /** Méthodes interdites à ce niveau */
    forbidden?: string[];
}

export interface SignTableMathSpec extends MathSpecBase {
    outputType: 'sign_table';
    tableData: TableSpec;
}

export interface VariationTableMathSpec extends MathSpecBase {
    outputType: 'variation_table';
    tableData: TableSpec;
}

export interface SignAndVariationMathSpec extends MathSpecBase {
    outputType: 'sign_and_variation';
    signTable: TableSpec;
    variationTable: TableSpec;
}

export interface GraphMathSpec extends MathSpecBase {
    outputType: 'graph';
    graphData: GraphSpec;
}

export interface GeomMathSpec extends MathSpecBase {
    outputType: 'geometry';
    geomData: GeomSpec;
}

export interface ProbTreeMathSpec extends MathSpecBase {
    outputType: 'probability_tree';
    treeData: ProbTreeSpec;
}

export interface IntervalMathSpec extends MathSpecBase {
    outputType: 'interval';
    intervalData: IntervalSpec;
}

export interface ExplanationMathSpec extends MathSpecBase {
    outputType: 'explanation';
    content: string;
}

export type MathSpec =
    | SignTableMathSpec
    | VariationTableMathSpec
    | SignAndVariationMathSpec
    | GraphMathSpec
    | GeomMathSpec
    | ProbTreeMathSpec
    | IntervalMathSpec
    | ExplanationMathSpec;

// ─────────────────────────────────────────────────────────────
// RÉSULTAT DE VALIDATION
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    errors: string[];       // Erreurs bloquantes
    warnings: string[];     // Avertissements non-bloquants
}

// ─────────────────────────────────────────────────────────────
// RÉSULTAT DU PARSING
// ─────────────────────────────────────────────────────────────

export interface ParsedMathBlock {
    raw: string;       // Texte brut du bloc extrait
    spec: MathSpec | null;
    error?: string;
}
