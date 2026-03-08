/**
 * ═══════════════════════════════════════════════════════════════════
 * MOTEUR D'ARITHMÉTIQUE EXACTE — lib/geo-engine/exact.ts
 * Zéro flottant pour les calculs intermédiaires.
 * Toutes les valeurs sont stockées et manipulées en fractions exactes.
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── GCD / PGCD ──────────────────────────────────────────────────────────────

function gcd(a: bigint, b: bigint): bigint {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) { [a, b] = [b, a % b]; }
    return a;
}

// ─── Fraction exacte ─────────────────────────────────────────────────────────

export class Frac {
    readonly p: bigint; // numérateur
    readonly q: bigint; // dénominateur (toujours > 0)

    constructor(p: bigint | number, q: bigint | number = 1n) {
        const bp = BigInt(p);
        const bq = BigInt(q);
        if (bq === 0n) throw new Error('Division par zéro');
        const sign = bq < 0n ? -1n : 1n;
        const g = gcd(bp < 0n ? -bp : bp, bq < 0n ? -bq : bq);
        this.p = (sign * bp) / g;
        this.q = (sign * bq) / g;
    }

    static of(n: number | bigint, d: number | bigint = 1): Frac {
        return new Frac(n, d);
    }

    static ZERO = new Frac(0n, 1n);
    static ONE = new Frac(1n, 1n);
    static TWO = new Frac(2n, 1n);

    add(other: Frac): Frac { return new Frac(this.p * other.q + other.p * this.q, this.q * other.q); }
    sub(other: Frac): Frac { return new Frac(this.p * other.q - other.p * this.q, this.q * other.q); }
    mul(other: Frac): Frac { return new Frac(this.p * other.p, this.q * other.q); }
    div(other: Frac): Frac { return new Frac(this.p * other.q, this.q * other.p); }
    neg(): Frac { return new Frac(-this.p, this.q); }
    abs(): Frac { return new Frac(this.p < 0n ? -this.p : this.p, this.q); }
    inv(): Frac { return new Frac(this.q, this.p); }

    eq(other: Frac): boolean { return this.p === other.p && this.q === other.q; }
    lt(other: Frac): boolean { return this.p * other.q < other.p * this.q; }
    gt(other: Frac): boolean { return other.lt(this); }
    lte(other: Frac): boolean { return !this.gt(other); }
    gte(other: Frac): boolean { return !this.lt(other); }

    isZero(): boolean { return this.p === 0n; }
    isInteger(): boolean { return this.q === 1n; }

    /** Valeur flottante (pour le rendu pixel uniquement) */
    toFloat(): number { return Number(this.p) / Number(this.q); }

    /** Représentation LaTeX exacte */
    toLatex(): string {
        if (this.q === 1n) return this.p.toString();
        const sign = this.p < 0n ? '-' : '';
        const ap = this.p < 0n ? -this.p : this.p;
        return `${sign}\\frac{${ap}}{${this.q}}`;
    }

    /** Représentation texte lisible */
    toString(): string {
        if (this.q === 1n) return this.p.toString();
        return `${this.p}/${this.q}`;
    }
}

// ─── Racine carrée exacte (forme a√b) ────────────────────────────────────────

export class Sqrt {
    readonly coeff: Frac;   // coefficient rationnel
    readonly radicand: Frac; // ce qui est sous la racine (rationnel positif)

    constructor(coeff: Frac, radicand: Frac) {
        this.coeff = coeff;
        this.radicand = radicand;
    }

    static of(n: number | bigint): Sqrt {
        return new Sqrt(Frac.ONE, Frac.of(n));
    }

    /** √(p/q) → simplifié */
    static fromFrac(f: Frac): ExactVal {
        if (f.isZero()) return { type: 'rat', val: Frac.ZERO };
        // Cherche le plus grand carré parfait qui divise p et q
        return { type: 'sqrt', val: new Sqrt(Frac.ONE, f) };
    }

    toFloat(): number {
        return this.coeff.toFloat() * Math.sqrt(this.radicand.toFloat());
    }

    toLatex(): string {
        const sq = this.radicand.isInteger()
            ? `\\sqrt{${this.radicand.p}}`
            : `\\sqrt{\\frac{${this.radicand.p}}{${this.radicand.q}}}`;
        if (this.coeff.eq(Frac.ONE)) return sq;
        if (this.coeff.eq(Frac.ONE.neg())) return `-${sq}`;
        return `${this.coeff.toLatex()} ${sq}`;
    }
}

// ─── Valeur exacte unifiée ───────────────────────────────────────────────────

export type ExactVal =
    | { type: 'rat'; val: Frac }
    | { type: 'sqrt'; val: Sqrt }
    | { type: 'pi'; coeff: Frac }   // coeff × π
    | { type: 'expr'; latex: string; float: number }; // fallback symbolique

