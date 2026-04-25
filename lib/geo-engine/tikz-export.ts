/**
 * lib/geo-engine/tikz-export.ts
 * Convertit une GeoScene en code TikZ/LaTeX compilable.
 */

import type {
    GeoScene, GeoObject,
    GeoPoint, GeoSegment, GeoLine, GeoCircle,
    GeoPolygon, GeoAngle, GeoVector, GeoLabel,
} from './types';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function fmtN(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
}

function fmtColor(color?: string): string {
    if (!color) return 'black';
    const map: Record<string, string> = {
        blue: 'blue', bleu: 'blue',
        red: 'red', rouge: 'red',
        green: 'green!60!black', vert: 'green!60!black',
        orange: 'orange!90!black',
        purple: 'purple', violet: 'violet!80!black',
        gray: 'gray', gris: 'gray',
        black: 'black', noir: 'black',
        white: 'white', blanc: 'white',
        indigo: 'blue!70!black',
        pink: 'pink!80!black', rose: 'pink!80!black',
        cyan: 'cyan!70!black',
        yellow: 'yellow!80!black', jaune: 'yellow!80!black',
    };
    const key = color.toLowerCase();
    if (map[key]) return map[key];
    // Hex → {rgb,255:red,R;green,G;blue,B}
    const hex = color.replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(hex)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `{rgb,255:red,${r};green,${g};blue,${b}}`;
    }
    return 'black';
}

function pointById(scene: GeoScene, id: string): GeoPoint | undefined {
    return scene.objects.find(o => o.kind === 'point' && o.id === id) as GeoPoint | undefined;
}

