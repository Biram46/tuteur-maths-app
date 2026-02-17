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
    const rawId = useId();
    const id = rawId.replace(/:/g, ''); // Important pour les IDs SVG
    const { xValues, rows } = data;

    // Dimensions de base augmentées pour éviter les chevauchements
    const labelWidth = 160;
    const cellWidth = 120; // Plus large pour l'infini et les flèches
    const rowHeight = 70;
    const headerHeight = 50;

    const totalWidth = labelWidth + (xValues.length * cellWidth);
    const totalHeight = headerHeight + (rows.length * rowHeight);

    // Fonction pour nettoyer et traduire le LaTeX/abréviations pour le SVG
    const cleanLabel = (text: string) => {
        let t = text.replace(/\$/g, '').trim();
        // Traductions courantes
        const map: Record<string, string> = {
            'inf': '∞',
            '-inf': '-∞',
            '+inf': '+∞',
            '\\infty': '∞',
            '-\\infty': '-∞',
            '+\\infty': '+∞',
            '\\alpha': 'α',
            '\\beta': 'β',
            '\\gamma': 'γ'
        };
        const lowerT = t.toLowerCase();
        return map[lowerT] || t;
    };

    return (
        <div className="my-10 w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="relative p-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-x-auto max-w-full custom-scrollbar-horizontal">
                <svg
                    width={totalWidth}
                    height={totalHeight}
                    viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                    className="bg-white rounded-xl"
                >
                    <defs>
                        <marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                        </marker>
                    </defs>

                    {/* --- CADRE ET GRILLE --- */}
                    <rect width={totalWidth} height={totalHeight} fill="white" />

                    <line x1="0" y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#000" strokeWidth="2" />
                    <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalHeight} stroke="#000" strokeWidth="2" />

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
                            className="font-serif text-sm font-bold"
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
                                <text
                                    x={labelWidth / 2}
                                    y={yMid}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="font-serif text-sm font-bold"
                                    fill="#000"
                                >
                                    {cleanLabel(row.label)}
                                </text>

                                {row.content.map((item, colIndex) => {
                                    // Calcul précis du centrage
                                    const xPos = labelWidth + (colIndex * (cellWidth / 2)) + (cellWidth / 2);

                                    if (row.type === 'sign') {
                                        let display = cleanLabel(item).trim();
                                        if (display === '0' || display === 'z') {
                                            return (
                                                <g key={`col-${rowIndex}-${colIndex}`}>
                                                    <line x1={xPos} y1={yBase + 5} x2={xPos} y2={yBase + rowHeight - 5} stroke="#ccc" strokeDasharray="4,4" />
                                                    <circle cx={xPos} cy={yMid} r="7" fill="white" />
                                                    <text x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-xs font-bold" fill="#000">0</text>
                                                </g>
                                            );
                                        }
                                        if (display === '||' || display === 'double' || display === 'd') {
                                            return (
                                                <g key={`col-${rowIndex}-${colIndex}`}>
                                                    <line x1={xPos - 2} y1={yBase + 2} x2={xPos - 2} y2={yBase + rowHeight - 2} stroke="#000" strokeWidth="1.5" />
                                                    <line x1={xPos + 2} y1={yBase + 2} x2={xPos + 2} y2={yBase + rowHeight - 2} stroke="#000" strokeWidth="1.5" />
                                                </g>
                                            );
                                        }
                                        return (
                                            <text key={`col-${rowIndex}-${colIndex}`} x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-base font-bold" fill="#000">{display}</text>
                                        );
                                    }

                                    if (row.type === 'variation') {
                                        const parts = item.split('/');
                                        const raw = parts[0].trim();
                                        const posHint = parts[1]?.trim().toLowerCase();
                                        const cleanItem = raw.toLowerCase().replace(/\\/g, '');

                                        // Détection robuste des flèches
                                        const isUp = /nearrow|up|croiss/i.test(cleanItem);
                                        const isDown = /searrow|down|decroiss/i.test(cleanItem);

                                        if (isUp) {
                                            return (
                                                <line
                                                    key={`col-${rowIndex}-${colIndex}`}
                                                    x1={xPos - 20} y1={yBase + rowHeight - 15}
                                                    x2={xPos + 20} y2={yBase + 15}
                                                    stroke="#2563eb" strokeWidth="3"
                                                    markerEnd={`url(#arrow-${id})`}
                                                />
                                            );
                                        }
                                        if (isDown) {
                                            return (
                                                <line
                                                    key={`col-${rowIndex}-${colIndex}`}
                                                    x1={xPos - 20} y1={yBase + 15}
                                                    x2={xPos + 20} y2={yBase + rowHeight - 15}
                                                    stroke="#2563eb" strokeWidth="3"
                                                    markerEnd={`url(#arrow-${id})`}
                                                />
                                            );
                                        }

                                        // Valeurs : Positionnement intelligent
                                        let isBottom = posHint === '-' || posHint === 'min';
                                        let isTop = posHint === '+' || posHint === 'max';

                                        if (!posHint) {
                                            const next = row.content[colIndex + 1]?.toLowerCase();
                                            const prev = row.content[colIndex - 1]?.toLowerCase();
                                            if (next?.includes('near') || prev?.includes('sea')) isBottom = true;
                                            else if (next?.includes('sea') || prev?.includes('near')) isTop = true;
                                        }

                                        const yPos = isBottom ? yBase + rowHeight - 15 : (isTop ? yBase + 15 : yMid);

                                        return (
                                            <text
                                                key={`col-${rowIndex}-${colIndex}`}
                                                x={xPos}
                                                y={yPos}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="font-serif text-sm font-bold"
                                                fill="#000"
                                            >
                                                {cleanLabel(raw)}
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
