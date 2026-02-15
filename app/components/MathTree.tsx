'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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

export default function MathTree({ data, title }: MathTreeProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const margin = { top: 30, right: 100, bottom: 30, left: 60 };
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Fond subtil pour l'arbre
        svg.append('rect')
            .attr('width', 600)
            .attr('height', 400)
            .attr('fill', 'rgba(2, 6, 23, 0.3)')
            .attr('rx', 24);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        try {
            const stratify = d3.stratify<TreeNode>()
                .id(d => d.id)
                .parentId(d => d.parent);

            const hierarchyRoot = stratify(data);

            // Layout : Utilisation de Cluster pour aligner toutes les feuilles à droite (standard probas)
            const treeLayout = d3.cluster<TreeNode>().size([height, width]);
            treeLayout(hierarchyRoot);

            // 1. Les Branches (Segments rigoureux)
            g.selectAll('.link')
                .data(hierarchyRoot.links())
                .enter().append('line')
                .attr('class', 'link')
                .attr('stroke', 'rgba(148, 163, 184, 0.4)')
                .attr('stroke-width', 2.5)
                .attr('stroke-linecap', 'round')
                .attr('x1', d => d.source.y)
                .attr('y1', d => d.source.x)
                .attr('x2', d => d.target.y)
                .attr('y2', d => d.target.x);

            // 2. Probabilités (Nouveau système de placement centré avec décalage intelligent)
            const labels = g.selectAll('.branch-label-group')
                .data(hierarchyRoot.links())
                .enter().append('g')
                .attr('class', 'branch-label-group');

            labels.each(function (d) {
                const group = d3.select(this);
                const prob = (d.target.data as TreeNode).value;
                if (!prob) return;

                // Calcul du point à 40% (pour éviter le texte du nœud final)
                const px = d.source.y + (d.target.y - d.source.y) * 0.42;
                const py = d.source.x + (d.target.x - d.source.x) * 0.42;

                // Fond pour le texte (lisibilité maximale)
                group.append('rect')
                    .attr('x', px - 18)
                    .attr('y', py - 18)
                    .attr('width', 36)
                    .attr('height', 16)
                    .attr('fill', '#020617')
                    .attr('rx', 4)
                    .attr('opacity', 0.8);

                group.append('text')
                    .attr('x', px)
                    .attr('y', py - 6)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#34d399')
                    .attr('font-size', '13px')
                    .attr('font-weight', 'bold')
                    .text(prob);
            });

            // 3. Nœuds et Événements
            const nodes = g.selectAll('.node')
                .data(hierarchyRoot.descendants())
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${d.y},${d.x})`);

            nodes.append('circle')
                .attr('r', 4.5)
                .attr('fill', d => d.depth === 0 ? '#64748b' : '#3b82f6')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);

            nodes.append('text')
                .attr('dy', '0.35em')
                .attr('x', d => d.children ? -15 : 15)
                .attr('text-anchor', d => d.children ? 'end' : 'start')
                .attr('fill', '#fff')
                .attr('font-weight', d => d.depth === 0 ? 'normal' : 'bold')
                .attr('font-size', '15px')
                .style('text-shadow', '0 1px 3px rgba(0,0,0,0.9)')
                .text(d => d.data.label);

            // 4. Titre dynamique
            if (title) {
                svg.append('text')
                    .attr('x', 30)
                    .attr('y', 30)
                    .attr('fill', '#94a3b8')
                    .attr('font-size', '11px')
                    .attr('font-weight', 'bold')
                    .attr('text-transform', 'uppercase')
                    .attr('letter-spacing', '0.1em')
                    .text(title);
            }
        } catch (e) {
            console.error("MathTree Layout Error:", e);
            // Affichage d'un message d'erreur dans le SVG pour aider le debug visuel
            g.append('text')
                .attr('x', 0).attr('y', 0)
                .attr('fill', '#ef4444')
                .text("Erreur de structure de l'arbre");
        }

    }, [data, title]);

    return (
        <div className="my-10 w-full flex flex-col items-center animate-in zoom-in duration-500">
            <div className="relative p-2 bg-slate-950/80 border border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-xl group overflow-hidden">
                <svg
                    ref={svgRef}
                    width="600"
                    height="400"
                    className="overflow-visible"
                />
                <div className="absolute bottom-4 right-8 flex items-center gap-2">
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></span>
                    <span className="text-[8px] font-mono text-cyan-500/40 uppercase tracking-[0.3em]">Neural Tree Renderer v2</span>
                </div>
            </div>
            <p className="mt-4 text-[9px] text-slate-600 font-bold tracking-[0.2em] uppercase">
                Probabilités Conditionnelles • Lycée Français
            </p>
        </div>
    );
}
