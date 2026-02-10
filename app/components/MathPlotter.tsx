'use client';

import { useEffect, useRef } from 'react';
import functionPlot from 'function-plot';

interface MathPlotterProps {
    options: any;
    title?: string;
}

export default function MathPlotter({ options, title }: MathPlotterProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rootRef.current || !containerRef.current) return;

        const updatePlot = () => {
            if (!rootRef.current || !containerRef.current) return;

            try {
                const width = containerRef.current.offsetWidth || 500;
                const height = Math.min(width * 0.7, 400);

                const defaultOptions = {
                    target: rootRef.current,
                    width: width,
                    height: height,
                    grid: true,
                    xAxis: { domain: [-6, 6] },
                    yAxis: { domain: [-4, 4] },
                    disableZoom: false,
                    tip: {
                        xLine: true,
                        yLine: true,
                        renderer: function (x: number, y: number) {
                            return `x: ${x.toFixed(2)}, y: ${y.toFixed(2)}`;
                        }
                    },
                    ...options
                };

                // L'élément cible doit être réinitialisé car function-plot ajoute du contenu
                rootRef.current.innerHTML = '';
                functionPlot(defaultOptions);
            } catch (error) {
                console.error("Erreur de traçage :", error);
            }
        };

        // Initial plot
        updatePlot();

        // Responsive update
        const observer = new ResizeObserver(() => {
            updatePlot();
        });
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [options]);

    return (
        <div ref={containerRef} className="w-full my-10 p-4 sm:p-10 bg-slate-900/40 rounded-[2rem] sm:rounded-[3rem] border border-blue-500/30 flex flex-col items-center shadow-2xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>

            {title && (
                <span className="text-[11px] text-blue-400 font-mono mb-6 sm:mb-10 uppercase tracking-[0.6em] font-bold z-10 text-center">
                    {title}
                </span>
            )}

            <div className="bg-white/5 p-2 sm:p-4 rounded-2xl border border-white/5 relative z-10 w-full overflow-hidden flex justify-center">
                <div ref={rootRef} className="math-plot-container [&_svg]:bg-transparent [&_path.domain]:stroke-white/30 [&_line]:stroke-white/10 [&_text]:fill-white/60 [&_path.line]:stroke-[3px]" />
            </div>

            <div className="mt-6 text-[10px] text-slate-500 italic opacity-60 text-center">
                Graphe interactif • Survolez pour lire les valeurs • Zoom/Déplacement activés
            </div>
        </div>
    );
}
