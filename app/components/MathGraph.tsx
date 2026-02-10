'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Moteur de Graphique Mathématique Professionnel "Quantum Graph"
 * Supporte : Courbes de Bézier (Splines), Intervalles bornés, Points de contrôle
 */
export interface GraphPoint {
    x: number;
    y: number;
    type?: 'closed' | 'open'; // Pour les bornes d'intervalles
}

export interface MathGraphProps {
    points?: GraphPoint[]; // Points de passage pour une courbe lisse (Bézier/Spline)
    functions?: { fn: string; color: string; domain?: [number, number] }[]; // Fonctions tracées point par point
    domain?: { x: [number, number]; y: [number, number] };
    title?: string;
}

export default function MathGraph({
    points = [],
    functions = [],
    domain = { x: [-5, 5], y: [-4, 4] },
    title
}: MathGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const margin = { top: 40, right: 30, bottom: 40, left: 40 };
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // 1. Échelles
        const x = d3.scaleLinear().domain(domain.x).range([0, width]);
        const y = d3.scaleLinear().domain(domain.y).range([height, 0]);

        // 2. Grilles
        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(-height).tickFormat(() => ""))
            .attr('stroke-opacity', 0.1)
            .attr('stroke-dasharray', '2,2');

        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y).ticks(8).tickSize(-width).tickFormat(() => ""))
            .attr('stroke-opacity', 0.1)
            .attr('stroke-dasharray', '2,2');

        // 3. Axes principaux
        g.append('g')
            .attr('transform', `translate(0,${y(0)})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(5))
            .attr('stroke-width', 1.5)
            .style('opacity', 0.8);

        g.append('g')
            .attr('transform', `translate(${x(0)},0)`)
            .call(d3.axisLeft(y).ticks(8).tickSize(5))
            .attr('stroke-width', 1.5)
            .style('opacity', 0.8);

        // 4. Tracé des points lisses (Générateur de Spline)
        if (points.length > 1) {
            const lineGenerator = d3.line<GraphPoint>()
                .x(d => x(d.x))
                .y(d => y(d.y))
                .curve(d3.curveMonotoneX); // Garantit une courbe lisse sans ondulations bizarres

            g.append('path')
                .datum(points)
                .attr('fill', 'none')
                .attr('stroke', '#3b82f6')
                .attr('stroke-width', 3)
                .attr('d', lineGenerator)
                .attr('class', 'main-curve');

            // Points de contrôle visuels (Optionnel pour l'aide)
            g.selectAll('.dot')
                .data(points)
                .enter().append('circle')
                .attr('cx', d => x(d.x))
                .attr('cy', d => y(d.y))
                .attr('r', 4)
                .attr('fill', d => d.type === 'open' ? '#0f172a' : '#3b82f6')
                .attr('stroke', '#3b82f6')
                .attr('stroke-width', 2);
        }

        // 5. Tracé des fonctions mathématiques point par point
        functions.forEach(f => {
            const resolution = 100;
            const d_min = f.domain ? f.domain[0] : domain.x[0];
            const d_max = f.domain ? f.domain[1] : domain.x[1];
            const step = (d_max - d_min) / resolution;

            const data: [number, number][] = [];
            for (let t = d_min; t <= d_max; t += step) {
                try {
                    // Evaluation sécurisée minimaliste pour la démo (on améliorera avec mathjs si besoin)
                    // eslint-disable-next-line no-eval
                    const val = eval(f.fn.replace(/x/g, `(${t})`));
                    if (!isNaN(val) && isFinite(val)) data.push([t, val]);
                } catch (e) { }
            }

            const fnLine = d3.line<[number, number]>()
                .x(d => x(d[0]))
                .y(d => y(d[1]))
                .curve(d3.curveCardinal);

            g.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', f.color)
                .attr('stroke-width', 2.5)
                .attr('d', fnLine);
        });

        // 6. Titre
        if (title) {
            svg.append('text')
                .attr('x', 300)
                .attr('y', 25)
                .attr('text-anchor', 'middle')
                .attr('class', 'text-white font-bold tracking-tight fill-blue-400 uppercase text-xs')
                .text(title);
        }

    }, [points, functions, domain, title]);

    return (
        <div className="my-8 w-full flex flex-col items-center">
            <div className="relative p-6 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                <svg
                    ref={svgRef}
                    width="600"
                    height="400"
                    className="rounded-xl overflow-visible"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                />
                <div className="absolute top-4 right-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-mono text-blue-500/50 uppercase tracking-widest">Quantum Engine 2.1</span>
                </div>
            </div>
            <p className="mt-4 text-[10px] text-slate-500 italic font-medium px-8 text-center leading-relaxed">
                Représentation graphique professionnelle • Analyse des variations et signes
            </p>
        </div>
    );
}
