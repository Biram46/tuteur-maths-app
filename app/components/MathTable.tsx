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
 * 📊 MOTEUR DE RENDU MATHÉMATIQUE "MATH ENGINE" v2.6
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

    const totalWidth = labelWidth + (xValues.length * cellWidth) + 60; // +60 pour sécurité bord droit
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

    // --- LOGIQUE D'ALIGNEMENT ET COLONNES SPÉCIALES ---
    // Système de coordonnées par "demi-colonne" (half-indices)
    // 0: x0, 1: interval(x0,x1), 2: x1, 3: interval(x1,x2)...
    const getXPos = (halfIdx: number) => labelWidth + (halfIdx * (cellWidth / 2)) + (cellWidth / 2);

    const getEffIdx = (colIndex: number, len: number, n: number, items: string[]) => {
        const expectedFull = (n * 2) - 1;
        const expectedMid = (n * 2) - 3;

        // Cas 1 : Format complet (2N-1) -> Correspondance directe 0..2N-2
        if (len === expectedFull) return colIndex;

        // Cas 2 : Format milieu (2N-3) -> Correspondance 1..2N-3
        if (len === expectedMid) return colIndex + 1;

        const currentItem = items[colIndex] ? cleanLabel(items[colIndex]).toLowerCase() : "";
        const isSpecial = currentItem === '0' || currentItem === 'z' || currentItem === '||' || currentItem === 'nd' || currentItem === 'd' || currentItem === 'double' || currentItem.includes('barre');

        // Cas spécial : Heuristique d'alignement sur les x_i (indices pairs)
        if (isSpecial) {
            let specialCountBefore = 0;
            for (let i = 0; i < colIndex; i++) {
                const prev = items[i] ? cleanLabel(items[i]).toLowerCase() : "";
                if (prev === '0' || prev === 'z' || prev === '||' || prev === 'nd' || prev === 'd' || prev === 'double') specialCountBefore++;
            }
            return (specialCountBefore + 1) * 2;
        }

        // Sinon, remplissage d'intervalles séquentiels (indices impairs)
        let intervalCountBefore = 0;
        for (let i = 0; i < colIndex; i++) {
            const prev = items[i] ? cleanLabel(items[i]).toLowerCase() : "";
            const isPrevSpecial = prev === '0' || prev === 'z' || prev === '||' || prev === 'nd' || prev === 'd' || prev === 'double';
            if (!isPrevSpecial) intervalCountBefore++;
        }
        return (intervalCountBefore * 2) + 1;
    };

    const specialCols = new Set<number>();
    const forbiddenCols = new Set<number>();
    rows.forEach(row => {
        const n = xValues.length;
        const len = row.content.length;
        row.content.forEach((item, idx) => {
            const d = cleanLabel(item).toLowerCase();
            const effIdx = getEffIdx(idx, len, n, row.content);
            if (d === '0' || d === 'z' || d === '||' || d === 'nd' || d === 'd' || d === 'double' || d.includes('barre')) {
                specialCols.add(effIdx);
                if (d === '||' || d === 'nd' || d === 'd' || d === 'double' || d.includes('barre')) forbiddenCols.add(effIdx);
            }
        });
    });

    return (
        <div className="my-10 w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="relative p-[1px] bg-slate-200 rounded-2xl shadow-xl overflow-hidden max-w-full">
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
                        <line x1="0" y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#000" strokeWidth="2" />
                        <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalHeight} stroke="#000" strokeWidth="2" />

                        {/* Rappels verticaux pour 0 et || (à travers tout le tableau) */}
                        {Array.from(specialCols).map(colIdx => {
                            // SÉCURITÉ : On ne dessine de ligne verticale QUE sous une valeur de x (indice pair)
                            if (colIdx % 2 !== 0) return null;

                            const x = getXPos(colIdx);
                            if (forbiddenCols.has(colIdx)) {
                                return (
                                    <g key={`v-f-${colIdx}`}>
                                        <line x1={x - 3} y1={headerHeight} x2={x - 3} y2={totalHeight} stroke="#dc2626" strokeWidth="2.5" />
                                        <line x1={x + 3} y1={headerHeight} x2={x + 3} y2={totalHeight} stroke="#dc2626" strokeWidth="2.5" />
                                    </g>
                                );
                            }
                            return <line key={`v-s-${colIdx}`} x1={x} y1={headerHeight} x2={x} y2={totalHeight} stroke="#1e293b" strokeDasharray="4,4" strokeWidth="1.5" />;
                        })}

                        {rows.map((_, i) => (
                            <line key={`h-${i}`} x1="0" y1={headerHeight + (i + 1) * rowHeight} x2={totalWidth} y2={headerHeight + (i + 1) * rowHeight} stroke="#cbd5e1" strokeWidth="1" />
                        ))}

                        {/* --- LIGNE X --- */}
                        <text x={labelWidth / 2} y={headerHeight / 2} textAnchor="middle" dominantBaseline="middle" className="font-serif italic text-lg fill-slate-800">x</text>
                        {xValues.map((val, i) => {
                            const x = getXPos(i * 2);
                            return (
                                <text key={`x-${i}`} x={x} y={headerHeight / 2} textAnchor="middle" dominantBaseline="middle" className="font-serif text-sm font-bold fill-black">
                                    {cleanLabel(val)}
                                </text>
                            );
                        })}

                        {/* --- RANGÉES --- */}
                        {rows.map((row, rowIndex) => {
                            const yBase = headerHeight + rowIndex * rowHeight;
                            const yMid = yBase + rowHeight / 2;
                            const n = xValues.length;
                            const expectedMax = (n * 2) - 1;

                            return (
                                <g key={`row-${rowIndex}`}>
                                    <text x={labelWidth / 2} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[11px] font-bold fill-indigo-900">{cleanLabel(row.label)}</text>

                                    {/* On itère sur TOUS les slots (indices 0 à 2n-2) */}
                                    {Array.from({ length: expectedMax }).map((_, slotIdx) => {
                                        const halfIdx = slotIdx;
                                        const itemIdx = row.content.findIndex((_, idx) => getEffIdx(idx, row.content.length, n, row.content) === halfIdx);
                                        let item = itemIdx !== -1 ? row.content[itemIdx] : "";

                                        const xPos = getXPos(halfIdx);
                                        const display = cleanLabel(item).toLowerCase();

                                        if (row.type === 'sign') {
                                            const isZero = display === '0' || display === 'z';
                                            if (isZero) {
                                                return (
                                                    <g key={`s-${rowIndex}-${slotIdx}`}>
                                                        <circle cx={xPos} cy={yMid} r="7" fill="white" stroke="#64748b" />
                                                        <text x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-mono text-[10px] font-bold fill-black">0</text>
                                                    </g>
                                                );
                                            }
                                            const isDoubleBar = display === '||' || display === 'd' || display === 'double' || display === 'nd' || display === 'non défini' || display === 'undefined' || display === 'n.d.' || display.includes('barre') || display.includes('interdite');
                                            if (isDoubleBar) return null; // Géré par la ligne verticale globale

                                            // Si c'est vide mais qu'on a une barre verticale globale ici, on ne met rien
                                            if (item === "" && specialCols.has(slotIdx)) return null;

                                            return <text key={`s-${rowIndex}-${slotIdx}`} x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-lg font-bold fill-slate-800">{item.replace(/\$/g, '')}</text>;
                                        }

                                        if (row.type === 'variation') {
                                            const displayLower = display;
                                            const isDoubleBar = displayLower === '||' || displayLower === 'd' || displayLower === 'double' || displayLower === 'nd' || displayLower === 'non défini' || displayLower === 'undefined' || displayLower === 'n.d.' || displayLower.includes('barre') || displayLower.includes('interdite');

                                            if (isDoubleBar) {
                                                return (
                                                    <g key={`v-${rowIndex}-${slotIdx}`}>
                                                        <line x1={xPos - 2} y1={yBase + 2} x2={xPos - 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                        <line x1={xPos + 2} y1={yBase + 2} x2={xPos + 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                    </g>
                                                );
                                            }

                                            const [val, pos] = displayLower.split('/');
                                            const isUp = /nearrow|up/i.test(val);
                                            const isDown = /searrow|down/i.test(val);

                                            if (isUp) return <line key={`v-${rowIndex}-${slotIdx}`} x1={xPos - 25} y1={yBase + rowHeight - 15} x2={xPos + 25} y2={yBase + 15} stroke="#4f46e5" strokeWidth="3" markerEnd={`url(#arrow-${id})`} />;
                                            if (isDown) return <line key={`v-${rowIndex}-${slotIdx}`} x1={xPos - 25} y1={yBase + 15} x2={xPos + 25} y2={yBase + rowHeight - 15} stroke="#4f46e5" strokeWidth="3" markerEnd={`url(#arrow-${id})`} />;

                                            // Pour les variations, on force souvent le haut/bas si pas précisé
                                            // halfIdx pair = sous une valeur de x
                                            let isBot = pos === '-' || (halfIdx % 2 === 0 && row.content[itemIdx + 1]?.includes('near')) || (itemIdx > 0 && row.content[itemIdx - 1]?.includes('sea'));
                                            let isTop = pos === '+' || (halfIdx % 2 === 0 && row.content[itemIdx + 1]?.includes('sea')) || (itemIdx > 0 && row.content[itemIdx - 1]?.includes('near'));

                                            if (!pos && !isBot && !isTop) {
                                                if (val.includes('-')) isBot = true;
                                                else if (val.includes('+')) isTop = true;
                                            }

                                            const yPos = isBot ? yBase + rowHeight - 15 : (isTop ? yBase + 15 : yMid);
                                            return <text key={`v-${rowIndex}-${slotIdx}`} x={xPos} y={yPos} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[13px] font-black fill-black">{val}</text>;
                                        }
                                        return null;
                                    })}
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <div className="absolute top-2 right-4 pointer-events-none opacity-20">
                    <span className="text-[8px] font-mono font-bold uppercase tracking-tighter">MATH-ENGINE v2.6</span>
                </div>
            </div>
            {title && <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{title}</p>}
        </div>
    );
}
