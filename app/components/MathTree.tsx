'use client';

import { useEffect, useRef, useMemo } from 'react';

export interface TreeNode {
    id: string;
    label: string;
    parent?: string;
    value?: string; // Probabilité sur la branche
}

export interface MathTreeProps {
    data: TreeNode[];
    title?: string;
}

// ─── Couleurs par profondeur ────────────────────────────────────────────────
const DEPTH_COLORS = [
    '#94a3b8', // 0 = racine (gris)
    '#818cf8', // 1 = niveau 1 (indigo)
    '#34d399', // 2 = niveau 2 (émeraude)
    '#fb923c', // 3 = niveau 3 (orange)
    '#f472b6', // 4 = niveau 4 (rose)
];

const BRANCH_COLORS = [
    'rgba(148, 163, 184, 0.4)',
    'rgba(129, 140, 248, 0.5)',
    'rgba(52, 211, 153, 0.5)',
    'rgba(251, 146, 60, 0.5)',
    'rgba(244, 114, 182, 0.5)',
];

// ─── Construction récursive de la hiérarchie ────────────────────────────────
interface HNode {
    data: TreeNode;
    children: HNode[];
    depth: number;
    x: number;  // position Y (verticale dans le layout)
    y: number;  // position X (horizontale dans le layout)
}

function buildHierarchy(nodes: TreeNode[]): HNode | null {
    const map = new Map<string, HNode>();
    let root: HNode | null = null;

    for (const n of nodes) {
        map.set(n.id, { data: n, children: [], depth: 0, x: 0, y: 0 });
    }
    for (const n of nodes) {
        const hNode = map.get(n.id)!;
        if (!n.parent) {
            root = hNode;
        } else {
            const parent = map.get(n.parent);
            if (parent) parent.children.push(hNode);
        }
    }

    // Calculer les profondeurs
    function setDepth(node: HNode, d: number) {
        node.depth = d;
        for (const c of node.children) setDepth(c, d + 1);
    }
    if (root) setDepth(root, 0);

    return root;
}

// ─── Calcul du layout horizontal (racine à gauche) ─────────────────────────
function layoutTree(root: HNode, width: number, height: number) {
    // Compter le max de profondeur
    let maxDepth = 0;
    function getMaxDepth(n: HNode) {
        if (n.depth > maxDepth) maxDepth = n.depth;
        for (const c of n.children) getMaxDepth(c);
    }
    getMaxDepth(root);

    const levelSpacing = maxDepth > 0 ? width / maxDepth : width;

    // Compter les feuilles pour la hauteur
    let leafCount = 0;
    function countLeaves(n: HNode): number {
        if (n.children.length === 0) { leafCount++; return 1; }
        let sum = 0;
        for (const c of n.children) sum += countLeaves(c);
        return sum;
    }
    countLeaves(root);

    // Caper les feuilles pour le spacing vertical (arbres binomiaux très larges)
    const MAX_LAYOUT_LEAVES = 16;
    const effectiveLeafCount = Math.min(leafCount, MAX_LAYOUT_LEAVES);
    const leafSpacing = height / (effectiveLeafCount + 1);

    // Positionner les feuilles puis remonter
    let leafIndex = 0;
    function position(n: HNode) {
        n.y = n.depth * levelSpacing;
        if (n.children.length === 0) {
            leafIndex++;
            // Clamp leafIndex pour éviter le débordement sur grands arbres
            const cappedIndex = Math.min(leafIndex, effectiveLeafCount);
            n.x = cappedIndex * leafSpacing;
        } else {
            for (const c of n.children) position(c);
            // Parent au centre de ses enfants
            const first = n.children[0];
            const last = n.children[n.children.length - 1];
            n.x = (first.x + last.x) / 2;
        }
    }
    position(root);
}

