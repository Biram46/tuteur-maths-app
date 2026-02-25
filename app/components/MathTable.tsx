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
     * CORRECTION AUTOMATIQUE du format de variation
     * Si l'IA génère un format incorrect (ex: || à une position impaire),
     * cette fonction corrige le contenu pour respecter le format attendu.
     */
    const correctVariationFormat = (content: string[], n: number): string[] => {
        if (content.length !== (n * 2) - 1) return content;

        // Détecter si c'est une ligne de variations
        const hasArrows = content.some(it => /nearrow|searrow/i.test(it));
        if (!hasArrows) return content;

        // Trouver la position du ||
        const doubleBarIdx = content.findIndex(it => isForbiddenItem(it));
        if (doubleBarIdx === -1) return content; // Pas de ||, pas besoin de correction

        // Le || doit être à une position PAIRE (sous une valeur de x)
        // Si N=3, les positions paires sont 0, 2, 4
        // Le || doit être à la position 2 (sous la valeur du milieu)

        if (doubleBarIdx % 2 !== 0) {
            // Le || est à une position impaire (intervalle) - FORMAT INCORRECT !
            // On doit le déplacer à la position paire la plus proche
            // Pour N=3, le || doit être à la position 2 (sous xValues[1])

            // Créer un nouveau contenu corrigé
            const corrected = [...content];

            // Trouver la position correcte pour || (sous la valeur interdite)
            // Pour une fonction homographique, c'est généralement la position du milieu
            const correctPosition = Math.floor(n / 2) * 2; // Pour N=3: position 2

            // Échanger les éléments
            const temp = corrected[correctPosition];
            corrected[correctPosition] = corrected[doubleBarIdx];
            corrected[doubleBarIdx] = temp;

            console.log(`[MathTable] Format variation corrigé: || déplacé de ${doubleBarIdx} vers ${correctPosition}`);
            return corrected;
        }

        return content;
    };

    /**
     * Calcule l'index effectif dans le système de demi-colonnes
     * Système: 0=x0, 1=interval, 2=x1, 3=interval, 4=x2, ...
     *
     * Format 2N-3 (signes): N valeurs x, 2N-3 slots (intervalles + valeurs critiques)
     * Format 2N-1 (variations simple): N valeurs x, 2N-1 slots (valeurs + flèches)
     * Format 2N+1 (variations avec limites): N valeurs x, 2N+1 slots (avec 2 valeurs à la valeur interdite)
     * Format N-1 (variations Première spé): uniquement flèches + || (sans valeurs aux bornes)
     */
    const getEffIdx = (colIndex: number, len: number, n: number, items: string[]) => {
        const item = items[colIndex] || "";
        const isSp = isSpecialItem(item);

        // Détecter si c'est une ligne de variations (contient nearrow/searrow)
        const isVariationRow = items.some(it => /nearrow|searrow/i.test(it));

        // === FORMAT VARIATIONS ===
        if (isVariationRow) {
            // Format N-1 ou N : Première spé
            // Cas 1 : flèches + || (ex: nearrow, ||, nearrow) pour fonction rationnelle
            // Cas 2 : flèches + valeur (ex: nearrow, 1, searrow) pour polynôme 2nd degré
            // N=3 → 3 éléments
            if (len === n - 1 || len === n) {
                const isArrow = /nearrow|searrow/i.test(item);
                const isForbidden = isForbiddenItem(item);

                if (isForbidden) {
                    // La double barre va sous la valeur interdite (position paire)
                    return (Math.floor(n / 2)) * 2;
                } else if (isArrow) {
                    // Les flèches vont sur les intervalles (positions impaires)
                    let arrowIdx = 0;
                    for (let i = 0; i < colIndex; i++) {
                        if (/nearrow|searrow/i.test(items[i])) arrowIdx++;
                    }
                    return (arrowIdx * 2) + 1;
                } else {
                    // C'est une valeur (ex: f(α) au sommet) → position paire sous la valeur x correspondante
                    // Pour un polynôme du second degré, la valeur est au milieu
                    return (Math.floor(n / 2)) * 2;
                }
            }

            // Format 2N+1 : avec limites aux valeurs interdites (ex: 1, nearrow, +inf, ||, -inf, nearrow, 1)
            // N=3 → 7 éléments
            if (len === (n * 2) + 1) {
                // Mapping spécial pour format étendu avec limites
                // Position 0: valeur sous x0
                // Position 1: flèche sur interval 0
                // Position 2: limite haute sous valeur interdite
                // Position 3: ||
                // Position 4: limite basse sous valeur interdite
                // Position 5: flèche sur interval 1
                // Position 6: valeur sous x2

                const doubleBarIdx = items.findIndex(it => isForbiddenItem(it));

                if (colIndex < doubleBarIdx) {
                    // Avant le || : mapping normal
                    return colIndex;
                } else if (colIndex === doubleBarIdx) {
                    // Le || reste à sa position (sous la valeur interdite)
                    return (Math.floor(n / 2)) * 2; // Position 2 pour N=3
                } else if (colIndex === doubleBarIdx - 1) {
                    // Valeur haute (limite gauche) - positionnée au-dessus du ||
                    return (Math.floor(n / 2)) * 2; // Position 2 pour N=3
                } else if (colIndex === doubleBarIdx + 1) {
                    // Valeur basse (limite droite) - positionnée en bas du ||
                    return (Math.floor(n / 2)) * 2; // Position 2 pour N=3
                } else {
                    // Après le || : décaler de 2 (car on a 2 valeurs au lieu d'0)
                    return colIndex - 2;
                }
            }

            // Format 2N-1 : mapping direct
            if (len === (n * 2) - 1) {
                return colIndex;
            }

            // Si on a moins d'éléments, il faut une heuristique
            // Compter les flèches et les valeurs
            let arrowCount = 0;
            let valueCount = 0;

            for (let i = 0; i < colIndex; i++) {
                if (/nearrow|searrow/i.test(items[i])) {
                    arrowCount++;
                } else if (!isForbiddenItem(items[i])) {
                    valueCount++;
                }
            }

            // Si l'élément actuel est une flèche
            if (/nearrow|searrow/i.test(item)) {
                // La flèche va à la position d'intervalle correspondante
                return (arrowCount * 2) + 1;
            }

            // Si c'est une valeur interdite
            if (isForbiddenItem(item)) {
                // La placer sous la valeur x correspondante
                // Compter combien de valeurs de x avant cette position
                return (valueCount + arrowCount) * 2;
            }

            // Sinon c'est une valeur normale
            return valueCount * 2;
        }

        // === FORMAT SIGNES (2N-3 éléments) ===
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

                            // Appliquer la correction du format si nécessaire
                            const correctedContent = row.type === 'variation'
                                ? correctVariationFormat(row.content, n)
                                : row.content;

                            return (
                                <g key={`row-${rowIndex}`}>
                                    <text x={labelWidth / 2} y={yMid} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[11px] font-bold fill-indigo-900">{cleanLabel(row.label)}</text>

                                    {/* On itère sur TOUS les slots (indices 0 à 2n-2) */}
                                    {Array.from({ length: expectedMax }).map((_, slotIdx) => {
                                        const halfIdx = slotIdx;
                                        const itemIdx = correctedContent.findIndex((_, idx) => getEffIdx(idx, correctedContent.length, n, correctedContent) === halfIdx);
                                        let item = itemIdx !== -1 ? correctedContent[itemIdx] : "";

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
                                            // === DÉTECTION DU FORMAT ===
                                            const contentLen = correctedContent.length;
                                            const isExtendedFormat = contentLen === (n * 2) + 1; // Format 2N+1 avec limites (Terminale)
                                            const isShortFormat = contentLen === n - 1 || contentLen === n; // Format N-1 : flèches uniquement (Première spé)

                                            // === DÉTECTION DIRECTE DES FLÈCHES ===
                                            const isArrowUp = /nearrow/i.test(item);
                                            const isArrowDown = /searrow/i.test(item);
                                            const isDoubleBarValue = isForbiddenItem(item);

                                            // === FORMAT COURT PREMIÈRE SPÉ (N-1 ou N éléments) ===
                                            if (isShortFormat) {
                                                // Rendu tout en une fois au premier slot
                                                if (slotIdx === 0) {
                                                    const elements = [];
                                                    const vMargin = 12;
                                                    const yTop = yBase + vMargin;
                                                    const yBottom = yBase + rowHeight - vMargin;

                                                    // Trouver la position de la double barre (si présente)
                                                    const doubleBarIdx = correctedContent.findIndex(it => isForbiddenItem(it));
                                                    const hasDoubleBar = doubleBarIdx !== -1;
                                                    const middleXPos = getXPos(Math.floor(n / 2) * 2);

                                                    // Parcourir les éléments
                                                    for (let i = 0; i < contentLen; i++) {
                                                        const el = correctedContent[i];
                                                        const elIsArrowUp = /nearrow/i.test(el);
                                                        const elIsArrowDown = /searrow/i.test(el);
                                                        const elIsDoubleBar = isForbiddenItem(el);

                                                        if (elIsDoubleBar) {
                                                            // Double barre (pour fonction rationnelle)
                                                            elements.push(
                                                                <g key={`db-${i}`}>
                                                                    <line x1={middleXPos - 3} y1={yBase + 2} x2={middleXPos - 3} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2.5" />
                                                                    <line x1={middleXPos + 3} y1={yBase + 2} x2={middleXPos + 3} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2.5" />
                                                                </g>
                                                            );
                                                        } else if (elIsArrowUp || elIsArrowDown) {
                                                            // Flèche
                                                            let xStart, xEnd;
                                                            if (hasDoubleBar) {
                                                                // Avec double barre : flèches de part et d'autre
                                                                if (i < doubleBarIdx) {
                                                                    xStart = getXPos(0);
                                                                    xEnd = middleXPos;
                                                                } else {
                                                                    xStart = middleXPos;
                                                                    xEnd = getXPos((n - 1) * 2);
                                                                }
                                                            } else {
                                                                // Sans double barre (polynôme 2nd degré) : flèches de part et d'autre du sommet
                                                                if (i === 0) {
                                                                    xStart = getXPos(0);
                                                                    xEnd = middleXPos;
                                                                } else {
                                                                    xStart = middleXPos;
                                                                    xEnd = getXPos((n - 1) * 2);
                                                                }
                                                            }

                                                            if (elIsArrowUp) {
                                                                elements.push(
                                                                    <line key={`arr-${i}`} x1={xStart + 5} y1={yBottom} x2={xEnd - 8} y2={yTop} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />
                                                                );
                                                            } else {
                                                                elements.push(
                                                                    <line key={`arr-${i}`} x1={xStart + 5} y1={yTop} x2={xEnd - 8} y2={yBottom} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />
                                                                );
                                                            }
                                                        } else {
                                                            // C'est une valeur (ex: f(α) au sommet pour polynôme 2nd degré)
                                                            // Positionner à la verticale de la valeur charnière
                                                            const yPos = yTop + 3; // En haut (pour un maximum)
                                                            elements.push(
                                                                <text key={`val-${i}`} x={middleXPos} y={yPos} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[13px] font-black fill-black">
                                                                    {cleanLabel(el)}
                                                                </text>
                                                            );
                                                        }
                                                    }

                                                    return <g key={`v-${rowIndex}-short`}>{elements}</g>;
                                                }
                                                return null; // Ne rien rendre pour les autres slots
                                            }

                                            // Double barre (valeur interdite) - géré séparément pour le format étendu
                                            if (isDoubleBarValue && !isExtendedFormat) {
                                                return (
                                                    <g key={`v-${rowIndex}-${slotIdx}`}>
                                                        <line x1={xPos - 2} y1={yBase + 2} x2={xPos - 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                        <line x1={xPos + 2} y1={yBase + 2} x2={xPos + 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                    </g>
                                                );
                                            }

                                            // === FORMAT ÉTENDU AVEC LIMITES (2N+1 éléments) ===
                                            if (isExtendedFormat) {
                                                const doubleBarIdx = correctedContent.findIndex(it => isForbiddenItem(it));
                                                const forbiddenXPos = getXPos(Math.floor(n / 2) * 2); // Position x de la valeur interdite

                                                // Rendu spécial pour le format étendu
                                                // On ne rend pas par slot, mais on rend tout en une fois
                                                if (slotIdx === 0) {
                                                    // Rendre tous les éléments du format étendu
                                                    const elements = [];

                                                    // Marges
                                                    const vMargin = 12;
                                                    const yTop = yBase + vMargin;
                                                    const yBottom = yBase + rowHeight - vMargin;

                    // 1. Première valeur (sous x0)
                    const val0 = correctedContent[0];
                    const x0 = getXPos(0);
                    const arrow1 = correctedContent[1];
                    const isArrow1Up = /nearrow/i.test(arrow1);
                    const isArrow1Down = /searrow/i.test(arrow1);

                    let yVal0 = yMid;
                    if (isArrow1Up) yVal0 = yBottom;
                    else if (isArrow1Down) yVal0 = yTop;

                    elements.push(
                        <text key="val0" x={x0} y={yVal0} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[13px] font-black fill-black">
                            {cleanLabel(val0)}
                        </text>
                    );

                    // Positions pour les limites à la valeur interdite
                    const xLeftLimit = forbiddenXPos - 20;  // Limite gauche (avant ||)
                    const xRightLimit = forbiddenXPos + 20; // Limite droite (après ||)

                    // 2. Limite gauche (à GAUCHE de la double barre) - ex: +∞
                    const valLeft = correctedContent[doubleBarIdx - 1];
                    const isArrow1UpToInf = /nearrow/i.test(arrow1);
                    const yLeftLimit = isArrow1UpToInf ? yTop + 5 : yBottom - 5;

                    elements.push(
                        <text key="valLeft" x={xLeftLimit} y={yLeftLimit} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[12px] font-black fill-black">
                            {cleanLabel(valLeft)}
                        </text>
                    );

                    // 3. Première flèche (de x0 vers limite gauche)
                    if (isArrow1Up || isArrow1Down) {
                        if (isArrow1Up) {
                            elements.push(
                                <line key="arrow1" x1={x0 + 10} y1={yVal0 - 3} x2={xLeftLimit + 5} y2={yLeftLimit + 8} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />
                            );
                        } else {
                            elements.push(
                                <line key="arrow1" x1={x0 + 10} y1={yVal0 + 3} x2={xLeftLimit + 5} y2={yLeftLimit - 8} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />
                            );
                        }
                    }

                    // 4. Double barre
                    elements.push(
                        <g key="doublebar">
                            <line x1={forbiddenXPos - 3} y1={yBase + 2} x2={forbiddenXPos - 3} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2.5" />
                            <line x1={forbiddenXPos + 3} y1={yBase + 2} x2={forbiddenXPos + 3} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2.5" />
                        </g>
                    );

                    // 5. Limite droite (à DROITE de la double barre) - ex: -∞
                    const valRight = correctedContent[doubleBarIdx + 1];
                    const arrow2 = correctedContent[doubleBarIdx + 2];
                    const isArrow2UpFromInf = /nearrow/i.test(arrow2);
                    const yRightLimit = isArrow2UpFromInf ? yBottom - 5 : yTop + 5;

                    elements.push(
                        <text key="valRight" x={xRightLimit} y={yRightLimit} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[12px] font-black fill-black">
                            {cleanLabel(valRight)}
                        </text>
                    );

                    // 6. Deuxième flèche (de limite droite vers x2)
                    const isArrow2Up = /nearrow/i.test(arrow2);
                    const isArrow2Down = /searrow/i.test(arrow2);
                    const x2 = getXPos((n - 1) * 2);

                    if (isArrow2Up || isArrow2Down) {
                        const val2 = correctedContent[contentLen - 1];
                        let yVal2 = yMid;
                        if (isArrow2Up) yVal2 = yTop;
                        else if (isArrow2Down) yVal2 = yBottom;

                        if (isArrow2Up) {
                            elements.push(
                                <line key="arrow2" x1={xRightLimit - 5} y1={yRightLimit - 8} x2={x2 - 10} y2={yVal2 + 3} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />
                            );
                        } else {
                            elements.push(
                                <line key="arrow2" x1={xRightLimit - 5} y1={yRightLimit + 8} x2={x2 - 10} y2={yVal2 - 3} stroke="#4f46e5" strokeWidth="2.5" markerEnd={`url(#arrow-${id})`} />
                            );
                        }

                        // 7. Dernière valeur
                        elements.push(
                            <text key="val2" x={x2} y={yVal2} textAnchor="middle" dominantBaseline="middle" className="font-serif text-[13px] font-black fill-black">
                                {cleanLabel(val2)}
                            </text>
                        );
                    }

                    return <g key={`v-${rowIndex}-extended`}>{elements}</g>;
                                                }
                                                return null; // Ne rien rendre pour les autres slots
                                            }

                                            // === FORMAT STANDARD (2N-1 éléments) ===
                                            // Double barre (valeur interdite)
                                            if (isDoubleBarValue) {
                                                return (
                                                    <g key={`v-${rowIndex}-${slotIdx}`}>
                                                        <line x1={xPos - 2} y1={yBase + 2} x2={xPos - 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                        <line x1={xPos + 2} y1={yBase + 2} x2={xPos + 2} y2={yBase + rowHeight - 2} stroke="#ef4444" strokeWidth="2" />
                                                    </g>
                                                );
                                            }

                                            // === FLÈCHES ===
                                            if (isArrowUp || isArrowDown) {
                                                // Les flèches sont sur les positions impaires (intervalles)
                                                if (halfIdx % 2 === 0) return null;

                                                // Positions de début et fin de la flèche
                                                const xStart = getXPos(halfIdx - 1);
                                                const xEnd = getXPos(halfIdx + 1);

                                                // Marges
                                                const vMargin = 12;
                                                const yTop = yBase + vMargin;
                                                const yBottom = yBase + rowHeight - vMargin;

                                                if (isArrowUp) {
                                                    // Flèche montante : bas-gauche vers haut-droite
                                                    return (
                                                        <line
                                                            key={`v-${rowIndex}-${slotIdx}`}
                                                            x1={xStart + 5}
                                                            y1={yBottom}
                                                            x2={xEnd - 8}
                                                            y2={yTop}
                                                            stroke="#4f46e5"
                                                            strokeWidth="2.5"
                                                            markerEnd={`url(#arrow-${id})`}
                                                        />
                                                    );
                                                } else {
                                                    // Flèche descendante : haut-gauche vers bas-droite
                                                    return (
                                                        <line
                                                            key={`v-${rowIndex}-${slotIdx}`}
                                                            x1={xStart + 5}
                                                            y1={yTop}
                                                            x2={xEnd - 8}
                                                            y2={yBottom}
                                                            stroke="#4f46e5"
                                                            strokeWidth="2.5"
                                                            markerEnd={`url(#arrow-${id})`}
                                                        />
                                                    );
                                                }
                                            }

                                            // === VALEURS (positions paires, sous les valeurs de x) ===
                                            if (halfIdx % 2 !== 0) return null;

                                            // Trouver les flèches adjacentes pour le positionnement vertical
                                            const prevItem = itemIdx > 0 ? correctedContent[itemIdx - 1] : '';
                                            const nextItem = itemIdx < correctedContent.length - 1 ? correctedContent[itemIdx + 1] : '';

                                            const prevIsUp = /nearrow/i.test(prevItem);
                                            const prevIsDown = /searrow/i.test(prevItem);
                                            const nextIsUp = /nearrow/i.test(nextItem);
                                            const nextIsDown = /searrow/i.test(nextItem);

                                            // Position verticale
                                            let yPos = yMid;
                                            const vMargin = 14;

                                            if (prevIsUp) {
                                                yPos = yBase + vMargin; // Maximum en haut
                                            } else if (prevIsDown) {
                                                yPos = yBase + rowHeight - vMargin; // Minimum en bas
                                            } else if (nextIsDown) {
                                                yPos = yBase + vMargin; // Maximum en haut
                                            } else if (nextIsUp) {
                                                yPos = yBase + rowHeight - vMargin; // Minimum en bas
                                            } else if (halfIdx === 0) {
                                                if (nextIsUp) yPos = yBase + rowHeight - vMargin;
                                                else if (nextIsDown) yPos = yBase + vMargin;
                                            } else if (halfIdx === (n - 1) * 2) {
                                                if (prevIsUp) yPos = yBase + vMargin;
                                                else if (prevIsDown) yPos = yBase + rowHeight - vMargin;
                                            }

                                            const isInfinite = display.includes('∞');

                                            return (
                                                <text
                                                    key={`v-${rowIndex}-${slotIdx}`}
                                                    x={xPos}
                                                    y={yPos}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    className={`font-serif text-[13px] font-black fill-black ${isInfinite ? 'text-[11px]' : ''}`}
                                                >
                                                    {display}
                                                </text>
                                            );
                                        }
                                        return null;
                                    })}
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <div className="absolute top-2 right-4 pointer-events-none opacity-20">
                    <span className="text-[8px] font-mono font-bold uppercase tracking-tighter">MATH-ENGINE v2.7-VAR</span>
                </div>
            </div>
            {title && <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{title}</p>}
        </div>
    );
}
