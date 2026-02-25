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
 * 📊 MOTEUR DE RENDU MATHÉMATIQUE "MATH ENGINE" v2.7
 * Précision chirurgicale et design institutionnel français.
 */
export default function MathTable({ data, title }: MathTableProps) {
    const rawId = useId();
    const id = rawId.replace(/:/g, '');
    const { xValues, rows } = data;

    // --- VALIDATION DU FORMAT ---
    const n = xValues.length;
    const expectedSlots = (n * 2) - 3;

    // --- CONFIGURATION GÉOMÉTRIQUE ---
    const labelWidth = 140;
    const cellWidth = 120;
    const rowHeight = 70;
    const headerHeight = 50;

    const totalWidth = labelWidth + (xValues.length * cellWidth) + 60; // +60 pour sécurité bord droit
    const totalHeight = headerHeight + (rows.length * rowHeight);

    const cleanLabel = (text: string) => {
        if (!text) return "";
        // Normalisation agressive pour la détection : on enlève dollars, backslashes et on trimme
        let t = text.replace(/\$/g, '').replace(/\\/g, '').trim();
        const low = t.toLowerCase();

        // Map des symboles institutionnels
        const map: Record<string, string> = {
            'inf': '∞', 'infty': '∞',
            '-inf': '-∞', '+inf': '+∞',
            '-infty': '-∞', '+infty': '+∞',
        };

        if (map[low]) return map[low];

        // Gestion des résidus d'infini
        if (low.includes('inf')) {
            return t.replace(/inf(ty)?/gi, '∞');
        }

        return t;
    };

    // --- LOGIQUE D'ALIGNEMENT ET COLONNES SPÉCIALES ---
    // Système de coordonnées par "demi-colonne" (half-indices)
    // 0: x0, 1: interval(x0,x1), 2: x1, 3: interval(x1,x2)...
    const getXPos = (halfIdx: number) => labelWidth + (halfIdx * (cellWidth / 2)) + (cellWidth / 2);

    /**
     * Identifie si un contenu de cellule correspond à un séparateur vertical (0 ou ||)
     */
    const isSpecialItem = (val: string) => {
        if (!val) return false;
        const d = cleanLabel(val).toLowerCase().trim();
        return (
            d === '0' || d === 'z' || d === 'zero' ||
            d === '||' || d === '|' || d === 'nd' || d === 'double' ||
            d.includes('barre') || d === 'non défini' || d === 'interdite' ||
            d === 'd' || d === 'discontinuité'
        );
    };

    /**
     * Identifie si un contenu de cellule doit déclencher une DOUBLE BARRE (valeur interdite)
     */
    const isForbiddenItem = (val: string) => {
        if (!val) return false;
        const d = cleanLabel(val).toLowerCase().trim();
        return (
            d === '||' || d === '|' || d === 'nd' || d === 'double' ||
            d.includes('barre') || d === 'non défini' || d === 'interdite' ||
            d === 'd' || d === 'discontinuité'
        );
    };

    /**
     * Calcule l'index effectif dans le système de demi-colonnes
     * Système: 0=x0, 1=interval, 2=x1, 3=interval, 4=x2, ...
     *
     * Format 2N-3: N valeurs x, 2N-3 slots
     * - Slots impairs (0,2,4,...) → intervalles → positions 1,3,5,...
     * - Slots pairs (1,3,5,...) → points critiques → positions 2,4,6,...
     */
    const getEffIdx = (colIndex: number, len: number, n: number, items: string[]) => {
        const item = items[colIndex] || "";
        const isSp = isSpecialItem(item);

        // Cas 1 : Format 2N-3 (Standard institutionnel)
        // Ex: x: -inf, -1, 1, +inf (N=4) → 5 slots: +,0,-,||,+
        // Slot 0(+) → pos 1, Slot 1(0) → pos 2, Slot 2(-) → pos 3, Slot 3(||) → pos 4, Slot 4(+) → pos 5
        if (len === (n * 2) - 3) {
            return colIndex + 1;
        }

        // Cas 2 : Format 2N-1 (Complet avec première/dernière valeur)
        if (len === (n * 2) - 1) return colIndex;

        // Cas 3 : Heuristique par type - les points critiques vont sur les valeurs x (positions paires)
        if (isSp) {
            let sIdx = 0;
            for (let i = 0; i < colIndex; i++) {
                if (isSpecialItem(items[i])) sIdx++;
            }
            // Position du sIdx-ème point critique (0-indexed) → position 2*(sIdx+1)
            return Math.min((sIdx + 1) * 2, (n - 1) * 2);
        } else {
            // Signes sur les intervalles
            let iIdx = 0;
            for (let i = 0; i < colIndex; i++) {
                if (!isSpecialItem(items[i])) iIdx++;
            }
            const target = (iIdx * 2) + 1;
            return Math.min(target, (n * 2) - 3);
        }
    };

    // Collecte des colonnes spéciales par ligne (pour les lignes verticales)
    // specialCols : colonnes avec "0" (ligne pointillée sur tout le tableau)
    // forbiddenCols : colonnes avec "||" (double barre sur la dernière ligne uniquement)
    const specialCols = new Set<number>();
    const forbiddenColsByRow: Map<number, Set<number>> = new Map();

    rows.forEach((row, rowIndex) => {
        const n = xValues.length;
        const rowForbiddenCols = new Set<number>();
        row.content.forEach((item, idx) => {
            const effIdx = getEffIdx(idx, row.content.length, n, row.content);
            if (isSpecialItem(item)) {
                specialCols.add(effIdx);
            }
            if (isForbiddenItem(item)) {
                rowForbiddenCols.add(effIdx);
            }
        });
        forbiddenColsByRow.set(rowIndex, rowForbiddenCols);
    });

    // Les doubles barres ne sont dessinées que sur la dernière ligne
    const lastRowIndex = rows.length - 1;
    const forbiddenCols = forbiddenColsByRow.get(lastRowIndex) || new Set<number>();

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

                        {/* Lignes pointillées pour les 0 (traversent tout le tableau) */}
                        {Array.from(specialCols).map(colIdx => {
                            // On ne dessine de ligne verticale QUE sous une valeur de x (indice pair)
                            // ET seulement si ce n'est PAS une valeur interdite (||)
                            if (colIdx % 2 !== 0) return null;
                            if (forbiddenCols.has(colIdx)) return null; // Les || sont dessinés séparément

                            const x = getXPos(colIdx);
                            return <line key={`v-s-${colIdx}`} x1={x} y1={headerHeight} x2={x} y2={totalHeight} stroke="#1e293b" strokeDasharray="4,4" strokeWidth="1.5" />;
                        })}

                        {/* Lignes pointillées sous les valeurs interdites (de la 1ère à l'avant-dernière ligne) */}
                        {Array.from(forbiddenCols).map(colIdx => {
                            if (colIdx % 2 !== 0) return null;

                            const x = getXPos(colIdx);
                            // De la 1ère ligne (ligne x) jusqu'à l'avant-dernière ligne (avant f(x))
                            const dottedStartY = headerHeight;
                            const dottedEndY = headerHeight + (rows.length - 1) * rowHeight;

                            return (
                                <line key={`v-d-${colIdx}`} x1={x} y1={dottedStartY} x2={x} y2={dottedEndY} stroke="#1e293b" strokeDasharray="4,4" strokeWidth="1.5" />
                            );
                        })}

                        {/* Doubles barres || UNIQUEMENT sur la dernière ligne */}
                        {Array.from(forbiddenCols).map(colIdx => {
                            if (colIdx % 2 !== 0) return null;

                            const x = getXPos(colIdx);
                            // Dessiner uniquement sur la dernière ligne
                            const lastRowYStart = headerHeight + (rows.length - 1) * rowHeight;
                            const lastRowYEnd = headerHeight + rows.length * rowHeight;

                            return (
                                <g key={`v-f-${colIdx}`}>
                                    <line x1={x - 3} y1={lastRowYStart} x2={x - 3} y2={lastRowYEnd} stroke="#dc2626" strokeWidth="2.5" />
                                    <line x1={x + 3} y1={lastRowYStart} x2={x + 3} y2={lastRowYEnd} stroke="#dc2626" strokeWidth="2.5" />
                                </g>
                            );
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
                                        const display = cleanLabel(item);
                                        const displayLower = display.toLowerCase();

                                        if (row.type === 'sign') {
                                            const isZero = displayLower === '0' || displayLower === 'z';
                                            if (isZero) {
                                                return (
                                                    <g key={`s-${rowIndex}-${slotIdx}`}>
                                                        <circle cx={xPos} cy={yMid} r="7" fill="white" stroke="#64748b" />
                                                        <text x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-mono text-[10px] font-bold fill-black">0</text>
                                                    </g>
                                                );
                                            }
                                            const isDoubleBar = isForbiddenItem(item);
                                            if (isDoubleBar) return null; // Géré par la ligne verticale globale

                                            // Les signes ne s'affichent que sur les INTERVALLES (positions impaires)
                                            // Les positions paires correspondent aux valeurs de x
                                            if (item === "" || item === " " || halfIdx % 2 === 0) return null;

                                            // Vérification : un signe doit être + ou -
                                            if (display !== '+' && display !== '-') return null;

                                            return <text key={`s-${rowIndex}-${slotIdx}`} x={xPos} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-lg font-bold fill-slate-800">{display}</text>;
                                        }

                                        if (row.type === 'variation') {
                                            const isDoubleBar = isForbiddenItem(item);

                                            if (isDoubleBar) {
                                                return (
                                                    <g key={`v-${rowIndex}-${slotIdx}`}>
                                                        <line x1={xPos - 2} y1={yBase + 2} x2={xPos - 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                        <line x1={xPos + 2} y1={yBase + 2} x2={xPos + 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                    </g>
                                                );
                                            }

                                            // Détection flèche vs valeur
                                            const entries = displayLower.split('/').map(v => v.trim());
                                            const val = entries[0];
                                            const pos = entries[1] || "";

                                            const isUp = /nearrow|up/i.test(displayLower);
                                            const isDown = /searrow|down/i.test(displayLower);

                                            if (isUp) return <line key={`v-${rowIndex}-${slotIdx}`} x1={xPos - 25} y1={yBase + rowHeight - 15} x2={xPos + 25} y2={yBase + 15} stroke="#4f46e5" strokeWidth="3" markerEnd={`url(#arrow-${id})`} />;
                                            if (isDown) return <line key={`v-${rowIndex}-${slotIdx}`} x1={xPos - 25} y1={yBase + 15} x2={xPos + 25} y2={yBase + rowHeight - 15} stroke="#4f46e5" strokeWidth="3" markerEnd={`url(#arrow-${id})`} />;

                                            // Positionnement vertical de la valeur (haut, bas ou milieu)
                                            let isBot = pos === '-' || (halfIdx % 2 === 0 && row.content[itemIdx + 1]?.includes('near')) || (itemIdx > 0 && row.content[itemIdx - 1]?.includes('sea'));
                                            let isTop = pos === '+' || (halfIdx % 2 === 0 && row.content[itemIdx + 1]?.includes('sea')) || (itemIdx > 0 && row.content[itemIdx - 1]?.includes('near'));

                                            if (!pos && !isBot && !isTop) {
                                                if (val.includes('-')) isBot = true;
                                                else if (val.includes('+')) isTop = true;
                                            }

                                            const yPos = isBot ? yBase + rowHeight - 15 : (isTop ? yBase + 15 : yMid);
                                            return <text key={`v-${rowIndex}-${slotIdx}`} x={xPos} y={yPos} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[13px] font-black fill-black">{display}</text>;
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