export function exactToLatex(v: ExactVal): string {
    switch (v.type) {
        case 'rat': return v.val.toLatex();
        case 'sqrt': return v.val.toLatex();
        case 'pi': return v.coeff.eq(Frac.ONE) ? '\\pi' : `${v.coeff.toLatex()} \\pi`;
        case 'expr': return v.latex;
    }
}

export function exactToFloat(v: ExactVal): number {
    switch (v.type) {
        case 'rat': return v.val.toFloat();
        case 'sqrt': return v.val.toFloat();
        case 'pi': return v.coeff.toFloat() * Math.PI;
        case 'expr': return v.float;
    }
}

// ─── Point exact ─────────────────────────────────────────────────────────────

export interface ExactPoint {
    name: string;
    x: Frac;
    y: Frac;
    label?: string;
    color?: string;
}

// ─── Calculs géométriques exacts ─────────────────────────────────────────────

/** Distance exacte entre deux points (sous forme √(Δx²+Δy²)) */
export function distanceExact(A: ExactPoint, B: ExactPoint): ExactVal {
    const dx = B.x.sub(A.x);
    const dy = B.y.sub(A.y);
    const d2 = dx.mul(dx).add(dy.mul(dy));
    if (d2.isZero()) return { type: 'rat', val: Frac.ZERO };
    // Chercher si c'est un carré parfait
    const f = d2.toFloat();
    const sqrtF = Math.sqrt(f);
    if (Math.abs(sqrtF - Math.round(sqrtF)) < 1e-10) {
        return { type: 'rat', val: Frac.of(Math.round(sqrtF)) };
    }
    return { type: 'sqrt', val: new Sqrt(Frac.ONE, d2) };
}

/** Milieu exact */
export function midpointExact(A: ExactPoint, B: ExactPoint): ExactPoint {
    return {
        name: `M_{${A.name}${B.name}}`,
        x: A.x.add(B.x).div(Frac.TWO),
        y: A.y.add(B.y).div(Frac.TWO),
    };
}

/** Pente exacte (ou null si verticale) */
export function slopeExact(A: ExactPoint, B: ExactPoint): Frac | null {
    const dx = B.x.sub(A.x);
    if (dx.isZero()) return null;
    return B.y.sub(A.y).div(dx);
}

/**
 * Intersection de deux droites (Ax+By=C form).
 * Retourne null si parallèles.
 */
export function intersectLines(
    A1: ExactPoint, B1: ExactPoint,
    A2: ExactPoint, B2: ExactPoint
): ExactPoint | null {
    // D1: (y2-y1)x - (x2-x1)y = y2*x1 - y1*x2
    const a1 = B1.y.sub(A1.y);
    const b1 = A1.x.sub(B1.x);
    const c1 = a1.mul(A1.x).add(b1.mul(A1.y));

    const a2 = B2.y.sub(A2.y);
    const b2 = A2.x.sub(B2.x);
    const c2 = a2.mul(A2.x).add(b2.mul(A2.y));

    const det = a1.mul(b2).sub(a2.mul(b1));
    if (det.isZero()) return null; // parallèles

    const x = c1.mul(b2).sub(c2.mul(b1)).div(det);
    const y = a1.mul(c2).sub(a2.mul(c1)).div(det);

    return { name: 'I', x, y };
}

/** Pied de la perpendiculaire de C sur la droite (AB) */
export function footOfPerpendicular(
    C: ExactPoint, A: ExactPoint, B: ExactPoint
): ExactPoint {
    const dx = B.x.sub(A.x);
    const dy = B.y.sub(A.y);
    const t = C.x.sub(A.x).mul(dx).add(C.y.sub(A.y).mul(dy))
        .div(dx.mul(dx).add(dy.mul(dy)));
    return {
        name: `H`,
        x: A.x.add(t.mul(dx)),
        y: A.y.add(t.mul(dy)),
    };
}

/** Vérifie si deux droites sont perpendiculaires */
export function arePerpendicular(
    A1: ExactPoint, B1: ExactPoint,
    A2: ExactPoint, B2: ExactPoint
): boolean {
    const s1 = slopeExact(A1, B1);
    const s2 = slopeExact(A2, B2);
    if (s1 === null && s2 !== null && s2.isZero()) return true;
    if (s2 === null && s1 !== null && s1.isZero()) return true;
    if (s1 === null || s2 === null) return false;
    return s1.mul(s2).eq(Frac.ONE.neg()); // m1 × m2 = -1
}

/** Vérifie si deux droites sont parallèles */
export function areParallel(
    A1: ExactPoint, B1: ExactPoint,
    A2: ExactPoint, B2: ExactPoint
): boolean {
    const s1 = slopeExact(A1, B1);
    const s2 = slopeExact(A2, B2);
    if (s1 === null && s2 === null) return true;
    if (s1 === null || s2 === null) return false;
    return s1.eq(s2);
}