function dist(a: GeoPoint, b: GeoPoint): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function defaultDomain(scene: GeoScene): { x: [number, number]; y: [number, number] } {
    const pts = scene.objects.filter(o => o.kind === 'point') as GeoPoint[];
    if (pts.length === 0) return { x: [-5, 5], y: [-5, 5] };
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const m = 1.2;
    return { x: [Math.min(...xs) - m, Math.max(...xs) + m], y: [Math.min(...ys) - m, Math.max(...ys) + m] };
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function exportTikzSnippet(scene: GeoScene): string {
    const L: string[] = [];
    const domain = scene.domain ?? defaultDomain(scene);
    const xRange = domain.x[1] - domain.x[0];
    const yRange = domain.y[1] - domain.y[0];
    // Calibrer : figure ~10cm × 8cm max
    const scale = Math.min(10 / Math.max(xRange, 0.1), 8 / Math.max(yRange, 0.1));
    const sc = Math.min(scale, 1.5); // plafonner à 1.5 pour éviter les géants

    L.push(`\\begin{tikzpicture}[scale=${fmtN(sc)}, >=latex]`);

    const pts = scene.objects.filter(o => o.kind === 'point') as GeoPoint[];
    const segs = scene.objects.filter(o => o.kind === 'segment') as GeoSegment[];
    const lines = scene.objects.filter(o => o.kind === 'line') as GeoLine[];
    const circles = scene.objects.filter(o => o.kind === 'circle') as GeoCircle[];
    const polys = scene.objects.filter(o => o.kind === 'polygon') as GeoPolygon[];
    const vecs = scene.objects.filter(o => o.kind === 'vector') as GeoVector[];
    const angles = scene.objects.filter(o => o.kind === 'angle') as GeoAngle[];
    const lbls = scene.objects.filter(o => o.kind === 'label') as GeoLabel[];

    // ── Grille ──
    const hasRepere = scene.repere === 'orthonormal' || scene.repere === 'orthogonal';
    if (scene.showGrid !== false && hasRepere) {
        L.push(`  \\draw[gray!15, very thin, step=1] (${fmtN(domain.x[0])},${fmtN(domain.y[0])}) grid (${fmtN(domain.x[1])},${fmtN(domain.y[1])});`);
    }

    // ── Axes ──
    if (scene.repere === 'orthonormal' || scene.repere === 'orthogonal') {
        const [xMin, xMax] = domain.x;
        const [yMin, yMax] = domain.y;
        L.push(`  % Axes`);
        L.push(`  \\draw[->] (${fmtN(xMin - 0.4)},0) -- (${fmtN(xMax + 0.6)},0) node[right] {$x$};`);
        L.push(`  \\draw[->] (0,${fmtN(yMin - 0.4)}) -- (0,${fmtN(yMax + 0.6)}) node[above] {$y$};`);
        // Graduation x
        for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
            if (x !== 0) L.push(`  \\draw (${x},0.06) -- (${x},-0.06) node[below, font=\\tiny] {$${x}$};`);
        }
        // Graduation y
        for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
            if (y !== 0) L.push(`  \\draw (-0.06,${y}) -- (0.06,${y}) node[left, font=\\tiny] {$${y}$};`);
        }
        L.push(`  \\fill (0,0) circle (1.5pt) node[below left, font=\\small] {$O$};`);
    }

    // ── Coordonnées ──
    const visiblePts = pts.filter(p => !p.id.startsWith('_'));
    if (visiblePts.length > 0) {
        L.push(`  % Coordonnées`);
        visiblePts.forEach(p => {
            L.push(`  \\coordinate (${p.id}) at (${fmtN(p.x)},${fmtN(p.y)});`);
        });
    }

    // ── Polygones (fond d'abord) ──
    if (polys.length > 0) {
        L.push(`  % Polygones`);
        polys.forEach(poly => {
            const verts = poly.vertices.join(') -- (');
            if (poly.fillColor) {
                L.push(`  \\fill[${fmtColor(poly.fillColor)}!20] (${verts}) -- cycle;`);
            }
            const sc = poly.strokeColor ?? 'black';
            L.push(`  \\draw[${fmtColor(sc)}, thick] (${verts}) -- cycle;`);
        });
    }

    // ── Droites ──
    if (lines.length > 0) {
        L.push(`  % Droites`);
        lines.forEach(line => {
            const [id1, id2] = line.through;
            const color = fmtColor(line.color);
            const style = line.style === 'dashed' ? 'dashed, ' : line.style === 'dotted' ? 'dotted, ' : '';
            if (line.type === 'line') {
                L.push(`  \\draw[${style}${color}, shorten >=-1.5cm, shorten <=-1.5cm] (${id1}) -- (${id2});`);
            } else if (line.type === 'ray') {
                L.push(`  \\draw[${style}${color}, ->, shorten >=-5cm] (${id1}) -- (${id2});`);
            } else {
                L.push(`  \\draw[${style}${color}] (${id1}) -- (${id2});`);
            }
            if (line.label) {
                L.push(`  \\node[${color}, above right] at ($(${id1})!0.5!(${id2})$) {$${line.label}$};`);
            }
        });
    }

    // ── Segments ──
    if (segs.length > 0) {
        L.push(`  % Segments`);
        segs.forEach(seg => {
            const color = fmtColor(seg.color);
            const style = seg.dashed ? 'dashed, ' : '';
            L.push(`  \\draw[${style}${color}] (${seg.from}) -- (${seg.to});`);
            if (seg.showTicks) {
                // Petits traits d'égalité au milieu du segment
                const n = seg.showTicks;
                for (let i = 0; i < n; i++) {
                    L.push(`  \\draw[${color}] ($(${seg.from})!.5!(${seg.to}) + (${-0.04 * (n - 1) / 2 + 0.04 * i},0.08)$) -- ($(${seg.from})!.5!(${seg.to}) + (${-0.04 * (n - 1) / 2 + 0.04 * i},-0.08)$);`);
                }
            }
            if (seg.label) {
                L.push(`  \\node at ($(${seg.from})!.5!(${seg.to}) + (0,0.2)$) {\\small $${seg.label}$};`);
            }
        });
    }

    // ── Cercles ──
    if (circles.length > 0) {
        L.push(`  % Cercles`);
        circles.forEach(c => {
            const color = fmtColor(c.color);
            let r: number;
            if (c.radiusValue !== undefined) {
                r = c.radiusValue;
            } else if (c.radiusPoint) {
                const cp = pointById(scene, c.center);
                const rp = pointById(scene, c.radiusPoint);
                r = cp && rp ? dist(cp, rp) : 1;
            } else {
                r = 1;
            }
            L.push(`  \\draw[${color}] (${c.center}) circle (${fmtN(r)});`);
            if (c.label) {
                L.push(`  \\node[${color}, above right] at (${c.center}) {\\small $${c.label}$};`);
            }
        });
    }

    // ── Vecteurs ──
    if (vecs.length > 0) {
        L.push(`  % Vecteurs`);
        vecs.forEach(v => {
            const color = fmtColor(v.color);
            L.push(`  \\draw[->, ${color}, thick] (${v.from}) -- (${v.to});`);
            if (v.label) {
                const pF = pointById(scene, v.from);
                const pT = pointById(scene, v.to);
                if (pF && pT) {
                    const mx = fmtN((pF.x + pT.x) / 2);
                    const my = fmtN((pF.y + pT.y) / 2);
                    const cleanLbl = v.label
                        .replace(/\\overrightarrow\{([^}]+)\}/g, '\\overrightarrow{$1}')
                        .replace(/\\vec\{([^}]+)\}/g, '\\vec{$1}');
                    L.push(`  \\node[above, ${color}] at (${mx},${my}) {$${cleanLbl}$};`);
                }
            }
        });
    }

    // ── Angles ──
    if (angles.length > 0) {
        L.push(`  % Angles`);
        angles.forEach(a => {
            const color = fmtColor(a.color);
            const vertex = pointById(scene, a.vertex);
            const pFrom = pointById(scene, a.from);
            const pTo = pointById(scene, a.to);
            if (!vertex || !pFrom || !pTo) return;

            if (a.square) {
                // Symbole angle droit (carré français)
                const sz = 0.25;
                const d1 = dist(vertex, pFrom);
                const d2 = dist(vertex, pTo);
                const e1x = fmtN(vertex.x + sz * (pFrom.x - vertex.x) / d1);
                const e1y = fmtN(vertex.y + sz * (pFrom.y - vertex.y) / d1);
                const e2x = fmtN(vertex.x + sz * (pTo.x - vertex.x) / d2);
                const e2y = fmtN(vertex.y + sz * (pTo.y - vertex.y) / d2);
                const mx = fmtN(vertex.x + sz * ((pFrom.x - vertex.x) / d1 + (pTo.x - vertex.x) / d2));
                const my = fmtN(vertex.y + sz * ((pFrom.y - vertex.y) / d1 + (pTo.y - vertex.y) / d2));
                L.push(`  \\draw[${color}] (${e1x},${e1y}) -- (${mx},${my}) -- (${e2x},${e2y});`);
            } else {
                // Arc d'angle (nécessite tikzlibrary angles)
                L.push(`  \\pic[draw=${color}, angle radius=0.5cm${a.label ? `, "$${a.label}$"` : ''}] {angle = ${a.from}--${a.vertex}--${a.to}};`);
            }
        });
    }

    // ── Points (par-dessus tout) ──
    if (visiblePts.length > 0) {
        L.push(`  % Points`);
        visiblePts.forEach(p => {
            if (p.style === 'none') return;
            const color = fmtColor(p.color);
            if (p.style === 'cross') {
                // Croix française
                L.push(`  \\draw[${color}] ($(${p.id}) + (-.07,-.07)$) -- ($(${p.id}) + (.07,.07)$);`);
                L.push(`  \\draw[${color}] ($(${p.id}) + (-.07,.07)$) -- ($(${p.id}) + (.07,-.07)$);`);
            } else {
                L.push(`  \\fill[${color}] (${p.id}) circle (2pt);`);
            }
            const lbl = p.label !== undefined ? p.label : p.id;
            if (lbl) {
                L.push(`  \\node[${color}, font=\\small] at ($(${p.id}) + (0.18,0.18)$) {$${lbl}$};`);
            }
        });
    }

    // ── Labels ──
    if (lbls.length > 0) {
        L.push(`  % Étiquettes`);
        lbls.forEach(lbl => {
            const color = fmtColor(lbl.color);
            L.push(`  \\node[${color}] at (${fmtN(lbl.x)},${fmtN(lbl.y)}) {${lbl.text}};`);
        });
    }

    L.push(`\\end{tikzpicture}`);
    return L.join('\n');
}

// ─── Document complet standalone ─────────────────────────────────────────────

export function exportTikzDocument(scene: GeoScene): string {
    const snippet = exportTikzSnippet(scene);
    const title = scene.title && !scene.title.includes('attente') ? scene.title : '';
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage{tikz}
\\usetikzlibrary{angles, quotes, calc, arrows.meta}
\\usepackage{geometry}
\\geometry{margin=2.5cm}

\\begin{document}
${title ? `\n\\begin{center}\n  {\\large\\bfseries ${title}}\n\\end{center}\n\\vspace{0.8cm}\n` : ''}
\\begin{center}
${snippet}
\\end{center}

\\end{document}
`;
}
