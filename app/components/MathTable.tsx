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
 * MOTEUR DE RENDU MATHÉMATIQUE "MATH ENGINE" v3.0
 * Fix v3.0 :
 *   - Flèche ligne x : part uniquement après la dernière valeur de x
 *   - Pointillés : uniquement sous les colonnes de specialCols (zéros/annulations)
 *   - Ligne pointillée variation : s'arrête avant la dernière ligne
 */
export default function MathTable({ data, title }: MathTableProps) {
    console.log('🔍 MathTable data:', JSON.stringify(data));
    const rawId = useId();
    const id = rawId.replace(/:/g, '');
    const { xValues, rows } = data;

    const n = xValues.length;

    const labelWidth = 140;
    const cellWidth = 120;
    const rowHeight = 70;
    const headerHeight = 50;

    const totalWidth = labelWidth + (xValues.length * cellWidth) + 60;
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
        if (low.includes('inf')) return t.replace(/inf(ty)?/gi, '∞');
        return t;
    };

    const getXPos = (halfIdx: number) => labelWidth + (halfIdx * (cellWidth / 2)) + (cellWidth / 2);

    const isForbiddenItem = (val: string) => {
        if (!val) return false;
        const d = cleanLabel(val).toLowerCase().trim();
        return (
            d === '||' || d === '|' || d === 'nd' || d === 'double' ||
            d.includes('barre') || d === 'non défini' || d === 'interdite' ||
            d === 'd' || d === 'discontinuité'
        );
    };

    const isSpecialItem = (val: string) => {
        if (!val) return false;
        const d = cleanLabel(val).toLowerCase().trim();
        return (
            d === '0' || d === 'z' || d === 'zero' || isForbiddenItem(val)
        );
    };

    const correctVariationFormat = (content: string[], n: number): string[] => {
        const len = content.length;
        const hasArrows = content.some(it => /nearrow|searrow/i.test(it));
        if (!hasArrows) return content;
        const doubleBarIdx = content.findIndex(it => isForbiddenItem(it));
        if (doubleBarIdx === -1) return content;
        if (len === (n * 2) - 1 && doubleBarIdx % 2 !== 0) {
            const corrected = [...content];
            const correctPosition = Math.floor(n / 2) * 2;
            const temp = corrected[correctPosition];
            corrected[correctPosition] = corrected[doubleBarIdx];
            corrected[doubleBarIdx] = temp;
            return corrected;
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
                if (isForbidden) return (Math.floor(n / 2)) * 2;
                else if (isArrow) {
                    let arrowIdx = 0;
                    for (let i = 0; i < colIndex; i++) {
                        if (/nearrow|searrow/i.test(items[i])) arrowIdx++;
                    }
                    return (arrowIdx * 2) + 1;
                } else {
                    let valueIdx = 0;
                    for (let i = 0; i < colIndex; i++) {
                        const prevItem = items[i];
                        if (!/nearrow|searrow/i.test(prevItem) && !isForbiddenItem(prevItem)) valueIdx++;
                    }
                    return (valueIdx + 1) * 2;
                }
            }
            if (len === (n * 2) + 1) {
                const doubleBarIdx = items.findIndex(it => isForbiddenItem(it));
                if (colIndex < doubleBarIdx) return colIndex;
                else if (colIndex === doubleBarIdx) return (Math.floor(n / 2)) * 2;
                else if (colIndex === doubleBarIdx - 1) return (Math.floor(n / 2)) * 2;
                else if (colIndex === doubleBarIdx + 1) return (Math.floor(n / 2)) * 2;
                else return colIndex - 2;
            }
            if (len === (n * 2) - 1) return colIndex;
            let arrowCount = 0;
            let valueCount = 0;
            for (let i = 0; i < colIndex; i++) {
                if (/nearrow|searrow/i.test(items[i])) arrowCount++;
                else if (!isForbiddenItem(items[i])) valueCount++;
            }
            if (/nearrow|searrow/i.test(item)) return (arrowCount * 2) + 1;
            if (isForbiddenItem(item)) return (valueCount + arrowCount) * 2;
            return valueCount * 2;
        }

        if (len === (n * 2) - 3) return colIndex + 1;
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
            return Math.min((iIdx * 2) + 1, (n * 2) - 3);
        }
    };

    // specialCols = colonnes avec un zéro (pointillé)
    // forbiddenCols = colonnes avec une valeur interdite (double barre)
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
                if (rowIdx === lastSignRowIndex) specialCols.add(halfIdx);
            } else if (isXValuePosition && rowIdx === lastSignRowIndex) {
                // FIX : uniquement les vrais zéros
                const cleaned = cleanLabel(item).toLowerCase().trim();
                if (cleaned === '0' || cleaned === 'z' || cleaned === 'zero') {
                    specialCols.add(halfIdx);
                }
            }
        });

        forbiddenColsByRow.set(rowIdx, forbiddenForThisRow);
    });

    const globalForbiddenCols = forbiddenColsByRow.get(lastSignRowIndex) || new Set<number>();

    // Y limite des pointillés : avant dernière ligne si variation présente
    const specialColsBottomY = variationRowIndex !== -1
        ? totalHeight - rowHeight
        : totalHeight;

    // FIX flèche : part après la dernière valeur de x
    const arrowStartX = getXPos((n - 1) * 2) + 28;
    const arrowEndX = totalWidth - 10;

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
                        <marker id={`nearrow-marker-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                            <path d="M0,10 L10,5 L0,0" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        </marker>
                        <marker id={`searrow-marker-${id}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        </marker>
                    </defs>

                    {/* Fond */}
                    <rect x="0" y="0" width={totalWidth} height={totalHeight} fill="white" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Séparateur label | tableau */}
                    <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalHeight} stroke="#1e293b" strokeWidth="1.5" />

                    {/* Séparateur en-tête | données */}
                    <line x1="0" y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#1e293b" strokeWidth="1.5" />

                    {/* Label x */}
                    <text x={labelWidth / 2} y={headerHeight / 2} dy="0.35em"
                        textAnchor="middle" fontSize="18" fontStyle="italic" fontWeight="bold" fill="#1e293b">
                        x
                    </text>

                    {/* Valeurs de x — ligne horizontale sous les valeurs + FIX pointillés */}
                    {xValues.map((xVal, xIdx) => {
                        const halfIdx = xIdx * 2;
                        const xPos = getXPos(halfIdx);
                        const isForbidden = globalForbiddenCols.has(halfIdx);
                        const isZeroCol = specialCols.has(halfIdx) && !isForbidden;

                        return (
                            <g key={`xval-${xIdx}`}>
                                {/* FIX BUG 2 : séparateur de colonne x — pointillé UNIQUEMENT sous les zéros */}
                                {xIdx > 0 && (
                                    <line
                                        x1={xPos - cellWidth / 2}
                                        y1="0"
                                        x2={xPos - cellWidth / 2}
                                        y2={totalHeight}
                                        stroke="#94a3b8"
                                        strokeWidth="0.5"
                                        strokeDasharray={
                                            isForbidden ? "0" :
                                            isZeroCol ? "3,3" :
                                            "0"  // pas de trait entre colonnes normales
                                        }
                                    />
                                )}
                                <text x={xPos} y={headerHeight / 2} dy="0.35em"
                                    textAnchor="middle" fontSize="14" fill="#1e293b">
                                    {cleanLabel(xVal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* FIX BUG 1 : Flèche axe x — part APRÈS la dernière valeur */}
                    <line
                        x1={arrowStartX}
                        y1={headerHeight / 2}
                        x2={arrowEndX}
                        y2={headerHeight / 2}
                        stroke="#1e293b"
                        strokeWidth="1"
                        markerEnd={`url(#arrow-right-${id})`}
                    />

                    {/* Lignes horizontales entre les lignes de données */}
                    {rows.map((_, rowIdx) => {
                        if (rowIdx === 0) return null;
                        const yTop = headerHeight + rowIdx * rowHeight;
                        return <line key={`sep-${rowIdx}`} x1="0" y1={yTop} x2={totalWidth} y2={yTop} stroke="#1e293b" strokeWidth="1" />;
                    })}

                    {/* DONNÉES */}
                    {rows.map((row, rowIdx) => {
                        const yTop = headerHeight + rowIdx * rowHeight;
                        const yMid = yTop + rowHeight / 2;
                        const rawContent = row.content;
                        const content = row.type === 'variation' ? correctVariationFormat(rawContent, n) : rawContent;
                        const len = content.length;
                        const forbiddenCols = forbiddenColsByRow.get(rowIdx) || new Set<number>();

                        const halfIdxToItem = new Map<number, string>();
                        content.forEach((it, colIndex) => {
                            const eIdx = getEffIdx(colIndex, len, n, content);
                            if (!halfIdxToItem.has(eIdx)) halfIdxToItem.set(eIdx, it);
                        });

                        return (
                            <g key={`row-${rowIdx}`}>
                                {/* Label */}
                                <text x={labelWidth / 2} y={yMid} dy="0.35em"
                                    textAnchor="middle" fontSize="13" fontStyle="italic" fill="#1e293b">
                                    {cleanLabel(row.label)}
                                </text>

                                {/* Double barre valeurs interdites */}
                                {Array.from(forbiddenCols).map(halfIdx => {
                                    const xPos = getXPos(halfIdx);
                                    return (
                                        <g key={`forbidden-${rowIdx}-${halfIdx}`}>
                                            <rect x={xPos - 8} y={yTop} width={16} height={rowHeight} fill="#f1f5f9" />
                                            <line x1={xPos - 4} y1={yTop} x2={xPos - 4} y2={yTop + rowHeight} stroke="#1e293b" strokeWidth="1.5" />
                                            <line x1={xPos + 4} y1={yTop} x2={xPos + 4} y2={yTop + rowHeight} stroke="#1e293b" strokeWidth="1.5" />
                                        </g>
                                    );
                                })}

                                {/* Pointillés sous les zéros — FIX BUG 3 : s'arrêtent avant dernière ligne si variation */}
                                {Array.from(specialCols)
                                    .filter(halfIdx => !globalForbiddenCols.has(halfIdx))
                                    .map(halfIdx => {
                                        const xPos = getXPos(halfIdx);
                                        const isLastRow = rowIdx === rows.length - 1;
                                        if (isLastRow && variationRowIndex !== -1) return null;
                                        return (
                                            <line
                                                key={`special-dot-${rowIdx}-${halfIdx}`}
                                                x1={xPos} y1={yTop}
                                                x2={xPos} y2={yTop + rowHeight}
                                                stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,4"
                                            />
                                        );
                                    })}

                                {/* Contenu */}
                                {row.type === 'variation' ? (
                                    (() => {
                                        const arrows: React.JSX.Element[] = [];

                                        for (let halfIdx = 0; halfIdx < n * 2; halfIdx += 2) {
                                            const val = halfIdxToItem.get(halfIdx);
                                            if (!val || isForbiddenItem(val)) continue;
                                            const xPos = getXPos(halfIdx);
                                            const leftArrow = halfIdxToItem.get(halfIdx - 1);
                                            const rightArrow = halfIdxToItem.get(halfIdx + 1);
                                            let yVal = yMid;
                                            if (leftArrow && /nearrow/i.test(leftArrow)) yVal = yTop + 12;
                                            else if (leftArrow && /searrow/i.test(leftArrow)) yVal = yTop + rowHeight - 12;
                                            else if (rightArrow && /nearrow/i.test(rightArrow)) yVal = yTop + rowHeight - 12;
                                            else if (rightArrow && /searrow/i.test(rightArrow)) yVal = yTop + 12;
                                            arrows.push(
                                                <text key={`val-${halfIdx}`} x={xPos} y={yVal} dy="0.35em"
                                                    textAnchor="middle" fontSize="13" fill="#1e293b">
                                                    {cleanLabel(val)}
                                                </text>
                                            );
                                        }

                                        for (let halfIdx = 1; halfIdx < n * 2 - 1; halfIdx += 2) {
                                            const val = halfIdxToItem.get(halfIdx);
                                            if (!val) continue;
                                            const xStart = getXPos(halfIdx - 1);
                                            const xEnd = getXPos(halfIdx + 1);
                                            const leftVal = halfIdxToItem.get(halfIdx - 1);
                                            const rightVal = halfIdxToItem.get(halfIdx + 1);
                                            const leftIsForbidden = leftVal ? isForbiddenItem(leftVal) : false;
                                            const rightIsForbidden = rightVal ? isForbiddenItem(rightVal) : false;
                                            const margin = 20;
                                            let yStart = yMid;
                                            let yEnd = yMid;

                                            if (/nearrow/i.test(val)) {
                                                yStart = yTop + rowHeight - margin;
                                                yEnd = yTop + margin;
                                            } else if (/searrow/i.test(val)) {
                                                yStart = yTop + margin;
                                                yEnd = yTop + rowHeight - margin;
                                            }

                                            if (leftVal && !leftIsForbidden) {
                                                const leftArrowPrev = halfIdxToItem.get(halfIdx - 2);
                                                if (/nearrow/i.test(val) && leftArrowPrev && /nearrow/i.test(leftArrowPrev)) yStart = yTop + margin;
                                                if (/nearrow/i.test(val) && leftArrowPrev && /searrow/i.test(leftArrowPrev)) yStart = yTop + rowHeight - margin;
                                                if (/searrow/i.test(val) && leftArrowPrev && /nearrow/i.test(leftArrowPrev)) yStart = yTop + margin;
                                                if (/searrow/i.test(val) && leftArrowPrev && /searrow/i.test(leftArrowPrev)) yStart = yTop + rowHeight - margin;
                                            }

                                            const xStartAdjusted = leftIsForbidden ? xStart + 12 : xStart + (leftVal && !leftIsForbidden ? 20 : 5);
                                            const xEndAdjusted = rightIsForbidden ? xEnd - 12 : xEnd - (rightVal && !rightIsForbidden ? 20 : 5);

                                            if (/nearrow/i.test(val)) {
                                                arrows.push(<line key={`arrow-${halfIdx}`} x1={xStartAdjusted} y1={yStart} x2={xEndAdjusted} y2={yEnd}
                                                    stroke="#1e293b" strokeWidth="1.5" markerEnd={`url(#nearrow-marker-${id})`} />);
                                            } else if (/searrow/i.test(val)) {
                                                arrows.push(<line key={`arrow-${halfIdx}`} x1={xStartAdjusted} y1={yStart} x2={xEndAdjusted} y2={yEnd}
                                                    stroke="#1e293b" strokeWidth="1.5" markerEnd={`url(#searrow-marker-${id})`} />);
                                            }
                                        }
                                        return arrows;
                                    })()
                                ) : (
                                    (() => {
                                        const cells: React.JSX.Element[] = [];
                                        for (let halfIdx = 0; halfIdx < (n * 2) - 1; halfIdx++) {
                                            const val = halfIdxToItem.get(halfIdx);
                                            if (!val || isForbiddenItem(val)) continue;
                                            const xPos = getXPos(halfIdx);
                                            if (val === '0' || val.toLowerCase() === 'z' || val.toLowerCase() === 'zero') {
                                                cells.push(<text key={`cell-${halfIdx}`} x={xPos} y={yMid} dy="0.35em"
                                                    textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">0</text>);
                                            } else {
                                                const isPositive = val.trim() === '+';
                                                const isNegative = val.trim() === '-';
                                                cells.push(<text key={`cell-${halfIdx}`} x={xPos} y={yMid} dy="0.35em"
                                                    textAnchor="middle" fontSize="20" fontWeight="bold"
                                                    fill={isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#1e293b'}>
                                                    {val.trim()}
                                                </text>);
                                            }
                                        }
                                        return cells;
                                    })()
                                )}
                            </g>
                        );
                    })}

                    {/* Pointillés globaux forbidden — s'arrêtent à specialColsBottomY */}
                    {Array.from(globalForbiddenCols).map(halfIdx => {
                        const xPos = getXPos(halfIdx);
                        return (
                            <line key={`global-forbidden-line-${halfIdx}`}
                                x1={xPos} y1={headerHeight}
                                x2={xPos} y2={specialColsBottomY}
                                stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" opacity="0.3"
                            />
                        );
                    })}

                    {/* Titre */}
                    {title && (
                        <text x={totalWidth / 2} y={totalHeight + 20} dy="0.35em"
                            textAnchor="middle" fontSize="12" fill="#64748b" fontStyle="italic">
                            {title}
                        </text>
                    )}
                </svg>
            </div>
        </div>
    );
}
