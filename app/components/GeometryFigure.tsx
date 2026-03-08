'use client';

/**
 * ══════════════════════════════════════════════════════════════════
 * GeometryFigure.tsx — Composant de géométrie dynamique
 *
 * Exports :
 *   - GeoCanvas          : moteur SVG interactif (utilisé dans /geometre)
 *   - GeometryFigure     : carte inline dans le chat avec bouton "Ouvrir"
 *   - re-exports types   : GeoPoint, GeoSegment, etc. (compat useFigureRenderer)
 * ══════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type {
    GeoScene, GeoObject, GeoPoint, GeoSegment, GeoLine,
    GeoCircle, GeoAngle, GeoVector, GeoLabel, GeoPolygon,
} from '@/lib/geo-engine/types';

// ─── Re-exports pour compatibilité ──────────────────────────────────────────
export type { GeoPoint, GeoSegment, GeoLine, GeoCircle };

// ─── Palettes ────────────────────────────────────────────────────────────────
const PALETTE = {
    bg: '#020617',
    grid: 'rgba(99,102,241,0.07)',
    axis: 'rgba(99,102,241,0.50)',
    axisLabel: 'rgba(148,163,184,0.65)',
    origin: 'rgba(148,163,184,0.45)',
    point: '#818cf8',
    segment: '#f43f5e',
    line: '#34d399',
    circle: '#fbbf24',
    vector: '#fb923c',
    angle: '#fbbf24',
    polygon: '#a78bfa',
    label: '#e2e8f0',
    hover: '#c7d2fe',
};

const OBJ_COLOR: Record<string, string> = {
    point: PALETTE.point,
    segment: PALETTE.segment,
    line: PALETTE.line,
    circle: PALETTE.circle,
    vector: PALETTE.vector,
    angle: PALETTE.angle,
    polygon: PALETTE.polygon,
    label: PALETTE.label,
};

// ─── Props GeoCanvas ─────────────────────────────────────────────────────────
interface GeoCanvasProps {
    scene: GeoScene;
    width: number;
    height: number;
    interactive?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ════════════════════════════════════════════════════════════════════════════
//  GeoCanvas — moteur SVG interactif
// ════════════════════════════════════════════════════════════════════════════
export function GeoCanvas({ scene, width, height, interactive = true }: GeoCanvasProps) {

    // ── Domaine ──────────────────────────────────────────────────────────────
    const defaultDomain = useMemo(() => {
        if (scene.domain) return scene.domain;
        // Auto-fit depuis les points ET les cercles
        const pts = scene.objects.filter(o => o.kind === 'point') as GeoPoint[];
        const circles = scene.objects.filter(o => o.kind === 'circle') as GeoCircle[];

        if (pts.length === 0 && circles.length === 0) {
            return { x: [-8, 8] as [number, number], y: [-6, 6] as [number, number] };
        }

        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);

        // Étendre les bounds avec les cercles (centre ± rayon)
        for (const circ of circles) {
            const center = pts.find(p => p.id === circ.center);
            if (center) {
                const r = circ.radiusValue ?? 0;
                if (r > 0) {
                    xs.push(center.x - r, center.x + r);
                    ys.push(center.y - r, center.y + r);
                }
            }
        }

        if (xs.length === 0) return { x: [-8, 8] as [number, number], y: [-6, 6] as [number, number] };

        const margin = 2;
        return {
            x: [Math.floor(Math.min(...xs)) - margin, Math.ceil(Math.max(...xs)) + margin] as [number, number],
            y: [Math.floor(Math.min(...ys)) - margin, Math.ceil(Math.max(...ys)) + margin] as [number, number],
        };
    }, [scene]);

    // ── Viewport (zoom / pan) ─────────────────────────────────────────────
    const [viewport, setViewport] = useState({
        xMin: defaultDomain.x[0],
        xMax: defaultDomain.x[1],
        yMin: defaultDomain.y[0],
        yMax: defaultDomain.y[1],
    });

    // Met à jour le viewport quand la scène ou le domaine par défaut change
    useEffect(() => {
        const d = scene.domain ?? defaultDomain;
        setViewport({ xMin: d.x[0], xMax: d.x[1], yMin: d.y[0], yMax: d.y[1] });
    }, [scene, defaultDomain]);

    // ── Transformations math → SVG ────────────────────────────────────────
    const PAD = { top: 20, right: 20, bottom: 30, left: 40 };
    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;

    const toSvgX = useCallback((mx: number) =>
        PAD.left + (mx - viewport.xMin) / (viewport.xMax - viewport.xMin) * plotW,
        [viewport, plotW]);

    const toSvgY = useCallback((my: number) =>
        PAD.top + (viewport.yMax - my) / (viewport.yMax - viewport.yMin) * plotH,
        [viewport, plotH]);

    const toMathX = useCallback((sx: number) =>
        viewport.xMin + (sx - PAD.left) / plotW * (viewport.xMax - viewport.xMin),
        [viewport, plotW]);

    const toMathY = useCallback((sy: number) =>
        viewport.yMax - (sy - PAD.top) / plotH * (viewport.yMax - viewport.yMin),
        [viewport, plotH]);

    // ── Index des points par id ───────────────────────────────────────────
    const pointMap = useMemo(() => {
        const m = new Map<string, GeoPoint>();
        scene.objects.forEach(o => { if (o.kind === 'point') m.set((o as GeoPoint).id, o as GeoPoint); });
        return m;
    }, [scene]);

    // ── Pan & Zoom ────────────────────────────────────────────────────────
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, vp: viewport });
    const svgRef = useRef<SVGSVGElement>(null);

    const onWheel = useCallback((e: React.WheelEvent) => {
        if (!interactive) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.12 : 0.89;
        const rect = svgRef.current!.getBoundingClientRect();
        const mx = toMathX(e.clientX - rect.left);
        const my = toMathY(e.clientY - rect.top);
        setViewport(v => ({
            xMin: mx + (v.xMin - mx) * factor,
            xMax: mx + (v.xMax - mx) * factor,
            yMin: my + (v.yMin - my) * factor,
            yMax: my + (v.yMax - my) * factor,
        }));
    }, [interactive, toMathX, toMathY]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!interactive || !e.altKey) return;
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY, vp: viewport };
    }, [interactive, viewport]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const rect = svgRef.current!.getBoundingClientRect();
        const dx = (e.clientX - panStart.current.x) / plotW * (panStart.current.vp.xMax - panStart.current.vp.xMin);
        const dy = (e.clientY - panStart.current.y) / plotH * (panStart.current.vp.yMax - panStart.current.vp.yMin);
        setViewport({
            xMin: panStart.current.vp.xMin - dx,
            xMax: panStart.current.vp.xMax - dx,
            yMin: panStart.current.vp.yMin + dy,
            yMax: panStart.current.vp.yMax + dy,
        });
    }, [plotW, plotH]);

    const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

    // ── Grille et axes ────────────────────────────────────────────────────
    const renderGrid = () => {
        if (scene.repere === 'none') return null;
        const gridLines: React.JSX.Element[] = [];
        const axisLabels: React.JSX.Element[] = [];

        const xRange = viewport.xMax - viewport.xMin;
        const yRange = viewport.yMax - viewport.yMin;
        const niceStep = (r: number) => {
            const raw = r / 8;
            const mag = Math.pow(10, Math.floor(Math.log10(raw)));
            const nice = [1, 2, 5, 10].find(f => f * mag >= raw) ?? 10;
            return nice * mag;
        };
        const xStep = niceStep(xRange);
        const yStep = niceStep(yRange);

        // Lignes de grille (seulement si showGrid est activé)
        if (scene.showGrid !== false) {
            for (let x = Math.ceil(viewport.xMin / xStep) * xStep; x <= viewport.xMax; x += xStep) {
                const sx = toSvgX(x);
                gridLines.push(<line key={`gx${x}`} x1={sx} y1={PAD.top} x2={sx} y2={PAD.top + plotH} stroke={PALETTE.grid} strokeWidth={1} />);
            }
            for (let y = Math.ceil(viewport.yMin / yStep) * yStep; y <= viewport.yMax; y += yStep) {
                const sy = toSvgY(y);
                gridLines.push(<line key={`gy${y}`} x1={PAD.left} y1={sy} x2={PAD.left + plotW} y2={sy} stroke={PALETTE.grid} strokeWidth={1} />);
            }
        }

        // Labels d'axes (toujours si repère affiché)
        for (let x = Math.ceil(viewport.xMin / xStep) * xStep; x <= viewport.xMax; x += xStep) {
            if (Math.abs(x) > xStep * 0.01) {
                axisLabels.push(
                    <text key={`lx${x}`} x={toSvgX(x)} y={toSvgY(0) + 14} textAnchor="middle"
                        fontSize={10} fill={PALETTE.axisLabel} fontFamily="Inter, system-ui, sans-serif">
                        {x % 1 === 0 ? x : x.toFixed(1)}
                    </text>
                );
            }
        }
        for (let y = Math.ceil(viewport.yMin / yStep) * yStep; y <= viewport.yMax; y += yStep) {
            if (Math.abs(y) > yStep * 0.01) {
                axisLabels.push(
                    <text key={`ly${y}`} x={toSvgX(0) - 8} y={toSvgY(y) + 4} textAnchor="end"
                        fontSize={10} fill={PALETTE.axisLabel} fontFamily="Inter, system-ui, sans-serif">
                        {y % 1 === 0 ? y : y.toFixed(1)}
                    </text>
                );
            }
        }

        // Axes
        const cx0 = clamp(toSvgX(0), PAD.left, PAD.left + plotW);
        const cy0 = clamp(toSvgY(0), PAD.top, PAD.top + plotH);

        return (
            <g>
                {gridLines}
                {/* Axe X */}
                <line x1={PAD.left} y1={cy0} x2={PAD.left + plotW} y2={cy0} stroke={PALETTE.axis} strokeWidth={1.2} />
                {/* Axe Y */}
                <line x1={cx0} y1={PAD.top} x2={cx0} y2={PAD.top + plotH} stroke={PALETTE.axis} strokeWidth={1.2} />
                {/* Flèches axes */}
                <polygon points={`${PAD.left + plotW},${cy0} ${PAD.left + plotW - 7},${cy0 - 3} ${PAD.left + plotW - 7},${cy0 + 3}`} fill={PALETTE.axis} />
                <polygon points={`${cx0},${PAD.top} ${cx0 - 3},${PAD.top + 7} ${cx0 + 3},${PAD.top + 7}`} fill={PALETTE.axis} />
                {/* Labels axes */}
                <text x={PAD.left + plotW - 4} y={cy0 - 8} fontSize={11} fill={PALETTE.axisLabel} fontFamily="Inter,sans-serif">x</text>
                <text x={cx0 + 6} y={PAD.top + 12} fontSize={11} fill={PALETTE.axisLabel} fontFamily="Inter,sans-serif">y</text>
                {/* Origine */}
                <text x={cx0 - 10} y={cy0 + 14} textAnchor="middle" fontSize={10} fill={PALETTE.origin} fontFamily="Inter,sans-serif">O</text>
                {axisLabels}
            </g>
        );
    };

    // ── Rendu d'un point (croix française) ───────────────────────────────
    const renderPoint = (obj: GeoPoint, i: number) => {
        // Points auxiliaires invisibles (utilisés par parallele:/perpendiculaire:)
        if ((obj.style as string) === 'none' || obj.id.startsWith('_')) return null;

        const sx = toSvgX(obj.x);
        const sy = toSvgY(obj.y);
        if (isNaN(sx) || isNaN(sy)) return null;
        const color = obj.color || PALETTE.point;
        const s = 5;
        const label = obj.label ?? obj.id;

        return (
            <g key={`pt${i}`}>
                {/* Croix française */}
                {(obj.style ?? 'cross') === 'cross' ? (
                    <>
                        <line x1={sx - s} y1={sy - s} x2={sx + s} y2={sy + s} stroke={color} strokeWidth={2} strokeLinecap="round" />
                        <line x1={sx + s} y1={sy - s} x2={sx - s} y2={sy + s} stroke={color} strokeWidth={2} strokeLinecap="round" />
                    </>
                ) : (
                    <circle cx={sx} cy={sy} r={3.5} fill={color} />
                )}
                {/* Halo */}
                <circle cx={sx} cy={sy} r={10} fill="transparent" stroke={color} strokeWidth={0} opacity={0.3} />
                {/* Label */}
                {label && (
                    <text x={sx + 8} y={sy - 6} fontSize={12} fontWeight="bold"
                        fill={color} fontFamily="Inter,sans-serif"
                        style={{ paintOrder: 'stroke', stroke: PALETTE.bg, strokeWidth: 3 }}>
                        {label}
                    </text>
                )}
            </g>
        );
    };

    // ── Rendu d'un segment ───────────────────────────────────────────────
    const renderSegment = (obj: GeoSegment, i: number) => {
        const A = pointMap.get(obj.from);
        const B = pointMap.get(obj.to);
        if (!A || !B) return null;
        if (isNaN(A.x) || isNaN(A.y) || isNaN(B.x) || isNaN(B.y)) return null;
        const color = obj.color || PALETTE.segment;
        const mx = (toSvgX(A.x) + toSvgX(B.x)) / 2;
        const my = (toSvgY(A.y) + toSvgY(B.y)) / 2;

        return (
            <g key={`seg${i}`}>
                <line
                    x1={toSvgX(A.x)} y1={toSvgY(A.y)}
                    x2={toSvgX(B.x)} y2={toSvgY(B.y)}
                    stroke={color} strokeWidth={2}
                    strokeDasharray={obj.dashed ? '6,4' : undefined}
                />
                {obj.label && (
                    <text x={mx} y={my - 8} textAnchor="middle"
                        fontSize={11} fill={color} fontFamily="Inter,sans-serif"
                        style={{ paintOrder: 'stroke', stroke: PALETTE.bg, strokeWidth: 3 }}>
                        {obj.label}
                    </text>
                )}
            </g>
        );
    };

    // ── Rendu d'une droite / demi-droite ────────────────────────────────
    const renderLine = (obj: GeoLine, i: number) => {
        const A = pointMap.get(obj.through[0]);
        const B = pointMap.get(obj.through[1]);
        if (!A || !B) return null;
        if (isNaN(A.x) || isNaN(A.y) || isNaN(B.x) || isNaN(B.y)) return null;
        const color = obj.color || PALETTE.line;

        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const BIG = 100; // prolongement

        let x1 = toSvgX(A.x - ux * BIG);
        let y1 = toSvgY(A.y - uy * BIG);
        let x2 = toSvgX(B.x + ux * BIG);
        let y2 = toSvgY(B.y + uy * BIG);

        if (obj.type === 'ray') {
            x1 = toSvgX(A.x); y1 = toSvgY(A.y);
        }
        if (obj.type === 'segment') {
            x1 = toSvgX(A.x); y1 = toSvgY(A.y);
            x2 = toSvgX(B.x); y2 = toSvgY(B.y);
        }
        // Position du label : près du 3/4 entre les deux points de référence
        const labelX = toSvgX(A.x + (B.x - A.x) * 0.75);
        const labelY = toSvgY(A.y + (B.y - A.y) * 0.75);

        return (
            <g key={`line${i}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color} strokeWidth={1.5}
                    strokeDasharray={obj.style === 'dashed' ? '8,5' : obj.style === 'dotted' ? '2,4' : undefined}
                />
                {obj.label && (
                    <text x={labelX + 8} y={labelY - 8} fontSize={12} fontWeight="bold"
                        fill={color} fontFamily="Inter,sans-serif"
                        style={{ paintOrder: 'stroke', stroke: PALETTE.bg, strokeWidth: 3 }}>
                        {obj.label}
                    </text>
                )}
            </g>
        );
    };

    // ── Rendu d'un vecteur (flèche) ──────────────────────────────────────
    const renderVector = (obj: GeoVector, i: number) => {
        const A = pointMap.get(obj.from);
        const B = pointMap.get(obj.to);
        if (!A || !B) return null;
        if (isNaN(A.x) || isNaN(A.y) || isNaN(B.x) || isNaN(B.y)) return null;
        const color = obj.color || PALETTE.vector;

        const x1 = toSvgX(A.x), y1 = toSvgY(A.y);
        const x2 = toSvgX(B.x), y2 = toSvgY(B.y);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;

        // Pointe de flèche sur le segment (triangle)
        const arrowLen = 14, arrowW = 6;
        const tipX = x2, tipY = y2;
        const baseX = x2 - ux * arrowLen, baseY = y2 - uy * arrowLen;
        const leftX = baseX - uy * arrowW, leftY = baseY + ux * arrowW;
        const rightX = baseX + uy * arrowW, rightY = baseY - ux * arrowW;

        // Label au milieu, décalé au-dessus du segment (perpendiculairement)
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const labelText = obj.label || `${obj.from}${obj.to}`;
        const textWidth = labelText.length * 8; // estimation largeur texte

        // Décalage perpendiculaire au vecteur (toujours au-dessus)
        const perpX = -uy; // perpendiculaire normalisée
        const perpY = ux;
        const offset = 18; // pixels au-dessus du segment
        // S'assurer que le label est toujours "au-dessus" visuellement
        const sign = perpY < 0 ? 1 : -1;
        const lx = mx + perpX * offset * sign;
        const ly = my + perpY * offset * sign;

        return (
            <g key={`vec${i}`}>
                {/* Trait du vecteur */}
                <line x1={x1} y1={y1} x2={baseX} y2={baseY}
                    stroke={color} strokeWidth={2.5} />
                {/* Pointe de flèche sur le segment */}
                <polygon
                    points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
                    fill={color}
                />
                {/* Texte du label (ex: AB) — centré */}
                <text x={lx} y={ly} fontSize={14} fontWeight="bold"
                    fill={color} fontFamily="Inter,sans-serif" textAnchor="middle"
                    style={{ paintOrder: 'stroke', stroke: PALETTE.bg, strokeWidth: 3 }}>
                    {labelText}
                </text>
                {/* Flèche SVG au-dessus du texte (→) — centrée */}
                <line x1={lx - textWidth / 2 - 2} y1={ly - 10} x2={lx + textWidth / 2 + 2} y2={ly - 10}
                    stroke={color} strokeWidth={1.8} />
                <polygon
                    points={`${lx + textWidth / 2 + 6},${ly - 10} ${lx + textWidth / 2 - 1},${ly - 13} ${lx + textWidth / 2 - 1},${ly - 7}`}
                    fill={color}
                />
            </g>
        );
    };

    // ── Rendu d'un cercle ────────────────────────────────────────────────
    const renderCircle = (obj: GeoCircle, i: number) => {
        const center = pointMap.get(obj.center);
        if (!center) return null;
        const color = obj.color || PALETTE.circle;

        let rSvg = 0;
        if (obj.radiusValue !== undefined) {
            rSvg = obj.radiusValue * plotW / (viewport.xMax - viewport.xMin);
        } else if (obj.radiusPoint) {
            const rpt = pointMap.get(obj.radiusPoint);
            if (rpt) {
                const ddx = toSvgX(rpt.x) - toSvgX(center.x);
                const ddy = toSvgY(rpt.y) - toSvgY(center.y);
                rSvg = Math.sqrt(ddx * ddx + ddy * ddy);
            }
        }

        if (rSvg <= 0) return null;
        const cx = toSvgX(center.x);
        const cy = toSvgY(center.y);

        return (
            <g key={`circ${i}`}>
                <circle cx={cx} cy={cy} r={rSvg}
                    fill="none" stroke={color} strokeWidth={1.8} />
                {obj.label && (
                    <text x={cx + rSvg * 0.7} y={cy - rSvg * 0.7} fontSize={11} fill={color} fontFamily="Inter,sans-serif">
                        {obj.label}
                    </text>
                )}
            </g>
        );
    };

    // ── Rendu d'un angle ─────────────────────────────────────────────────
    const renderAngle = (obj: GeoAngle, i: number) => {
        const V = pointMap.get(obj.vertex);
        const P1 = pointMap.get(obj.from);
        const P2 = pointMap.get(obj.to);
        if (!V || !P1 || !P2) return null;
        const color = obj.color || PALETTE.angle;
        const sx = toSvgX(V.x), sy = toSvgY(V.y);

        if (obj.square) {
            // Marque d'angle droit (carré)
            const px = toSvgX(P1.x) - sx, py = toSvgY(P1.y) - sy;
            const qx = toSvgX(P2.x) - sx, qy = toSvgY(P2.y) - sy;
            const plen = Math.sqrt(px * px + py * py) || 1;
            const qlen = Math.sqrt(qx * qx + qy * qy) || 1;
            const S = 10;
            const ux = px / plen * S, uy = py / plen * S;
            const vx = qx / qlen * S, vy = qy / qlen * S;
            return (
                <g key={`ang${i}`}>
                    <path d={`M ${sx + ux},${sy + uy} L ${sx + ux + vx},${sy + uy + vy} L ${sx + vx},${sy + vy}`}
                        fill="none" stroke={color} strokeWidth={1.5} />
                </g>
            );
        }

        // Arc d'angle
        const a1 = Math.atan2(toSvgY(P1.y) - sy, toSvgX(P1.x) - sx);
        const a2 = Math.atan2(toSvgY(P2.y) - sy, toSvgX(P2.x) - sx);
        const R = 18;
        const [x1, y1] = [sx + Math.cos(a1) * R, sy + Math.sin(a1) * R];
        const [x2, y2] = [sx + Math.cos(a2) * R, sy + Math.sin(a2) * R];
        const mid = (a1 + a2) / 2;
        const lx = sx + Math.cos(mid) * (R + 14);
        const ly = sy + Math.sin(mid) * (R + 14);

        return (
            <g key={`ang${i}`}>
                <path d={`M ${x1},${y1} A ${R},${R} 0 0,1 ${x2},${y2}`}
                    fill="none" stroke={color} strokeWidth={1.5} />
                {obj.label && (
                    <text x={lx} y={ly} textAnchor="middle" fontSize={10} fill={color} fontFamily="Inter,sans-serif">
                        {obj.label}
                    </text>
                )}
            </g>
        );
    };

    // ── Rendu d'un polygone ──────────────────────────────────────────────
    const renderPolygon = (obj: GeoPolygon, i: number) => {
        const pts = obj.vertices.map(id => pointMap.get(id)).filter(Boolean) as GeoPoint[];
        if (pts.length < 3) return null;
        const stroke = obj.strokeColor || PALETTE.polygon;
        const fill = obj.fillColor || 'rgba(167,139,250,0.08)';
        const pointsStr = pts.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');

        return (
            <polygon key={`poly${i}`} points={pointsStr}
                fill={fill} stroke={stroke} strokeWidth={1.5} />
        );
    };

    // ── Rendu d'une étiquette ────────────────────────────────────────────
    const renderLabel = (obj: GeoLabel, i: number) => {
        return (
            <text key={`lbl${i}`}
                x={toSvgX(obj.x)} y={toSvgY(obj.y)}
                fontSize={obj.size === 'sm' ? 10 : obj.size === 'lg' ? 15 : 12}
                fill={obj.color || PALETTE.label}
                fontFamily="Inter,sans-serif">
                {obj.text}
            </text>
        );
    };

    // ── Dispatch de rendu ────────────────────────────────────────────────
    const renderObject = (obj: GeoObject, i: number): React.JSX.Element | null => {
        switch (obj.kind) {
            case 'point': return renderPoint(obj as GeoPoint, i);
            case 'segment': return renderSegment(obj as GeoSegment, i);
            case 'line': return renderLine(obj as GeoLine, i);
            case 'circle': return renderCircle(obj as GeoCircle, i);
            case 'vector': return renderVector(obj as GeoVector, i);
            case 'angle': return renderAngle(obj as GeoAngle, i);
            case 'polygon': return renderPolygon(obj as GeoPolygon, i);
            case 'label': return renderLabel(obj as GeoLabel, i);
            default: return null;
        }
    };

    // ── Contrôles zoom ───────────────────────────────────────────────────
    const zoomBy = (factor: number) => {
        setViewport(v => {
            const cx = (v.xMin + v.xMax) / 2;
            const cy = (v.yMin + v.yMax) / 2;
            const hw = (v.xMax - v.xMin) * factor / 2;
            const hh = (v.yMax - v.yMin) * factor / 2;
            return { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh };
        });
    };

    const resetViewport = () => {
        const d = scene.domain ?? defaultDomain;
        setViewport({ xMin: d.x[0], xMax: d.x[1], yMin: d.y[0], yMax: d.y[1] });
    };

    // ── Rendu principal ──────────────────────────────────────────────────
    // Ordre de rendu : polygones → lignes → cercles → segments → vecteurs → angles → points → labels
    const ORDER: GeoObject['kind'][] = ['polygon', 'line', 'circle', 'segment', 'vector', 'angle', 'point', 'label'];
    const sorted = [...scene.objects].sort((a, b) =>
        ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)
    );

    return (
        <div style={{ position: 'relative', width, height, background: PALETTE.bg, userSelect: 'none' }}>
            <svg
                ref={svgRef}
                width={width} height={height}
                onWheel={onWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                style={{ display: 'block', cursor: interactive ? 'crosshair' : 'default' }}>
                {/* Fond */}
                <rect width={width} height={height} fill={PALETTE.bg} />
                {/* Zone de tracé */}
                <clipPath id="plot-clip">
                    <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
                </clipPath>
                {/* Grille */}
                <g clipPath="url(#plot-clip)">
                    {renderGrid()}
                    {sorted.map((obj, i) => renderObject(obj, i))}
                </g>
                {/* Titre */}
                {scene.title && !scene.title.includes('attente') && (
                    <text x={width / 2} y={14} textAnchor="middle"
                        fontSize={12} fontWeight="600" fill="rgba(148,163,184,0.7)"
                        fontFamily="Inter,sans-serif">
                        {scene.title}
                    </text>
                )}
            </svg>

            {/* Contrôles zoom (coin inférieur droit) */}
            {interactive && (
                <div style={{
                    position: 'absolute', bottom: 40, right: 12,
                    display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                    {[
                        { label: '+', action: () => zoomBy(0.8) },
                        { label: '−', action: () => zoomBy(1.25) },
                        { label: '↺', action: resetViewport },
                    ].map(btn => (
                        <button key={btn.label} onClick={btn.action}
                            style={{
                                width: 28, height: 28, fontSize: 14, fontWeight: 'bold',
                                background: 'rgba(30,41,59,0.9)', color: '#a5b4fc',
                                border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                            {btn.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  GeometryFigure — Carte inline dans le chat
//  Affiche un aperçu et un bouton "Ouvrir" qui lance /geometre
// ════════════════════════════════════════════════════════════════════════════

interface GeometryFigureProps {
    scene: GeoScene;
}

export default function GeometryFigure({ scene }: GeometryFigureProps) {
    const [opened, setOpened] = useState(false);
    const nObjs = scene.objects.length;
    const nPts = scene.objects.filter(o => o.kind === 'point').length;

    const openWindow = useCallback(() => {
        const key = `geo_scene_${Date.now()}`;
        const sceneJson = JSON.stringify(scene);
        try {
            // Stocker la scène pour la page /geometre (fallback sessionStorage)
            sessionStorage.setItem(key, sceneJson);
            // Émettre sur le BroadcastChannel si fenêtre déjà ouverte
            // Envoie la scène complète pour ne pas dépendre du sessionStorage
            try {
                const ch = new BroadcastChannel('mimimaths-geometre');
                ch.postMessage({ type: 'UPDATE_GEO', key, scene: sceneJson });
                ch.close();
            } catch { /* ignore */ }
            // Ouvrir ou réutiliser la fenêtre
            const win = window.open(`/geometre?key=${key}`, 'mimimaths-geometre',
                'width=1000,height=720,menubar=no,toolbar=no,resizable=yes');
            if (win) {
                setOpened(true);
                win.focus();
                // Retries progressifs après chargement
                for (const delay of [700, 1500, 3000]) {
                    setTimeout(() => {
                        try {
                            const ch2 = new BroadcastChannel('mimimaths-geometre');
                            ch2.postMessage({ type: 'UPDATE_GEO', key, scene: sceneJson });
                            ch2.close();
                        } catch { /* ignore */ }
                    }, delay);
                }
            }
        } catch (e) {
            console.error('[GeometryFigure] Impossible d\'ouvrir', e);
        }
    }, [scene]);

    return (
        <div style={{ margin: '12px 0', display: 'inline-flex', flexDirection: 'column', gap: 8 }}>
            {/* Carte principale */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(30,27,75,0.5), rgba(15,23,42,0.6))',
                border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16,
                boxShadow: '0 4px 20px rgba(99,102,241,0.12)',
            }}>
                {/* Icône */}
                <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={1.5} stroke="#818cf8" width={20} height={20}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#c7d2fe', margin: 0 }}>
                        {scene.title || 'Figure géométrique'}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', margin: '2px 0 0' }}>
                        {nPts} point{nPts > 1 ? 's' : ''} · {nObjs} objet{nObjs > 1 ? 's' : ''}
                        {scene.computed?.length ? ` · ${scene.computed.length} calcul(s)` : ''}
                    </p>
                </div>

                {/* Bouton Ouvrir */}
                <button onClick={openWindow} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px', borderRadius: 10,
                    background: 'rgba(99,102,241,0.8)', color: 'white',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    transition: 'all 0.15s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.8)')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={2} stroke="currentColor" width={14} height={14}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Ouvrir
                </button>
            </div>

            {/* Mesures exacts */}
            {scene.computed && scene.computed.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {scene.computed.map((r, i) => (
                        <span key={i} style={{
                            padding: '3px 12px', borderRadius: 20,
                            background: 'rgba(16,64,48,0.4)', border: '1px solid rgba(52,211,153,0.25)',
                            color: '#34d399', fontSize: 12, fontFamily: 'monospace',
                        }}>
                            {r.label} <strong>{r.latex}</strong>
                            {r.approx && <span style={{ color: 'rgba(100,116,139,0.8)', marginLeft: 6 }}>≈ {r.approx}</span>}
                        </span>
                    ))}
                </div>
            )}

            {opened && (
                <p style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)', margin: 0 }}>
                    ✓ Ouvert dans la fenêtre Géomètre
                </p>
            )}
        </div>
    );
}
