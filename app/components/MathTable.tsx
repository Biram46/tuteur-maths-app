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
 * 📊 MOTEUR DE RENDU MATHÉMATIQUE "MATH ENGINE" v2.8
 * Précision chirurgicale et design institutionnel français.
 * Fix cross-browser : dy="0.35em" (Safari/iOS), SVG responsive, suppression console.log
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
        let t = text.replace(/\$/g, '').replace(/\\/g, '').trim();
        const low = t.toLowerCase();

        const map: Record<string, string> = {
            'inf': '∞', 'infty': '∞',
            '-inf': '-∞', '+inf': '+∞',
            '-infty': '-∞', '+infty': '+∞',
        };

        if (map[low]) return map[low];

        if (low.includes('inf')) {
            return t.replace(/inf(ty)?/gi, '∞');
        }

        return t;
    };

    // --- LOGIQUE D'ALIGNEMENT ET COLONNES SPÉCIALES ---
    const getXPos = (halfIdx: number) => labelWidth + (halfIdx * (cellWidth / 2)) + (cellWidth / 2);

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

    const isForbiddenItem = (val: string) => {
        if (!val) return false;
        const d = cleanLabel(val).toLowerCase().trim();
        return (
            d === '||' || d === '|' || d === 'nd' || d === 'double' ||
            d.includes('barre') || d === 'non défini' || d === 'interdite' ||
            d === 'd' || d === 'discontinuité'
        );
    };

    const correctVariationFormat = (content: string[], n: number): string[] => {
        const len = content.length;

        const hasArrows = content.some(it => /nearrow|searrow/i.test(it));
        if (!hasArrows) return content;

        const doubleBarIdx = content.findIndex(it => isForbiddenItem(it));
        if (doubleBarIdx === -1) return content;

        if (len === (n * 2) - 1) {
            if (doubleBarIdx % 2 !== 0) {
                const corrected = [...content];
                const correctPosition = Math.floor(n / 2) * 2;
                const temp = corrected[correctPosition];
                corrected[correctPosition] = corrected[doubleBarIdx];
                corrected[doubleBarIdx] = temp;
                return corrected;
            }
        }

        if (len === (n * 2) + 1) {
            const expectedDoubleBarPos = n;
            if (doubleBarIdx !== expectedDoubleBarPos) {
                const corrected = [...content];
                const temp = corrected[expectedDoubleBarPos];
                corrected[expectedDoubleBarPos] = corrected[doubleBarIdx];
                corrected[doubleBarIdx] = temp;
                return corrected;
            }
        }

        return content;
    };

    const getEffIdx = (colIndex: number, len: number, n: number, items: string[]) => {
        const item = items[colIndex] || "";
        const isSp = isSpecialItem(item);

        const isVariationRow = items.some(it => /nearrow|searrow/i.test(it));

        if (isVariationRow) {
            const isShortFormat = len === n - 1 || len === n || len === (n * 2) - 3;

            if (isShortFormat) {
                const isArrow = /nearrow|searrow/i.test(item);
                const isForbidden = isForbiddenItem(item);

                if (isForbidden) {
                    return (Math.floor(n / 2)) * 2;
                } else if (isArrow) {
                    let arrowIdx = 0;
                    for (let i = 0; i < colIndex; i++) {
                        if (/nearrow|searrow/i.test(items[i])) arrowIdx++;
                    }
                    return (arrowIdx * 2) + 1;
                } else {
                    let valueIdx = 0;
                    for (let i = 0; i < colIndex; i++) {
                        const prevItem = items[i];
                        if (!/nearrow|searrow/i.test(prevItem) && !isForbiddenItem(prevItem)) {
                            valueIdx++;
                        }
                    }
                    return (valueIdx + 1) * 2;
                }
            }

            if (len === (n * 2) + 1) {
                const doubleBarIdx = items.findIndex(it => isForbiddenItem(it));

                if (colIndex < doubleBarIdx) {
                    return colIndex;
                } else if (colIndex === doubleBarIdx) {
                    return (Math.floor(n / 2)) * 2;
                } else if (colIndex === doubleBarIdx - 1) {
                    return (Math.floor(n / 2)) * 2;
                } else if (colIndex === doubleBarIdx + 1) {
                    return (Math.floor(n / 2)) * 2;
                } else {
                    return colIndex - 2;
                }
            }

            if (len === (n * 2) - 1) {
                return colIndex;
            }

            let arrowCount = 0;
            let valueCount = 0;

            for (let i = 0; i < colIndex; i++) {
                if (/nearrow|searrow/i.test(items[i])) {
                    arrowCount++;
                } else if (!isForbiddenItem(items[i])) {
                    valueCount++;
                }
            }

            if (/nearrow|searrow/i.test(item)) {
                return (arrowCount * 2) + 1;
            }

            if (isForbiddenItem(item)) {
                return (valueCount + arrowCount) * 2;
            }

            return valueCount * 2;
        }

        if (len === (n * 2) - 3) {
            return colIndex + 1;
        }

        if (len === (n * 2) - 1) return colIndex;

        if (isSp) {
            let sIdx = 0;
            for (let i = 0; i < colIndex; i++) {
                if (isSpecialItem(items[i])) sIdx++;
            }
            return Math.min((sIdx + 1) * 2, (n - 1) * 2);
        } else {
            let iIdx = 0;
            for (let i = 0; i < colIndex; i++) {
                if (!isSpecialItem(items[i])) iIdx++;
            }
            const target = (iIdx * 2) + 1;
            return Math.min(target, (n * 2) - 3);
        }
    };

    const specialCols = new Set<number>();
    const forbiddenColsByRow: Map<number, Set<number>> = new Map();

    const variationRowIndex = rows.findIndex(row => row.type === 'variation');

    const lastSignRowIndex = rows.reduce((last, row, idx) => row.type === 'sign' ? idx : last, -1);

    rows.forEach((row, rowIdx) => {
        const rawContent = row.content;
        const content = row.type === 'variation' ? correctVariationFormat(rawContent, n) : rawContent;
        const len = content.length;
        const forbiddenForThisRow = new Set<number>();

        content.forEach((item, colIndex) => {
            const eIdx = getEffIdx(colIndex, len, n, content);
            const halfIdx = eIdx;
            const isXValuePosition = halfIdx % 2 === 0;

            if (isForbiddenItem(item) && isXValuePosition) {
                forbiddenForThisRow.add(halfIdx);
                if (rowIdx === lastSignRowIndex) {
                    specialCols.add(halfIdx);
                }
            } else if (isSpecialItem(item) && item !== '||' && item !== '|' && !isForbiddenItem(item)) {
                if (isXValuePosition && rowIdx === lastSignRowIndex) {
                    specialCols.add(halfIdx);
                }
            }
        });

        forbiddenColsByRow.set(rowIdx, forbiddenForThisRow);
    });

    const globalForbiddenCols = forbiddenColsByRow.get(lastSignRowIndex) || new Set<number>();

    // --- RENDU ---
    return (
        <div className="w-full overflow-x-auto my-6 custom-scrollbar-horizontal">
            <div style={{ minWidth: `${totalWidth}px` }}>
                <svg
                    width="100%"
                    height={totalHeight}
                    viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                    preserveAspectRatio="xMinYMid meet"
                    style={{ display: 'block', fontFamily: 'serif' }}
                >
                    <defs>
                        <marker id={`arrow-right-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#1e293b" />
                        </marker>
                        <marker id={`arrow-up-${id}`} markerWidth="8" markerHeight="8" refX="3" refY="6" orient="auto">
                            <path d="M0,8 L6,8 L3,0 z" fill="#1e293b" />
                        </marker>
                        <marker id={`nearrow-marker-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                            <path d="M0,10 L10,5 L0,0" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        </marker>
                        <marker id={`searrow-marker-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        </marker>
                    </defs>

                    {/* Fond blanc */}
                    <rect x="0" y="0" width={totalWidth} height={totalHeight} fill="white" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Ligne verticale après le label */}
                    <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalHeight} stroke="#1e293b" strokeWidth="1.5" />

                    {/* Ligne horizontale après l'en-tête */}
                    <line x1="0" y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#1e293b" strokeWidth="1.5" />

                    {/* En-tête "x" */}
                    <text
                        x={labelWidth / 2}
                        y={headerHeight / 2}
                        dy="0.35em"
                        textAnchor="middle"
                        fontSize="18"
                        fontStyle="italic"
                        fontWeight="bold"
                        fill="#1e293b"
                    >
                        x
                    </text>

                    {/* Valeurs de x dans l'en-tête */}
                    {xValues.map((xVal, xIdx) => {
                        const halfIdx = xIdx * 2;
                        const xPos = getXPos(halfIdx);
                        const isForbidden = globalForbiddenCols.has(halfIdx);

                        return (
                            <g key={`xval-${xIdx}`}>
                                {/* Ligne verticale de séparation des colonnes x */}
                                {xIdx > 0 && (
                                    <line
                                        x1={xPos - cellWidth / 2}
                                        y1="0"
                                        x2={xPos - cellWidth / 2}
                                        y2={totalHeight}
                                        stroke="#94a3b8"
                                        strokeWidth="0.5"
                                        strokeDasharray={isForbidden ? "0" : "3,3"}
                                    />
                                )}
                                <text
                                    x={xPos}
                                    y={headerHeight / 2}
                                    dy="0.35em"
                                    textAnchor="middle"
                                    fontSize="14"
                                    fill="#1e293b"
                                >
                                    {cleanLabel(xVal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* LIGNES DE DONNÉES */}
                    {rows.map((row, rowIdx) => {
                        const yTop = headerHeight + rowIdx * rowHeight;
                        const yMid = yTop + rowHeight / 2;
                        const rawContent = row.content;
                        const content = row.type === 'variation' ? correctVariationFormat(rawContent, n) : rawContent;
                        const len = content.length;
                        const forbiddenCols = forbiddenColsByRow.get(rowIdx) || new Set<number>();

                        // Ligne horizontale de séparation
                        if (rowIdx > 0) {
                            return (
                                <g key={`row-sep-${rowIdx}`}>
                                    <line x1="0" y1={yTop} x2={totalWidth} y2={yTop} stroke="#1e293b" strokeWidth="1" />
                                </g>
                            );
                        }
                        return null;
                    })}

                    {rows.map((row, rowIdx) => {
                        const yTop = headerHeight + rowIdx * rowHeight;
                        const yMid = yTop + rowHeight / 2;
                        const rawContent = row.content;
                        const content = row.type === 'variation' ? correctVariationFormat(rawContent, n) : rawContent;
                        const len = content.length;
                        const forbiddenCols = forbiddenColsByRow.get(rowIdx) || new Set<number>();

                        // Map halfIdx → item pour cette ligne
                        const halfIdxToItem = new Map<number, string>();
                        content.forEach((it, colIndex) => {
                            const eIdx = getEffIdx(colIndex, len, n, content);
                            if (!halfIdxToItem.has(eIdx)) {
                                halfIdxToItem.set(eIdx, it);
                            }
                        });

                        return (
                            <g key={`row-${rowIdx}`}>
                                {/* Ligne horizontale de séparation */}
                                {rowIdx > 0 && (
                                    <line x1="0" y1={yTop} x2={totalWidth} y2={yTop} stroke="#1e293b" strokeWidth="1" />
                                )}

                                {/* Label de la ligne */}
                                <text
                                    x={labelWidth / 2}
                                    y={yMid}
                                    dy="0.35em"
                                    textAnchor="middle"
                                    fontSize="13"
                                    fontStyle="italic"
                                    fill="#1e293b"
                                >
                                    {cleanLabel(row.label)}
                                </text>

                                {/* Colonnes spéciales : double barre pour les valeurs interdites */}
                                {Array.from(forbiddenCols).map(halfIdx => {
                                    const xPos = getXPos(halfIdx);
                                    return (
                                        <g key={`forbidden-${rowIdx}-${halfIdx}`}>
                                            <rect
                                                x={xPos - 8}
                                                y={yTop}
                                                width={16}
                                                height={rowHeight}
                                                fill="#f1f5f9"
                                            />
                                            <line x1={xPos - 4} y1={yTop} x2={xPos - 4} y2={yTop + rowHeight} stroke="#1e293b" strokeWidth="1.5" />
                                            <line x1={xPos + 4} y1={yTop} x2={xPos + 4} y2={yTop + rowHeight} stroke="#1e293b" strokeWidth="1.5" />
                                        </g>
                                    );
                                })}

                                {/* Lignes pointillées pour les colonnes avec "0" (non-interdites) */}
                                {Array.from(specialCols)
                                    .filter(halfIdx => !globalForbiddenCols.has(halfIdx))
                                    .map(halfIdx => {
                                        const xPos = getXPos(halfIdx);
                                        return (
                                            <line
                                                key={`special-dot-${rowIdx}-${halfIdx}`}
                                                x1={xPos}
                                                y1={yTop}
                                                x2={xPos}
                                                y2={yTop + rowHeight}
                                                stroke="#94a3b8"
                                                strokeWidth="1"
                                                strokeDasharray="4,4"
                                            />
                                        );
                                    })}

                                {/* Rendu du contenu des cellules */}
                                {row.type === 'variation' ? (
                                    // RENDU VARIATION : flèches SVG
                                    (() => {
                                        const arrows: React.JSX.Element[] = [];

                                        // Valeurs aux positions des x
                                        for (let halfIdx = 0; halfIdx < n * 2; halfIdx += 2) {
                                            const val = halfIdxToItem.get(halfIdx);
                                            if (!val) continue;
                                            const isForbidden = isForbiddenItem(val);
                                            if (isForbidden) continue; // La double barre est déjà dessinée

                                            const xPos = getXPos(halfIdx);

                                            // Déterminer la position verticale (haut ou bas) selon le contexte
                                            // Regarder les flèches adjacentes
                                            const leftArrow = halfIdxToItem.get(halfIdx - 1);
                                            const rightArrow = halfIdxToItem.get(halfIdx + 1);

                                            let yVal = yMid;
                                            if (leftArrow && /nearrow/i.test(leftArrow)) yVal = yTop + 12; // flèche montante arrive en haut
                                            else if (leftArrow && /searrow/i.test(leftArrow)) yVal = yTop + rowHeight - 12; // flèche descendante arrive en bas
                                            else if (rightArrow && /nearrow/i.test(rightArrow)) yVal = yTop + rowHeight - 12; // flèche montante part du bas
                                            else if (rightArrow && /searrow/i.test(rightArrow)) yVal = yTop + 12; // flèche descendante part du haut

                                            arrows.push(
                                                <text
                                                    key={`val-${halfIdx}`}
                                                    x={xPos}
                                                    y={yVal}
                                                    dy="0.35em"
                                                    textAnchor="middle"
                                                    fontSize="13"
                                                    fill="#1e293b"
                                                >
                                                    {cleanLabel(val)}
                                                </text>
                                            );
                                        }

                                        // Flèches sur les intervalles
                                        for (let halfIdx = 1; halfIdx < n * 2 - 1; halfIdx += 2) {
                                            const val = halfIdxToItem.get(halfIdx);
                                            if (!val) continue;

                                            const xStart = getXPos(halfIdx - 1);
                                            const xEnd = getXPos(halfIdx + 1);

                                            // Déterminer les valeurs aux extrémités pour la hauteur des flèches
                                            const leftVal = halfIdxToItem.get(halfIdx - 1);
                                            const rightVal = halfIdxToItem.get(halfIdx + 1);

                                            const leftIsForbidden = leftVal ? isForbiddenItem(leftVal) : false;
                                            const rightIsForbidden = rightVal ? isForbiddenItem(rightVal) : false;

                                            let yStart = yMid;
                                            let yEnd = yMid;

                                            const margin = 20;

                                            if (/nearrow/i.test(val)) {
                                                yStart = leftIsForbidden ? yTop + rowHeight - margin : (leftVal ? yTop + rowHeight - margin : yTop + rowHeight - margin);
                                                yEnd = rightIsForbidden ? yTop + margin : (rightVal ? yTop + margin : yTop + margin);
                                            } else if (/searrow/i.test(val)) {
                                                yStart = leftIsForbidden ? yTop + margin : (leftVal ? yTop + margin : yTop + margin);
                                                yEnd = rightIsForbidden ? yTop + rowHeight - margin : (rightVal ? yTop + rowHeight - margin : yTop + rowHeight - margin);
                                            }

                                            // Ajustement selon les valeurs adjacentes réelles
                                            if (leftVal && !leftIsForbidden && !isForbiddenItem(leftVal)) {
                                                const leftArrowPrev = halfIdxToItem.get(halfIdx - 2);
                                                if (/nearrow/i.test(val) && leftArrowPrev && /nearrow/i.test(leftArrowPrev)) yStart = yTop + margin;
                                                if (/nearrow/i.test(val) && leftArrowPrev && /searrow/i.test(leftArrowPrev)) yStart = yTop + rowHeight - margin;
                                                if (/searrow/i.test(val) && leftArrowPrev && /nearrow/i.test(leftArrowPrev)) yStart = yTop + margin;
                                                if (/searrow/i.test(val) && leftArrowPrev && /searrow/i.test(leftArrowPrev)) yStart = yTop + rowHeight - margin;
                                            }

                                            const xStartAdjusted = leftIsForbidden ? xStart + 12 : xStart + (leftVal && !leftIsForbidden ? 20 : 5);
                                            const xEndAdjusted = rightIsForbidden ? xEnd - 12 : xEnd - (rightVal && !rightIsForbidden ? 20 : 5);

                                            if (/nearrow/i.test(val)) {
                                                arrows.push(
                                                    <line
                                                        key={`arrow-${halfIdx}`}
                                                        x1={xStartAdjusted}
                                                        y1={yStart}
                                                        x2={xEndAdjusted}
                                                        y2={yEnd}
                                                        stroke="#1e293b"
                                                        strokeWidth="1.5"
                                                        markerEnd={`url(#nearrow-marker-${id})`}
                                                    />
                                                );
                                            } else if (/searrow/i.test(val)) {
                                                arrows.push(
                                                    <line
                                                        key={`arrow-${halfIdx}`}
                                                        x1={xStartAdjusted}
                                                        y1={yStart}
                                                        x2={xEndAdjusted}
                                                        y2={yEnd}
                                                        stroke="#1e293b"
                                                        strokeWidth="1.5"
                                                        markerEnd={`url(#searrow-marker-${id})`}
                                                    />
                                                );
                                            }
                                        }

                                        return arrows;
                                    })()
                                ) : (
                                    // RENDU SIGNE : texte (+, -, 0, ||)
                                    (() => {
                                        const cells: React.JSX.Element[] = [];

                                        for (let halfIdx = 0; halfIdx < (n * 2) - 1; halfIdx++) {
                                            const val = halfIdxToItem.get(halfIdx);
                                            if (!val) continue;

                                            const xPos = getXPos(halfIdx);
                                            const isForbidden = isForbiddenItem(val);

                                            if (isForbidden) continue; // Déjà géré par la double barre

                                            if (val === '0' || val.toLowerCase() === 'z' || val.toLowerCase() === 'zero') {
                                                cells.push(
                                                    <text
                                                        key={`cell-${halfIdx}`}
                                                        x={xPos}
                                                        y={yMid}
                                                        dy="0.35em"
                                                        textAnchor="middle"
                                                        fontSize="16"
                                                        fontWeight="bold"
                                                        fill="#1e293b"
                                                    >
                                                        0
                                                    </text>
                                                );
                                            } else {
                                                const isPositive = val.trim() === '+';
                                                const isNegative = val.trim() === '-';
                                                cells.push(
                                                    <text
                                                        key={`cell-${halfIdx}`}
                                                        x={xPos}
                                                        y={yMid}
                                                        dy="0.35em"
                                                        textAnchor="middle"
                                                        fontSize="20"
                                                        fontWeight="bold"
                                                        fill={isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#1e293b'}
                                                    >
                                                        {val.trim()}
                                                    </text>
                                                );
                                            }
                                        }

                                        return cells;
                                    })()
                                )}
                            </g>
                        );
                    })}

                    {/* Lignes pointillées globales pour les colonnes spéciales (descendent dans toutes les lignes) */}
                    {Array.from(globalForbiddenCols).map(halfIdx => {
                        const xPos = getXPos(halfIdx);
                        return (
                            <line
                                key={`global-forbidden-line-${halfIdx}`}
                                x1={xPos}
                                y1={headerHeight}
                                x2={xPos}
                                y2={totalHeight}
                                stroke="#1e293b"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                                opacity="0.3"
                            />
                        );
                    })}

                    {/* Flèche axe x */}
                    <line
                        x1={labelWidth + 10}
                        y1={headerHeight / 2}
                        x2={totalWidth - 20}
                        y2={headerHeight / 2}
                        stroke="#1e293b"
                        strokeWidth="1"
                        markerEnd={`url(#arrow-right-${id})`}
                    />

                    {/* Titre du tableau */}
                    {title && (
                        <text
                            x={totalWidth / 2}
                            y={totalHeight + 20}
                            dy="0.35em"
                            textAnchor="middle"
                            fontSize="12"
                            fill="#64748b"
                            fontStyle="italic"
                        >
                            {title}
                        </text>
                    )}
                </svg>
            </div>
        </div>
    );
}




