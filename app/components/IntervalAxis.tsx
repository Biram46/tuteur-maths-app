'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * 📏 COMPOSANT DE REPRÉSENTATION GRAPHIQUE DES INTERVALLES
 * Affiche un intervalle sur un axe gradué avec le style français
 * - Point plein pour borne incluse
 * - Point vide pour borne exclue
 * - Respecte les conventions du lycée français
 */

export interface IntervalAxisProps {
    left: number | string;
    right: number | string;
    leftIncluded: boolean;
    rightIncluded: boolean;
    title?: string;
}

export default function IntervalAxis({ left, right, leftIncluded, rightIncluded, title }: IntervalAxisProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [animationPhase, setAnimationPhase] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Conversion des valeurs
    const leftVal = typeof left === 'string' ? (left === '-inf' || left === '-∞' ? -Infinity : parseFloat(left)) : left;
    const rightVal = typeof right === 'string' ? (right === '+inf' || right === '+∞' ? Infinity : parseFloat(right)) : right;

    // Détection de l'animation au scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Animation séquentielle
                    setTimeout(() => setAnimationPhase(1), 200);  // Axe
                    setTimeout(() => setAnimationPhase(2), 600);  // Bornes
                    setTimeout(() => setAnimationPhase(3), 1000); // Segment coloré
                    setTimeout(() => setAnimationPhase(4), 1400); // Labels
                }
            },
            { threshold: 0.3 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Configuration du SVG
    const width = 500;
    const height = 100;
    const axisY = 55;
    const axisStartX = 40;
    const axisEndX = 460;

    // Calcul des positions sur l'axe
    const calculateX = (val: number) => {
        // Définition du domaine avec marges pour les infinis
        let minDomain: number, maxDomain: number;

        if (leftVal === -Infinity && rightVal === Infinity) {
            minDomain = -10;
            maxDomain = 10;
        } else if (leftVal === -Infinity) {
            minDomain = Math.min(rightVal - 10, -5);
            maxDomain = rightVal + 2;
        } else if (rightVal === Infinity) {
            minDomain = leftVal - 2;
            maxDomain = Math.max(leftVal + 10, 5);
        } else {
            const margin = (rightVal - leftVal) * 0.2 || 2;
            minDomain = leftVal - margin;
            maxDomain = rightVal + margin;
        }

        const range = maxDomain - minDomain;
        return axisStartX + ((val - minDomain) / range) * (axisEndX - axisStartX);
    };

    const leftX = leftVal === -Infinity ? axisStartX : calculateX(leftVal);
    const rightX = rightVal === Infinity ? axisEndX : calculateX(rightVal);

    // Formatage des labels
    const formatLabel = (val: number) => {
        if (val === -Infinity) return '-∞';
        if (val === Infinity) return '+∞';
        if (typeof val === 'number') {
            return Number.isInteger(val) ? val.toString() : val.toFixed(1).replace('.', ',');
        }
        return String(val);
    };

    // Notation française de l'intervalle
    const leftBracket = leftIncluded ? '[' : ']';
    const rightBracket = rightIncluded ? ']' : '[';
    const intervalNotation = `${leftBracket}${formatLabel(leftVal)} ; ${formatLabel(rightVal)}${rightBracket}`;

    return (
        <div ref={containerRef} className="my-6 w-full flex flex-col items-center">
            {title && (
                <div className="mb-3 px-4 py-1.5 bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-lg">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{title}</span>
                </div>
            )}

            <div className="relative p-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <svg width={width} height={height} className="overflow-visible">
                    {/* Définitions */}
                    <defs>
                        <marker id="interval-arrow-right" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
                        </marker>
                        <marker id="interval-arrow-left" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                            <path d="M 10 0 L 0 5 L 10 10 z" fill="#4f46e5" />
                        </marker>
                    </defs>

                    {/* Phase 1: Axe principal */}
                    {animationPhase >= 1 && (
                        <g className="animate-in fade-in duration-300">
                            {/* Ligne de l'axe */}
                            <line
                                x1={axisStartX - 15}
                                y1={axisY}
                                x2={axisEndX + 15}
                                y2={axisY}
                                stroke="#1e293b"
                                strokeWidth="2"
                                markerEnd="url(#interval-arrow-right)"
                            />
                            {/* Flèche gauche (vers -∞) */}
                            <line
                                x1={axisStartX - 5}
                                y1={axisY}
                                x2={axisStartX - 20}
                                y2={axisY}
                                stroke="#1e293b"
                                strokeWidth="2"
                                markerEnd="url(#interval-arrow-left)"
                            />
                            {/* Zéro */}
                            <text
                                x={axisStartX + (axisEndX - axisStartX) / 2}
                                y={axisY + 20}
                                textAnchor="middle"
                                className="text-xs fill-slate-500 font-medium"
                            >
                                0
                            </text>
                            <line
                                x1={axisStartX + (axisEndX - axisStartX) / 2}
                                y1={axisY - 5}
                                x2={axisStartX + (axisEndX - axisStartX) / 2}
                                y2={axisY + 5}
                                stroke="#94a3b8"
                                strokeWidth="1"
                            />
                        </g>
                    )}

                    {/* Phase 2: Bornes */}
                    {animationPhase >= 2 && (
                        <g className="animate-in fade-in zoom-in duration-400">
                            {/* Borne gauche */}
                            {leftVal !== -Infinity ? (
                                <g>
                                    {leftIncluded ? (
                                        // Point plein (borne incluse)
                                        <circle cx={leftX} cy={axisY} r={6} fill="#4f46e5" stroke="#312e81" strokeWidth="2" />
                                    ) : (
                                        // Point vide (borne exclue)
                                        <circle cx={leftX} cy={axisY} r={6} fill="white" stroke="#4f46e5" strokeWidth="2.5" />
                                    )}
                                </g>
                            ) : (
                                // Indicateur pour -∞
                                <text x={leftX - 5} y={axisY + 25} textAnchor="middle" className="text-sm fill-indigo-600 font-bold">-∞</text>
                            )}

                            {/* Borne droite */}
                            {rightVal !== Infinity ? (
                                <g>
                                    {rightIncluded ? (
                                        // Point plein (borne incluse)
                                        <circle cx={rightX} cy={axisY} r={6} fill="#4f46e5" stroke="#312e81" strokeWidth="2" />
                                    ) : (
                                        // Point vide (borne exclue)
                                        <circle cx={rightX} cy={axisY} r={6} fill="white" stroke="#4f46e5" strokeWidth="2.5" />
                                    )}
                                </g>
                            ) : (
                                // Indicateur pour +∞
                                <text x={rightX + 5} y={axisY + 25} textAnchor="middle" className="text-sm fill-indigo-600 font-bold">+∞</text>
                            )}
                        </g>
                    )}

                    {/* Phase 3: Segment coloré */}
                    {animationPhase >= 3 && (
                        <g className="animate-in fade-in slide-in-from-left duration-500">
                            {/* Segment de l'intervalle */}
                            <line
                                x1={leftVal === -Infinity ? axisStartX : leftX}
                                y1={axisY}
                                x2={rightVal === Infinity ? axisEndX : rightX}
                                y2={axisY}
                                stroke="#818cf8"
                                strokeWidth="5"
                                strokeLinecap="round"
                                opacity="0.7"
                            />
                        </g>
                    )}

                    {/* Phase 4: Labels des bornes */}
                    {animationPhase >= 4 && (
                        <g className="animate-in fade-in slide-in-from-bottom duration-400">
                            {/* Label borne gauche */}
                            {leftVal !== -Infinity && (
                                <text
                                    x={leftX}
                                    y={axisY - 18}
                                    textAnchor="middle"
                                    className="text-sm font-bold fill-indigo-900"
                                >
                                    {formatLabel(leftVal)}
                                </text>
                            )}

                            {/* Label borne droite */}
                            {rightVal !== Infinity && (
                                <text
                                    x={rightX}
                                    y={axisY - 18}
                                    textAnchor="middle"
                                    className="text-sm font-bold fill-indigo-900"
                                >
                                    {formatLabel(rightVal)}
                                </text>
                            )}
                        </g>
                    )}
                </svg>

                {/* Notation de l'intervalle */}
                {animationPhase >= 4 && (
                    <div className="mt-3 text-center animate-in fade-in duration-300">
                        <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-800 rounded-full font-mono font-bold text-sm">
                            {intervalNotation}
                        </span>
                    </div>
                )}
            </div>

            <p className="mt-2 text-[10px] text-slate-500 italic text-center">
                Représentation graphique • Point plein = inclus • Point vide = exclu
            </p>
        </div>
    );
}
