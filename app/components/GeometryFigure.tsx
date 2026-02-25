'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';

/**
 * 🎨 COMPOSANT DE FIGURES GÉOMÉTRIQUES ANIMÉES
 * Affiche des constructions géométriques étape par étape avec animation futuriste
 * Supporte les figures avec coordonnées (repère orthonormé) et sans coordonnées
 */

export interface GeoPoint {
    name: string;
    x?: number;
    y?: number;
    label?: string;
}

export interface GeoSegment {
    from: string;
    to: string;
    color?: string;
}

export interface GeoLine {
    name?: string;
    points: [string, string] | { point: string; slope?: number; equation?: string };
    color?: string;
    type?: 'line' | 'ray' | 'halfline';
}

export interface GeoCircle {
    center: string;
    radius?: number;
    throughPoint?: string;
    color?: string;
}

export interface GeoAnnotation {
    type: 'midpoint' | 'angle' | 'distance' | 'parallel' | 'perpendicular' | 'label';
    points?: string[];
    value?: string | number;
    position?: { x: number; y: number };
}

export interface GeometryFigureProps {
    points: GeoPoint[];
    segments?: GeoSegment[];
    lines?: GeoLine[];
    circles?: GeoCircle[];
    annotations?: GeoAnnotation[];
    hasCoordinates?: boolean; // Si true, affiche un repère orthonormé
    domain?: { x: [number, number]; y: [number, number] };
    title?: string;
    showSteps?: boolean;
}

interface ParsedPoint {
    name: string;
    x: number;
    y: number;
}

