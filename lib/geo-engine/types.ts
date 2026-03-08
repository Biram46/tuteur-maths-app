/**
 * ═══════════════════════════════════════════════════════════════════
 * TYPES & PROTOCOLE AI — lib/geo-engine/types.ts
 * Interface de programmation pilotable par mimimaths@ai
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── Objets géométriques ─────────────────────────────────────────────────────

export interface GeoPoint {
    kind: 'point';
    id: string;
    x: number;  // coordonnées réelles (affichage)
    y: number;
    label?: string;
    color?: string;
    style?: 'cross' | 'dot' | 'none';  // EN France: croix par défaut
    fixed?: boolean; // point libre ou contraint
}

export interface GeoSegment {
    kind: 'segment';
    id: string;
    from: string;           // id du point A
    to: string;             // id du point B
    label?: string;         // ex: "[AB]" — affiché au milieu
    color?: string;
    dashed?: boolean;
    showTicks?: number;     // petits traits pour marquer l'égalité
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export interface GeoLine {
    kind: 'line';
    id: string;
    type: 'line' | 'ray' | 'segment';  // droite | demi-droite | segment
    through: [string, string];          // 2 points qui définissent la direction
    label?: string;                     // ex: "(d)" ou "(AB)"
    color?: string;
    style?: LineStyle;
}

export interface GeoCircle {
    kind: 'circle';
    id: string;
    center: string;         // id du point centre
    radiusPoint?: string;   // id d'un point sur le cercle (rayon exact)
    radiusValue?: number;   // rayon numérique (si pas de point)
    label?: string;
    color?: string;
}

export interface GeoPolygon {
    kind: 'polygon';
    id: string;
    vertices: string[];     // ids des points dans l'ordre
    label?: string;
    fillColor?: string;
    strokeColor?: string;
    polyType?: 'triangle' | 'rectangle' | 'square' | 'rhombus' | 'generic';
}

export interface GeoAngle {
    kind: 'angle';
    id: string;
    vertex: string;         // point sommet
    from: string;           // premier bras
    to: string;             // deuxième bras
    label?: string;         // ex: "60°" ou "\\frac{\\pi}{3}"
    value?: number;         // en degrés
    color?: string;
    square?: boolean;       // droit → affiche le carré
}

export interface GeoVector {
    kind: 'vector';
    id: string;
    from: string;           // point origine
    to: string;             // point extrémité
    label?: string;         // ex: "\\vec{u}"
    color?: string;
}

export interface GeoLabel {
    kind: 'label';
    id: string;
    text: string;           // LaTeX ou texte
    x: number;
    y: number;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
}

export type GeoObject = GeoPoint | GeoSegment | GeoLine | GeoCircle | GeoPolygon | GeoAngle | GeoVector | GeoLabel;

// ─── Scène ───────────────────────────────────────────────────────────────────

export type RepereType = 'orthonormal' | 'orthogonal' | 'none';

export interface GeoScene {
    objects: GeoObject[];
    domain?: { x: [number, number]; y: [number, number] };
    repere?: RepereType;
    title?: string;
    showGrid?: boolean;
    showSteps?: boolean;
    /** Résultats calculés (affichés dans le panneau info) */
    computed?: ComputedResult[];
}

export interface ComputedResult {
    label: string;      // ex: "AB ="
    latex: string;      // valeur exacte LaTeX
    approx?: string;    // valeur approchée
}

// ─── Protocole de commande AI ─────────────────────────────────────────────────
/**
 * Format @@@...@@@ étendu pour les figures géométriques.
 * L'IA génère une chaîne parsée par parseGeoScene().
 *
 * Exemple de bloc @@@:
 *   geo |
 *   title: Triangle ABC |
 *   repère: orthonormal |
 *   point: A, 0, 0 |
 *   point: B, 4, 0 |
 *   point: C, 2, 3 |
 *   segment: AB |
 *   segment: BC |
 *   segment: AC |
 *   angle: A, B, C, label: 90° |
 *   compute: distance AB
 */

export interface GeoCommand {
    cmd: string;
    args: string[];
}

// NOTE : L'interface GeometryFigureProps est définie directement dans
// GeometryFigure.tsx avec { scene: GeoScene } comme seule prop.
// L'ancien Mode 1 legacy (points?, segments?, etc.) a été supprimé
// car plus aucun composant ne l'utilise.
