'use client';

import { useState, useEffect, useRef, useId } from 'react';
import * as d3 from 'd3';

/**
 * Moteur de Graphique Mathématique Professionnel "Quantum Graph"
 */
export interface GraphPoint {
    x: number;
    y: number;
    type?: 'closed' | 'open';
}

export interface GraphEntity {
    type: 'point' | 'vector' | 'segment';
    x1: number;
    y1: number;
    x2?: number;
    y2?: number;
    name?: string;
    color?: string;
}

export interface MathGraphProps {
    points?: GraphPoint[];
    entities?: GraphEntity[];
    functions?: { fn: string; color: string; domain?: [number, number] }[];
    domain?: { x: [number, number]; y: [number, number] };
    title?: string;
    hideAxes?: boolean;
}

export default function MathGraph({
    points = [],
    entities = [],
    functions = [],
    domain = { x: [-5, 5], y: [-4, 4] },
    title,
    hideAxes = false
}: MathGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    const componentId = useId().replace(/:/g, ''); // Identifiant unique pour les markers SVG

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current || (!isVisible && animationKey === 0)) return;

        const margin = { top: 40, right: 30, bottom: 40, left: 40 };
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const defs = svg.append('defs');

        // Configuration des marqueurs avec IDs uniques
        const arrowAxisId = `arrow-axis-${componentId}`;
        const arrowVectorId = `arrow-vector-${componentId}`;
        const arrowSumId = `arrow-sum-${componentId}`;

        defs.append('marker')
            .attr('id', arrowAxisId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'rgba(255,255,255,0.4)');

        defs.append('marker')
            .attr('id', arrowVectorId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#f43f5e');

        defs.append('marker')
            .attr('id', arrowSumId)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#34d399');

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain(domain.x).range([0, width]);
        const y = d3.scaleLinear().domain(domain.y).range([height, 0]);

        if (!hideAxes) {
            // Grilles
            g.append('g').attr('class', 'grid').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(10).tickSize(-height).tickFormat(() => "")).attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-dasharray', '2,2');
            g.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(8).tickSize(-width).tickFormat(() => "")).attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-dasharray', '2,2');

            // Axes
            const axisColor = 'rgba(255,255,255,0.4)';
            g.append('line').attr('x1', 0).attr('y1', y(0)).attr('x2', width + 10).attr('y2', y(0)).attr('stroke', axisColor).attr('stroke-width', 2).attr('marker-end', `url(#${arrowAxisId})`);
            g.append('line').attr('x1', x(0)).attr('y1', height).attr('x2', x(0)).attr('y2', -10).attr('stroke', axisColor).attr('stroke-width', 2).attr('marker-end', `url(#${arrowAxisId})`);

            // Graduations
            g.append('g').attr('transform', `translate(0,${y(0)})`).call(d3.axisBottom(x).ticks(10).tickSize(5)).selectAll('text').style('fill', 'rgba(255,255,255,0.6)').style('font-size', '10px');
            g.append('g').attr('transform', `translate(${x(0)},0)`).call(d3.axisLeft(y).ticks(8).tickSize(5)).selectAll('text').style('fill', 'rgba(255,255,255,0.6)').style('font-size', '10px');
        }

        if (points && points.length > 1) {
            const lineGenerator = d3.line<GraphPoint>().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveMonotoneX);
            g.append('path').datum(points).attr('fill', 'none').attr('stroke', '#3b82f6').attr('stroke-width', 2.5).attr('d', lineGenerator);
        }

        let currentDelay = 0;
        entities.forEach((entity, index) => {
            const isSum = entity.name === 'w' || entity.name?.toLowerCase().includes('sum');
            const color = entity.color || (isSum ? '#34d399' : (entity.type === 'vector' ? '#f43f5e' : '#fbbf24'));

            const entityGroup = g.append('g').style('opacity', 0);
            entityGroup.transition().delay(currentDelay).duration(400).style('opacity', 1);

            if (entity.type === 'point') {
                entityGroup.append('circle').attr('cx', x(entity.x1)).attr('cy', y(entity.y1)).attr('r', 5).attr('fill', color).attr('stroke', 'white');
                if (entity.name) entityGroup.append('text').attr('x', x(entity.x1) + 12).attr('y', y(entity.y1) - 12).attr('fill', color).attr('font-weight', 'bold').style('font-size', '14px').text(entity.name);
                currentDelay += 600;
            } else if (entity.x2 !== undefined && entity.y2 !== undefined) {
                const line = entityGroup.append('line')
                    .attr('x1', x(entity.x1)).attr('y1', y(entity.y1))
                    .attr('x2', x(entity.x1)).attr('y2', y(entity.y1))
                    .attr('stroke', color).attr('stroke-width', 3)
                    .attr('marker-end', `url(#${isSum ? arrowSumId : arrowVectorId})`);

                line.transition().delay(currentDelay).duration(1200)
                    .attr('x2', x(entity.x2)).attr('y2', y(entity.y2));

                if (entity.name) {
                    const mx = (entity.x1 + entity.x2) / 2;
                    const my = (entity.y1 + entity.y2) / 2;
                    const nameTag = entityGroup.append('g')
                        .attr('transform', `translate(${x(mx)},${y(my) - 20})`)
                        .style('opacity', 0);

                    nameTag.transition().delay(currentDelay + 800).duration(400).style('opacity', 1);
                    // Nom du vecteur avec flèche au-dessus
                    nameTag.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('fill', color)
                        .attr('font-weight', 'bold')
                        .attr('font-style', 'italic')
                        .style('font-size', '16px')
                        .text(entity.name);

                    if (entity.type === 'vector' && entity.name) {
                        nameTag.append('path')
                            .attr('d', 'M-8,-14 L8,-14 M4,-17 L8,-14 L4,-11')
                            .attr('stroke', color)
                            .attr('stroke-width', 1.5)
                            .attr('fill', 'none');
                    }
                }
                currentDelay += 1500;
            }
        });

        if (title) {
            svg.append('text').attr('x', width / 2 + margin.left).attr('y', 25).attr('text-anchor', 'middle').attr('fill', 'white').attr('font-weight', 'bold').style('font-size', '16px').text(title);
        }
    }, [points, entities, domain, title, isVisible, animationKey, componentId]);

    return (
        <div ref={containerRef} className="my-8 w-full flex flex-col items-center">
            <div className="relative p-6 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl group">
                <div className="absolute top-4 right-6 flex items-center gap-3 z-20">
                    <button
                        onClick={() => { setAnimationKey(k => k + 1); setIsVisible(true); }}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-cyan-400 transition-all border border-white/5"
                        title="Rejouer l'animation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                    <span className={`w-2 h-2 rounded-full ${isVisible ? 'bg-cyan-500 animate-pulse' : 'bg-slate-500'}`}></span>
                </div>
                <svg ref={svgRef} width="600" height="400" className="rounded-xl overflow-visible" />
            </div>
            <p className="mt-4 text-[10px] text-slate-500 italic text-center">Représentation dynamique pas à pas • Bouton Rejouer en haut à droite</p>
        </div>
    );
}