export default function GeometryFigure({
    points,
    segments = [],
    lines = [],
    circles = [],
    annotations = [],
    hasCoordinates = true,
    domain = { x: [-6, 6], y: [-5, 5] },
    title,
    showSteps = true
}: GeometryFigureProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const componentId = useRef(`geo-${Math.random().toString(36).substr(2, 9)}`);

    // Parser les points
    const parsedPoints: ParsedPoint[] = points.map(p => ({
        name: p.name,
        x: p.x ?? 0,
        y: p.y ?? 0
    }));

    // Map pour accéder rapidement aux coordonnées par nom
    const pointMap = new Map(parsedPoints.map(p => [p.name, p]));

    // Nombre total d'étapes
    const totalSteps = 4; // 1: Points, 2: Segments, 3: Lignes/Cercles, 4: Annotations

    // Animation au scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.2 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Animation séquentielle des étapes
    useEffect(() => {
        if (!isVisible || !isPlaying || !showSteps) return;

        if (currentStep < totalSteps) {
            const timer = setTimeout(() => {
                setCurrentStep(s => s + 1);
            }, 1200);
            return () => clearTimeout(timer);
        } else {
            setIsPlaying(false);
        }
    }, [isVisible, currentStep, isPlaying, showSteps]);

    // Dessin principal
    useEffect(() => {
        if (!svgRef.current || !isVisible) return;

        const margin = { top: 40, right: 40, bottom: 50, left: 50 };
        const width = 600 - margin.left - margin.right;
        const height = 450 - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Définitions (markers, gradients)
        const defs = svg.append('defs');

        // Flèche pour les axes
        defs.append('marker')
            .attr('id', `geo-arrow-axis-${componentId.current}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'rgba(99, 102, 241, 0.6)');

        // Flèche pour les vecteurs
        defs.append('marker')
            .attr('id', `geo-arrow-vector-${componentId.current}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9).attr('refY', 0)
            .attr('markerWidth', 5).attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#f43f5e');

        // Glow effect
        const filter = defs.append('filter')
            .attr('id', `geo-glow-${componentId.current}`)
            .attr('x', '-50%').attr('y', '-50%')
            .attr('width', '200%').attr('height', '200%');
        filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Échelles
        const x = d3.scaleLinear().domain(domain.x).range([0, width]);
        const y = d3.scaleLinear().domain(domain.y).range([height, 0]);

        // === ÉTAPE 0 ou TOUTES: Repère orthonormé ===
        if (hasCoordinates) {
            // Grille
            g.append('g')
                .attr('class', 'grid')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(12).tickSize(-height).tickFormat(() => ''))
                .attr('stroke', 'rgba(99, 102, 241, 0.1)')
                .attr('stroke-dasharray', '2,4');

            g.append('g')
                .attr('class', 'grid')
                .call(d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat(() => ''))
                .attr('stroke', 'rgba(99, 102, 241, 0.1)')
                .attr('stroke-dasharray', '2,4');

            // Axes
            const axisColor = 'rgba(99, 102, 241, 0.6)';
            g.append('line')
                .attr('x1', 0).attr('y1', y(0))
                .attr('x2', width + 15).attr('y2', y(0))
                .attr('stroke', axisColor).attr('stroke-width', 2)
                .attr('marker-end', `url(#geo-arrow-axis-${componentId.current})`);

            g.append('line')
                .attr('x1', x(0)).attr('y1', height)
                .attr('x2', x(0)).attr('y2', -15)
                .attr('stroke', axisColor).attr('stroke-width', 2)
                .attr('marker-end', `url(#geo-arrow-axis-${componentId.current})`);

            // Labels des axes
            g.append('text')
                .attr('x', width + 25).attr('y', y(0) + 5)
                .attr('fill', 'rgba(99, 102, 241, 0.8)')
                .attr('font-style', 'italic')
                .attr('font-size', '14px')
                .text('x');

            g.append('text')
                .attr('x', x(0) + 8).attr('y', -20)
                .attr('fill', 'rgba(99, 102, 241, 0.8)')
                .attr('font-style', 'italic')
                .attr('font-size', '14px')
                .text('y');

            // Graduations
            g.append('g')
                .attr('transform', `translate(0,${y(0)})`)
                .call(d3.axisBottom(x).ticks(12).tickSize(5).tickFormat(d => d === 0 ? '' : d.toString()))
                .selectAll('text')
                .style('fill', 'rgba(148, 163, 184, 0.8)')
                .style('font-size', '10px');

            g.append('g')
                .attr('transform', `translate(${x(0)},0)`)
                .call(d3.axisLeft(y).ticks(10).tickSize(5).tickFormat(d => d === 0 ? '' : d.toString()))
                .selectAll('text')
                .style('fill', 'rgba(148, 163, 184, 0.8)')
                .style('font-size', '10px');

            // Origine O
            g.append('text')
                .attr('x', x(0) - 12).attr('y', y(0) + 15)
                .attr('fill', 'rgba(148, 163, 184, 0.8)')
                .attr('font-size', '12px')
                .attr('font-style', 'italic')
                .text('O');
        }

        // === ÉTAPE 1: Points ===
        if (!showSteps || currentStep >= 1) {
            const pointsGroup = g.append('g').attr('class', 'points-layer');

            parsedPoints.forEach((point, index) => {
                const px = x(point.x);
                const py = y(point.y);

                const pointG = pointsGroup.append('g')
                    .attr('class', `point-${point.name}`)
                    .style('opacity', showSteps ? 0 : 1);

                if (showSteps) {
                    pointG.transition()
                        .delay(index * 300 + 200)
                        .duration(500)
                        .style('opacity', 1);
                }

                // Point lumineux
                pointG.append('circle')
                    .attr('cx', px).attr('cy', py)
                    .attr('r', 0)
                    .attr('fill', '#818cf8')
                    .attr('stroke', '#4f46e5')
                    .attr('stroke-width', 2)
                    .attr('filter', `url(#geo-glow-${componentId.current})`)
                    .transition()
                    .delay(showSteps ? index * 300 + 200 : 0)
                    .duration(400)
                    .attr('r', 6);

                // Nom du point
                pointG.append('text')
                    .attr('x', px + 12).attr('y', py - 12)
                    .attr('fill', '#c7d2fe')
                    .attr('font-weight', 'bold')
                    .attr('font-size', '14px')
                    .attr('font-style', 'italic')
                    .style('opacity', 0)
                    .text(point.name)
                    .transition()
                    .delay(showSteps ? index * 300 + 500 : 0)
                    .duration(300)
                    .style('opacity', 1);

                // Coordonnées (si repère)
                if (hasCoordinates && point.x !== undefined && point.y !== undefined) {
                    const coordText = `(${point.x.toString().replace('-', '−')}${point.y >= 0 ? ' ; ' : ' ; −'}${Math.abs(point.y)})`;
                    pointG.append('text')
                        .attr('x', px + 12).attr('y', py + 8)
                        .attr('fill', 'rgba(148, 163, 184, 0.6)')
                        .attr('font-size', '10px')
                        .style('opacity', 0)
                        .text(coordText)
                        .transition()
                        .delay(showSteps ? index * 300 + 700 : 0)
                        .duration(300)
                        .style('opacity', 1);
                }
            });
        }

        // === ÉTAPE 2: Segments ===
        if (!showSteps || currentStep >= 2) {
            const segmentsGroup = g.append('g').attr('class', 'segments-layer');

            segments.forEach((seg, index) => {
                const p1 = pointMap.get(seg.from);
                const p2 = pointMap.get(seg.to);
                if (!p1 || !p2) return;

                const color = seg.color || '#f43f5e';

                const line = segmentsGroup.append('line')
                    .attr('x1', x(p1.x)).attr('y1', y(p1.y))
                    .attr('x2', x(p1.x)).attr('y2', y(p1.y))
                    .attr('stroke', color)
                    .attr('stroke-width', 2.5)
                    .attr('stroke-linecap', 'round')
                    .style('opacity', showSteps ? 0 : 1);

                if (showSteps) {
                    line.transition()
                        .delay(index * 400 + 200)
                        .duration(600)
                        .style('opacity', 1)
                        .attr('x2', x(p2.x))
                        .attr('y2', y(p2.y));
                } else {
                    line.attr('x2', x(p2.x)).attr('y2', y(p2.y));
                }
            });
        }

        // === ÉTAPE 3: Lignes et Cercles ===
        if (!showSteps || currentStep >= 3) {
            const advancedGroup = g.append('g').attr('class', 'advanced-layer');

            // Lignes
            lines.forEach((line, index) => {
                // Simplification: ligne passant par deux points
                if ('points' in line && Array.isArray(line.points)) {
                    const p1Name = line.points[0];
                    const p2Name = line.points[1];
                    const p1 = pointMap.get(p1Name);
                    const p2 = pointMap.get(p2Name);
                    if (!p1 || !p2) return;

                    const color = line.color || '#34d399';
                    const slope = (p2.y - p1.y) / (p2.x - p1.x);
                    const intercept = p1.y - slope * p1.x;

                    // Étendre la ligne aux bords
                    const x1 = domain.x[0];
                    const x2 = domain.x[1];
                    const y1 = slope * x1 + intercept;
                    const y2 = slope * x2 + intercept;

                    const path = advancedGroup.append('line')
                        .attr('x1', x(x1)).attr('y1', y(y1))
                        .attr('x2', x(x2)).attr('y2', y(y2))
                        .attr('stroke', color)
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '6,4')
                        .style('opacity', 0);

                    if (showSteps) {
                        path.transition()
                            .delay(index * 300 + 200)
                            .duration(500)
                            .style('opacity', 0.7);
                    } else {
                        path.style('opacity', 0.7);
                    }

                    // Nom de la droite
                    if (line.name) {
                        advancedGroup.append('text')
                            .attr('x', x(x2) - 30).attr('y', y(y2) - 10)
                            .attr('fill', color)
                            .attr('font-size', '12px')
                            .attr('font-style', 'italic')
                            .style('opacity', 0)
                            .text(`(${line.name})`)
                            .transition()
                            .delay(showSteps ? index * 300 + 500 : 0)
                            .duration(300)
                            .style('opacity', 0.8);
                    }
                }
            });

            // Cercles
            circles.forEach((circle, index) => {
                const center = pointMap.get(circle.center);
                if (!center) return;

                let radius = circle.radius || 2;
                if (circle.throughPoint) {
                    const through = pointMap.get(circle.throughPoint);
                    if (through) {
                        radius = Math.sqrt(Math.pow(through.x - center.x, 2) + Math.pow(through.y - center.y, 2));
                    }
                }

                const color = circle.color || '#fbbf24';

                // Conversion du rayon en pixels
                const radiusPx = Math.abs(x(center.x + radius) - x(center.x));

                const circleEl = advancedGroup.append('circle')
                    .attr('cx', x(center.x)).attr('cy', y(center.y))
                    .attr('r', 0)
                    .attr('fill', 'none')
                    .attr('stroke', color)
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '4,3')
                    .style('opacity', 0);

                if (showSteps) {
                    circleEl.transition()
                        .delay(lines.length * 300 + index * 400 + 200)
                        .duration(800)
                        .style('opacity', 0.6)
                        .attr('r', radiusPx);
                } else {
                    circleEl.attr('r', radiusPx).style('opacity', 0.6);
                }
            });
        }

        // === ÉTAPE 4: Annotations ===
        if (!showSteps || currentStep >= 4) {
            const annotGroup = g.append('g').attr('class', 'annotations-layer');

            annotations.forEach((annot, index) => {
                if (annot.type === 'midpoint' && annot.points && annot.points.length >= 2) {
                    const p1 = pointMap.get(annot.points[0]);
                    const p2 = pointMap.get(annot.points[1]);
                    if (!p1 || !p2) return;

                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;
                    const label = annot.value as string || 'M';

                    annotGroup.append('circle')
                        .attr('cx', x(mx)).attr('cy', y(my))
                        .attr('r', 4)
                        .attr('fill', '#a78bfa')
                        .style('opacity', 0)
                        .transition()
                        .delay(showSteps ? index * 300 : 0)
                        .duration(400)
                        .style('opacity', 1);

                    annotGroup.append('text')
                        .attr('x', x(mx) + 10).attr('y', y(my) - 8)
                        .attr('fill', '#c4b5fd')
                        .attr('font-size', '12px')
                        .attr('font-style', 'italic')
                        .style('opacity', 0)
                        .text(label)
                        .transition()
                        .delay(showSteps ? index * 300 + 200 : 0)
                        .duration(300)
                        .style('opacity', 1);
                }

                if (annot.type === 'angle' && annot.points && annot.points.length >= 3) {
                    const vertex = pointMap.get(annot.points[1]);
                    if (!vertex) return;

                    // Arc d'angle simplifié
                    const angleRadius = 20;
                    const label = annot.value ? `${annot.value}°` : '';

                    annotGroup.append('circle')
                        .attr('cx', x(vertex.x)).attr('cy', y(vertex.y))
                        .attr('r', angleRadius)
                        .attr('fill', 'rgba(251, 191, 36, 0.2)')
                        .attr('stroke', '#fbbf24')
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '3,2')
                        .style('opacity', 0)
                        .transition()
                        .delay(showSteps ? index * 300 : 0)
                        .duration(400)
                        .style('opacity', 0.8);

                    if (label) {
                        annotGroup.append('text')
                            .attr('x', x(vertex.x) + 25).attr('y', y(vertex.y) - 10)
                            .attr('fill', '#fbbf24')
                            .attr('font-size', '11px')
                            .attr('font-weight', 'bold')
                            .style('opacity', 0)
                            .text(label)
                            .transition()
                            .delay(showSteps ? index * 300 + 200 : 0)
                            .duration(300)
                            .style('opacity', 1);
                    }
                }

                if (annot.type === 'distance' && annot.points && annot.points.length >= 2) {
                    const p1 = pointMap.get(annot.points[0]);
                    const p2 = pointMap.get(annot.points[1]);
                    if (!p1 || !p2) return;

                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;
                    const label = annot.value ? `${annot.value}` : `${annot.points[0]}${annot.points[1]}`;

                    annotGroup.append('text')
                        .attr('x', x(mx)).attr('y', y(my) - 15)
                        .attr('fill', '#f87171')
                        .attr('font-size', '11px')
                        .attr('font-weight', 'bold')
                        .attr('text-anchor', 'middle')
                        .style('opacity', 0)
                        .text(label)
                        .transition()
                        .delay(showSteps ? index * 300 : 0)
                        .duration(300)
                        .style('opacity', 1);
                }

                if (annot.type === 'perpendicular' && annot.points && annot.points.length >= 2) {
                    const p1 = pointMap.get(annot.points[0]);
                    const p2 = pointMap.get(annot.points[1]);
                    if (!p1 || !p2) return;

                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;

                    // Symbole perpendiculaire ⊥
                    annotGroup.append('text')
                        .attr('x', x(mx)).attr('y', y(my))
                        .attr('fill', '#34d399')
                        .attr('font-size', '16px')
                        .attr('text-anchor', 'middle')
                        .style('opacity', 0)
                        .text('⊥')
                        .transition()
                        .delay(showSteps ? index * 300 : 0)
                        .duration(300)
                        .style('opacity', 1);
                }
            });
        }

        // Titre
        if (title) {
            svg.append('text')
                .attr('x', width / 2 + margin.left)
                .attr('y', 25)
                .attr('text-anchor', 'middle')
                .attr('fill', '#e0e7ff')
                .attr('font-weight', 'bold')
                .attr('font-size', '16px')
                .text(title);
        }

    }, [isVisible, currentStep, showSteps, points, segments, lines, circles, annotations, hasCoordinates, domain, title]);

    const replayAnimation = useCallback(() => {
        setCurrentStep(0);
        setIsPlaying(true);
    }, []);

    return (
        <div ref={containerRef} className="my-8 w-full flex flex-col items-center">
            <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-indigo-500/20 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Contrôles */}
                <div className="absolute top-4 right-6 flex items-center gap-3 z-20">
                    <button
                        onClick={replayAnimation}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-cyan-400 transition-all border border-white/5"
                        title="Rejouer l'animation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>

                    {/* Indicateur d'étape */}
                    {showSteps && (
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        currentStep > i ? 'bg-cyan-400' : 'bg-slate-600'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <svg ref={svgRef} width="600" height="450" className="rounded-xl overflow-visible" />
            </div>

            <p className="mt-4 text-[10px] text-slate-500 italic text-center">
                Construction géométrique animée • Bouton Rejouer en haut à droite
            </p>
        </div>
    );
}