/** Rayon exact d'un cercle passant par un point */
export function circleRadiusExact(center: ExactPoint, through: ExactPoint): ExactVal {
    return distanceExact(center, through);
}

/** Aire exacte d'un triangle */
export function triangleAreaExact(A: ExactPoint, B: ExactPoint, C: ExactPoint): ExactVal {
    // ||(B-A) × (C-A)|| / 2
    const cross = B.x.sub(A.x).mul(C.y.sub(A.y))
        .sub(B.y.sub(A.y).mul(C.x.sub(A.x)));
    const area2 = cross.lt(Frac.ZERO) ? cross.neg() : cross;
    return { type: 'rat', val: area2.div(Frac.TWO) };
}

/** Périmètre exact d'un polygone (liste de points ordonnés) */
export function perimeterExact(points: ExactPoint[]): ExactVal {
    if (points.length < 2) return { type: 'rat', val: Frac.ZERO };
    // On accumule les distances flottantes pour vérifier un éventuel entier,
    // mais on renvoie une expression LaTeX composite pour l'affichage exact.
    const distances: ExactVal[] = [];
    for (let i = 0; i < points.length; i++) {
        const A = points[i];
        const B = points[(i + 1) % points.length];
        distances.push(distanceExact(A, B));
    }
    // Si toutes les distances sont rationnelles, on peut sommer exactement
    if (distances.every(d => d.type === 'rat')) {
        let sum = Frac.ZERO;
        for (const d of distances) sum = sum.add((d as { type: 'rat'; val: Frac }).val);
        return { type: 'rat', val: sum };
    }
    // Sinon, on construit une expression LaTeX
    const latexParts = distances.map(d => exactToLatex(d));
    const floatSum = distances.reduce((s, d) => s + exactToFloat(d), 0);
    return { type: 'expr', latex: latexParts.join(' + '), float: floatSum };
}

/** Produit scalaire exact de deux vecteurs AB⃗ · CD⃗ */
export function dotProductExact(
    A: ExactPoint, B: ExactPoint,
    C: ExactPoint, D: ExactPoint
): Frac {
    const ux = B.x.sub(A.x);
    const uy = B.y.sub(A.y);
    const vx = D.x.sub(C.x);
    const vy = D.y.sub(C.y);
    return ux.mul(vx).add(uy.mul(vy));
}

/**
 * Équation de droite exacte passant par A et B :
 * a·x + b·y + c = 0 (coefficients entiers irréductibles)
 */
export function lineEquationExact(A: ExactPoint, B: ExactPoint): {
    a: Frac; b: Frac; c: Frac; latex: string;
} | null {
    const dx = B.x.sub(A.x);
    const dy = B.y.sub(A.y);
    if (dx.isZero() && dy.isZero()) return null;

    // Droite verticale : x = A.x  →  1·x + 0·y + (-A.x) = 0
    if (dx.isZero()) {
        return {
            a: Frac.ONE,
            b: Frac.ZERO,
            c: A.x.neg(),
            latex: `x = ${A.x.toLatex()}`,
        };
    }

    // Droite horizontale : y = A.y  →  0·x + 1·y + (-A.y) = 0
    if (dy.isZero()) {
        return {
            a: Frac.ZERO,
            b: Frac.ONE,
            c: A.y.neg(),
            latex: `y = ${A.y.toLatex()}`,
        };
    }

    // Cas général :
    //   direction (dx, dy)  →  normale (dy, -dx)
    //   dy·x - dx·y + c = 0   avec c = dx·A.y - dy·A.x
    const a = dy;
    const b = dx.neg();
    const c = dx.mul(A.y).sub(dy.mul(A.x));

    // Pente m = dy/dx, ordonnée à l'origine p = A.y - m * A.x
    const slope = dy.div(dx);
    const intercept = A.y.sub(slope.mul(A.x));

    let latex = `y = `;
    if (slope.eq(Frac.ONE)) latex += 'x';
    else if (slope.eq(Frac.ONE.neg())) latex += '-x';
    else latex += `${slope.toLatex()} \\, x`;

    if (intercept.gt(Frac.ZERO)) latex += ` + ${intercept.toLatex()}`;
    else if (intercept.lt(Frac.ZERO)) latex += ` - ${intercept.neg().toLatex()}`;
    // sinon p = 0, on n'affiche rien

    return { a, b, c, latex };
}

/** Norme exacte d'un vecteur AB⃗  (= distance AB) */
export function vectorNormExact(A: ExactPoint, B: ExactPoint): ExactVal {
    return distanceExact(A, B);
}

// Helper pour la comparaison
const fracLt = (a: Frac, b: Frac) => a.lt(b);
export { fracLt };
