'use client';

import { useId } from 'react';

export interface MathTableProps {
    data: {
        xValues: string[];
        rows: {
            label: string;
            type: 'sign' | 'variation';
            content: string[];
        }[];
    };
    title?: string;
}

/**
 * 📊 MOTEUR DE RENDU MATHÉMATIQUE "QUANTUM TABLE" v2.5
 * Précision chirurgicale et design institutionnel français.
 */
export default function MathTable({ data, title }: MathTableProps) {
    const rawId = useId();
    const id = rawId.replace(/:/g, '');
    const { xValues, rows } = data;

    // --- CONFIGURATION GÉOMÉTRIQUE ---
    const labelWidth = 140;
    const cellWidth = 120;
    const rowHeight = 70;
    const headerHeight = 50;

    // Nombre de slots de contenu : 2*N - 1
    const totalSlots = (xValues.length * 2) - 1;
    const totalWidth = labelWidth + (xValues.length * cellWidth);
    const totalHeight = headerHeight + (rows.length * rowHeight);

    const cleanLabel = (text: string) => {
        let t = text.replace(/\$/g, '').replace(/\\/g, '').trim().toLowerCase();
        const map: Record<string, string> = {
            'inf': '∞', 'infty': '∞',
            '-inf': '-∞', '+inf': '+∞',
            '-infty': '-∞', '+infty': '+∞',
        };
        if (map[t]) return map[t];
        if (t.includes('inf')) return t.replace(/inf(ty)?/g, '∞');
        return text.replace(/\$/g, '').trim();
    };

    return (
        <div className="my-12 w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative p-[1px] bg-indigo-500/20 rounded-2xl shadow-xl overflow-hidden max-w-full">
                <div className="bg-white rounded-[15px] overflow-x-auto custom-scrollbar-horizontal">
                    <svg
                        width={totalWidth}
                        height={totalHeight}
                        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                        className="min-w-full"
                    >
                        <defs>
                            <marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
                            </marker>
                        </defs>

                        <rect width={totalWidth} height={totalHeight} fill="white" />

                        {/* Grille principale */}
                        <line x1="0" y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#334155" strokeWidth="2" />
                        <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalHeight} stroke="#334155" strokeWidth="2" />

                        {rows.map((_, i) => (
                            <line key={`h-${i}`} x1="0" y1={headerHeight + (i + 1) * rowHeight} x2={totalWidth} y2={headerHeight + (i + 1) * rowHeight} stroke="#e2e8f0" strokeWidth="1" />
                        ))}

                        {/* --- LIGNE X --- */}
                        <text x={labelWidth / 2} y={headerHeight / 2} textAnchor="middle" dominantBaseline="middle" className="font-serif italic text-lg fill-slate-800">x</text>
                        {xValues.map((val, i) => {
                            const x = labelWidth + (i * cellWidth) + (cellWidth / 2);
                            return (
                                <text key={`x-${i}`} x={x} y={headerHeight / 2} textAnchor="middle" dominantBaseline="middle" className="font-serif text-sm font-bold fill-slate-900">
                                    {cleanLabel(val)}
                                </text>
                            );
                        })}

                        {/* --- RANGÉES --- */}
                        {rows.map((row, rowIndex) => {
                            const yBase = headerHeight + rowIndex * rowHeight;
                            const yMid = yBase + rowHeight / 2;

                            return (
                                <g key={`row-${rowIndex}`}>
                                    <text x={labelWidth / 2} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-sm font-semibold fill-indigo-900">{cleanLabel(row.label)}</text>

                                    {row.content.map((item, colIndex) => {
                                        // Position X calculée par slot de demi-cellule
                                        const xPos = labelWidth + (colIndex * (cellWidth / 2)) + (cellWidth / 2);
                                        const display = cleanLabel(item);

                                        if (row.type === 'sign') {
                                            if (display === '0' || display === 'z') {
                                                return (
                                                    <g key={`s-${rowIndex}-${colIndex}`}>
                                                        <line x1={xPos} y1={yBase + 5} x2={xPos} y2={yBase + rowHeight - 5} stroke="#cbd5e1" strokeDasharray="3,3" />
                                                        <circle cx={xPos} cy={yMid} r="6" fill="white" stroke="#94a3b8" />
                                                        <text x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-mono text-[9px] font-bold">0</text>
                                                    </g>
                                                );
                                            }
                                            if (display === '||' || display === 'd') {
                                                return (
                                                    <g key={`s-${rowIndex}-${colIndex}`}>
                                                        <line x1={xPos - 2} y1={yBase + 5} x2={xPos - 2} y2={yBase + rowHeight - 5} stroke="#000" strokeWidth="1.5" />
                                                        <line x1={xPos + 2} y1={yBase + 5} x2={xPos + 2} y2={yBase + rowHeight - 5} stroke="#000" strokeWidth="1.5" />
                                                    </g>
                                                );
                                            }
                                            return <text key={`s-${rowIndex}-${colIndex}`} x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-lg fill-slate-800">{display}</text>;
                                        }

                                        if (row.type === 'variation') {
                                            const [val, pos] = display.split('/');
                                            const isUp = /nearrow|up/i.test(val);
                                            const isDown = /searrow|down/i.test(val);

                                            if (isUp) return <line key={`v-${rowIndex}-${colIndex}`} x1={xPos - 20} y1={yBase + rowHeight - 15} x2={xPos + 20} y2={yBase + 15} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />;
                                            if (isDown) return <line key={`v-${rowIndex}-${colIndex}`} x1={xPos - 20} y1={yBase + 15} x2={xPos + 20} y2={yBase + rowHeight - 15} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />;

                                            let isBot = pos === '-' || (colIndex % 2 === 0 && row.content[colIndex + 1]?.includes('near')) || (colIndex > 0 && row.content[colIndex - 1]?.includes('sea'));
                                            let isTop = pos === '+' || (colIndex % 2 === 0 && row.content[colIndex + 1]?.includes('sea')) || (colIndex > 0 && row.content[colIndex - 1]?.includes('near'));

                                            if (!pos && !isBot && !isTop) {
                                                if (val.includes('-')) isBot = true;
                                                else if (val.includes('+')) isTop = true;
                                            }

                                            const yPos = isBot ? yBase + rowHeight - 15 : (isTop ? yBase + 15 : yMid);
                                            return <text key={`v-${rowIndex}-${colIndex}`} x={xPos} y={yPos} textAnchor="middle" dominantBaseline="middle" className="font-serif text-xs font-bold fill-slate-900">{val}</text>;
                                        }
                                        return null;
                                    })}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
            {title && <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">{title}</p>}
        </div>
    );
}
