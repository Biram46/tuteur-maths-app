'use client';

import { useId } from 'react';

export interface MathTableProps {
    data: {
        xValues: string[];
        rows: {
            label: string;
            type: 'sign' | 'variation';
            content: string[]; // Signes (+, -, 0, ||) ou Valeurs/Flèches
        }[];
    };
    title?: string;
}

/**
 * 📊 COMPOSANT DE TABLEAU DE SIGNES ET VARIATIONS (STYLE TKZ-TAB)
 * Rendu professionnel SVG pour une précision mathématique totale.
 */
export default function MathTable({ data, title }: MathTableProps) {
    const id = useId();
    const { xValues, rows } = data;

    // Dimensions de base
    const labelWidth = 150;
    const cellWidth = 80;
    const rowHeight = 60;
    const headerHeight = 50;

    const totalWidth = labelWidth + (xValues.length * cellWidth);
    const totalHeight = headerHeight + (rows.length * rowHeight);

    // Fonction pour nettoyer le LaTeX simple pour le SVG (KaTeX est mieux mais ici on fait du SVG direct)
    const cleanLabel = (text: string) => text.replace(/\$/g, '');

    return (
        <div className="my-10 w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="relative p-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-x-auto max-w-full custom-scrollbar-horizontal">
                <svg
                    width={totalWidth}
                    height={totalHeight}
                    viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                    className="bg-white rounded-xl"
                >
                    {/* --- CADRE ET GRILLE --- */}
                    <rect width={totalWidth} height={totalHeight} fill="white" />

                    {/* Ligne horizontale sous le header (x) */}
                    <line x1="0" y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#000" strokeWidth="2" />

                    {/* Ligne verticale après les labels */}
                    <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalHeight} stroke="#000" strokeWidth="2" />

                    {/* --- LIGNES HORIZONTALES ENTRE LES RANGÉES --- */}
                    {rows.map((_, i) => (
                        <line
                            key={`h-line-${i}`}
                            x1="0"
                            y1={headerHeight + (i + 1) * rowHeight}
                            x2={totalWidth}
                            y2={headerHeight + (i + 1) * rowHeight}
                            stroke="#000"
                            strokeWidth="1"
                        />
                    ))}

                    {/* --- ENTÊTE (LIGNE X) --- */}
                    <text x={labelWidth / 2} y={headerHeight / 2} textAnchor="middle" dominantBaseline="middle" className="font-serif italic text-lg" fill="#000">x</text>
                    {xValues.map((val, i) => (
                        <text
                            key={`x-${i}`}
                            x={labelWidth + i * cellWidth + cellWidth / 2}
                            y={headerHeight / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="font-serif text-sm"
                            fill="#000"
                        >
                            {cleanLabel(val)}
                        </text>
                    ))}

                    {/* --- RANGÉES (SIGNES OU VARIATIONS) --- */}
                    {rows.map((row, rowIndex) => {
                        const yBase = headerHeight + rowIndex * rowHeight;
                        const yMid = yBase + rowHeight / 2;

                        return (
                            <g key={`row-${rowIndex}`}>
                                {/* Label de la rangée */}
                                <text
                                    x={labelWidth / 2}
                                    y={yMid}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="font-serif text-sm"
                                    fill="#000"
                                >
                                    {cleanLabel(row.label)}
                                </text>

                                {/* Contenu de la rangée */}
                                {row.content.map((item, colIndex) => {
                                    const xPos = labelWidth + colIndex * (cellWidth / 2) + (cellWidth / 4);

                                    // Rendu des signes (+, -, 0, ||)
                                    if (row.type === 'sign') {
                                        let display = cleanLabel(item).trim();
                                        if (display === '0') {
                                            // Barre verticale pointillée avec 0
                                            return (
                                                <g key={`col-${rowIndex}-${colIndex}`}>
                                                    <line x1={xPos} y1={yBase + 5} x2={xPos} y2={yBase + rowHeight - 5} stroke="#ccc" strokeDasharray="2,2" />
                                                    <text x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-sm font-bold" fill="#000">0</text>
                                                </g>
                                            );
                                        }
                                        if (display === '||') {
                                            // Double barre (Valeur interdite)
                                            return (
                                                <g key={`col-${rowIndex}-${colIndex}`}>
                                                    <line x1={xPos - 2} y1={yBase + 2} x2={xPos - 2} y2={yBase + rowHeight - 2} stroke="#000" strokeWidth="1" />
                                                    <line x1={xPos + 2} y1={yBase + 2} x2={xPos + 2} y2={yBase + rowHeight - 2} stroke="#000" strokeWidth="1" />
                                                </g>
                                            );
                                        }
                                        return (
                                            <text
                                                key={`col-${rowIndex}-${colIndex}`}
                                                x={xPos}
                                                y={yMid}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="font-serif text-lg"
                                                fill="#000"
                                            >
                                                {display}
                                            </text>
                                        );
                                    }

                                    // Rendu des variations (Flèches et valeurs)
                                    if (row.type === 'variation') {
                                        const [cleanItem, position] = item.split('/').map(s => s.trim().toLowerCase());
                                        const isBottom = position === '-' || position === 'min';
                                        const isTop = position === '+' || position === 'max';

                                        // Détection de flèche
                                        if (cleanItem === 'up' || cleanItem === 'croissant' || cleanItem === '->' || cleanItem === 'nearrow') {
                                            return (
                                                <line
                                                    key={`col-${rowIndex}-${colIndex}`}
                                                    x1={xPos - cellWidth / 4 + 5}
                                                    y1={yBase + rowHeight - 15}
                                                    x2={xPos + cellWidth / 4 - 5}
                                                    y2={yBase + 15}
                                                    stroke="#2563eb"
                                                    strokeWidth="2"
                                                    markerEnd={`url(#arrow-${id})`}
                                                />
                                            );
                                        }
                                        if (cleanItem === 'down' || cleanItem === 'decroissant' || cleanItem === '<-' || cleanItem === 'searrow') {
                                            return (
                                                <line
                                                    key={`col-${rowIndex}-${colIndex}`}
                                                    x1={xPos - cellWidth / 4 + 5}
                                                    y1={yBase + 15}
                                                    x2={xPos + cellWidth / 4 - 5}
                                                    y2={yBase + rowHeight - 15}
                                                    stroke="#2563eb"
                                                    strokeWidth="2"
                                                    markerEnd={`url(#arrow-${id})`}
                                                />
                                            );
                                        }

                                        // C'est une valeur
                                        const yPos = isBottom ? yBase + rowHeight - 10 : (isTop ? yBase + 15 : yMid);

                                        return (
                                            <text
                                                key={`col-${rowIndex}-${colIndex}`}
                                                x={xPos}
                                                y={yPos}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="font-serif text-[10px] font-bold"
                                                fill="#000"
                                            >
                                                {cleanLabel(cleanItem)}
                                            </text>
                                        );
                                    }

                                    return null;
                                })}
                            </g>
                        );
                    })}

                    {/* Définition de la flèche */}
                    <defs>
                        <marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                        </marker>
                    </defs>
                </svg>

                {/* Badge style TikZ */}
                <div className="absolute top-2 right-4 flex items-center gap-2">
                    <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">TikZ Tab Engine v1.0</span>
                </div>
            </div>
            {title && <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{title}</p>}
        </div>
    );
}
