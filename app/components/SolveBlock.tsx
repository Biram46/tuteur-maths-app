'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface SolveResult {
    success: boolean;
    type?: string;
    discriminant?: number;
    discriminant_type?: 'positive' | 'zero' | 'negative';
    a?: number;
    b?: number;
    c?: number;
    solutions?: string[];
    latex_solutions?: string[];
    steps?: string[];
    error?: string;
}

interface SolveBlockProps {
    equation: string;
}

/**
 * Composant qui affiche la résolution d'une équation via l'API SymPy.
 * Format d'entrée: "2*x**2-5*x+1=0"
 */
export default function SolveBlock({ equation }: SolveBlockProps) {
    const [result, setResult] = useState<SolveResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const solveEquation = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ equation }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Erreur lors de la résolution');
                } else {
                    setResult(data);
                }
            } catch (err: any) {
                setError(err.message || 'Erreur de connexion');
            } finally {
                setLoading(false);
            }
        };

        solveEquation();
    }, [equation]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-4 px-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-cyan-400 text-sm">Résolution en cours...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <span className="text-red-400 text-sm">Erreur: {error}</span>
            </div>
        );
    }

    if (!result || !result.success) {
        return (
            <div className="py-3 px-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <span className="text-yellow-400 text-sm">Impossible de résoudre cette équation</span>
            </div>
        );
    }

    return (
        <div className="my-4 p-4 rounded-2xl w-full"
            style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.08))',
                border: '1px solid rgba(34,197,94,0.3)',
            }}>
            {/* En-tête */}
            <div className="flex items-center gap-2 mb-3 pb-2"
                style={{ borderBottom: '1px solid rgba(34,197,94,0.2)' }}>
                <span className="text-lg">✓</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-green-400">
                    Résolution de l'équation
                </span>
            </div>

            {/* Équation originale */}
            <div className="mb-3 text-center">
                <span className="text-slate-400 text-sm">Équation: </span>
                <code className="text-cyan-300 bg-slate-800/50 px-2 py-1 rounded">{equation}</code>
            </div>

            {/* Étapes */}
            {result.steps && result.steps.length > 0 && (
                <div className="space-y-2 mb-4">
                    {result.steps.map((step, i) => (
                        <div key={i} className="text-sm">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ ...props }) => <p className="text-slate-300 m-0" {...props} />
                                }}
                            >
                                {step}
                            </ReactMarkdown>
                        </div>
                    ))}
                </div>
            )}

            {/* Solutions */}
            {result.solutions && result.solutions.length > 0 && (
                <div className="mt-4 pt-3"
                    style={{ borderTop: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="text-sm text-slate-400 mb-2">Solutions:</div>
                    <div className="flex flex-wrap gap-4 justify-center">
                        {result.solutions.map((sol, i) => (
                            <div key={i} className="px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30">
                                <span className="text-green-300 font-mono">
                                    x<sub>{i + 1}</sub> = {result.latex_solutions?.[i] || sol}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pas de solution */}
            {result.discriminant_type === 'negative' && (
                <div className="mt-3 text-center text-yellow-400">
                    Cette équation n'admet pas de solution réelle (Δ &lt; 0)
                </div>
            )}
        </div>
    );
}