export default function MathTree({ data, title }: MathTreeProps) {
    const canvasRef = useRef<SVGSVGElement>(null);

    // Dimensions adaptatives selon la profondeur
    const hierarchy = useMemo(() => buildHierarchy(data), [data]);

    // ─── MAX feuilles rendues (évite les débordements pour binomiale n≥4) ───
    const MAX_LEAVES = 16;

    const dims = useMemo(() => {
        if (!hierarchy) return { w: 600, h: 350, margin: { t: 50, r: 60, b: 30, l: 60 } };
        let maxDepth = 0, leafCount = 0;
        function scan(n: HNode) {
            if (n.depth > maxDepth) maxDepth = n.depth;
            if (n.children.length === 0) leafCount++;
            for (const c of n.children) scan(c);
        }
        scan(hierarchy);
        // Caper les feuilles pour l'affichage (arbres binomiaux très profonds)
        const effectiveLeaves = Math.min(leafCount, MAX_LEAVES);
        const leafH = Math.max(55, Math.min(70, 600 / (effectiveLeaves + 1)));
        const h = Math.max(350, Math.min(900, effectiveLeaves * leafH + 120));
        const levelW = Math.max(160, Math.min(220, 900 / (maxDepth + 1)));
        const w = Math.max(550, maxDepth * levelW + 180);
        return { w, h, margin: { t: 50, r: 80, b: 30, l: 60 } };
    }, [hierarchy]);

    useEffect(() => {
        if (!canvasRef.current || !hierarchy) return;

        const { w, h, margin } = dims;
        const plotW = w - margin.l - margin.r;
        const plotH = h - margin.t - margin.b;

        layoutTree(hierarchy, plotW, plotH);

        // On ne dessine plus via D3 — on utilise le SVG déclaratif
        // Mais pour une gestion dynamique des enfants, D3 est plus simple ici
        const svg = canvasRef.current;

        // Nettoyage
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        // Fond
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', String(w));
        bg.setAttribute('height', String(h));
        bg.setAttribute('fill', 'rgba(2, 6, 23, 0.6)');
        bg.setAttribute('rx', '24');
        svg.appendChild(bg);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${margin.l},${margin.t})`);
        svg.appendChild(g);

        // Titre
        if (title) {
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleEl.setAttribute('x', String(w / 2));
            titleEl.setAttribute('y', '28');
            titleEl.setAttribute('text-anchor', 'middle');
            titleEl.setAttribute('fill', '#e2e8f0');
            titleEl.setAttribute('font-size', '15');
            titleEl.setAttribute('font-weight', 'bold');
            titleEl.setAttribute('font-family', 'Inter, sans-serif');
            titleEl.textContent = title;
            svg.appendChild(titleEl);
        }

        // Parcours récursif pour dessiner
        function drawNode(node: HNode) {
            const color = DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)];

            // Dessiner les branches vers les enfants
            for (const child of node.children) {
                const branchColor = BRANCH_COLORS[Math.min(child.depth, BRANCH_COLORS.length - 1)];

                // Ligne de la branche
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', String(node.y));
                line.setAttribute('y1', String(node.x));
                line.setAttribute('x2', String(child.y));
                line.setAttribute('y2', String(child.x));
                line.setAttribute('stroke', branchColor);
                line.setAttribute('stroke-width', '2.5');
                line.setAttribute('stroke-linecap', 'round');
                g.appendChild(line);

                // Probabilité sur la branche (au-dessus, à 40%)
                const prob = child.data.value;
                if (prob) {
                    const px = node.y + (child.y - node.y) * 0.42;
                    const py = node.x + (child.x - node.x) * 0.42;

                    // Fond rectangle arrondi
                    const probW = prob.length * 8.5 + 14;
                    const rectBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rectBg.setAttribute('x', String(px - probW / 2));
                    rectBg.setAttribute('y', String(py - 12));
                    rectBg.setAttribute('width', String(probW));
                    rectBg.setAttribute('height', '20');
                    rectBg.setAttribute('fill', 'rgba(2, 6, 23, 0.9)');
                    rectBg.setAttribute('rx', '8');
                    rectBg.setAttribute('stroke', branchColor);
                    rectBg.setAttribute('stroke-width', '1');
                    g.appendChild(rectBg);

                    const probText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    probText.setAttribute('x', String(px));
                    probText.setAttribute('y', String(py + 2));
                    probText.setAttribute('text-anchor', 'middle');
                    probText.setAttribute('fill', DEPTH_COLORS[Math.min(child.depth, DEPTH_COLORS.length - 1)]);
                    probText.setAttribute('font-size', '13');
                    probText.setAttribute('font-weight', 'bold');
                    probText.setAttribute('font-style', 'italic');
                    probText.setAttribute('font-family', 'Inter, sans-serif');
                    // Convertir les points en virgules pour la notation française
                    probText.textContent = prob.replace(/\./g, ',');
                    g.appendChild(probText);
                }

                drawNode(child);
            }

            // Nœud : rectangle arrondi avec label
            const label = node.data.label;
            const isRoot = node.depth === 0;
            const isLeaf = node.children.length === 0;
            const labelW = label.length * 10 + 24;
            const labelH = 28;

            // Rectangle du nœud
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(node.y - labelW / 2));
            rect.setAttribute('y', String(node.x - labelH / 2));
            rect.setAttribute('width', String(labelW));
            rect.setAttribute('height', String(labelH));
            rect.setAttribute('rx', '10');
            rect.setAttribute('fill', isRoot ? 'rgba(148, 163, 184, 0.15)' : 'rgba(2, 6, 23, 0.85)');
            rect.setAttribute('stroke', color);
            rect.setAttribute('stroke-width', isRoot ? '2' : '1.5');
            g.appendChild(rect);

            // Texte du label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(node.y));
            text.setAttribute('y', String(node.x + 1));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', color);
            text.setAttribute('font-size', isRoot ? '15' : '16');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('font-family', 'Inter, sans-serif');
            text.textContent = label;
            g.appendChild(text);
        }

        drawNode(hierarchy);

    }, [hierarchy, title, dims]);

    return (
        <div className="my-8 w-full flex flex-col items-center">
            <div className="relative p-2 bg-slate-950/80 border border-white/5 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
                <svg
                    ref={canvasRef}
                    width={dims.w}
                    height={dims.h}
                    className="overflow-visible"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                />
            </div>
        </div>
    );
}
