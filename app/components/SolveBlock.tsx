'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface SolveResult {
    success: boolean;
    // Nouveau format
    domain_latex?: string;
    forbidden_points?: string[];
    equation_latex?: string;
    f_expr_latex?: string;
    factored_latex?: string;
    factor_details?: {
        label: string;
        type: string;
        multiplicity: number;
        delta?: string;
        roots: string[];
    }[];
    solution_set_latex?: string;
    solutions?: string[];
    solutions_approx?: string[];
    steps?: string[];
    // Ancien format (compat)
    type?: string;
    discriminant?: number;
    discriminant_type?: 'positive' | 'zero' | 'negative';
    latex_solutions?: string[];
    error?: string;
}

interface SolveBlockProps {
    equation: string;
    niveau?: string;  // seconde | premiere | terminale_spe
    onSpeakResult?: (text: string) => void;
}

const MD_OPTS = {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
};

const Md = ({ children }: { children: string }) => (
    <ReactMarkdown
        {...MD_OPTS}
        components={{ p: ({ ...props }) => <p className="m-0 text-slate-200" {...props} /> }}
    >
        {children}
    </ReactMarkdown>
);

/**
 * Affiche la résolution complète d'une équation via l'API SymPy.
 * Pipeline : domaine → f(x)=0 → factorisation → résolution par discriminant.
 */
export default function SolveBlock({ equation, niveau, onSpeakResult }: SolveBlockProps) {
    const [result, setResult] = useState<SolveResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const solve = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('/api/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ equation, niveau: niveau ?? 'terminale_spe' }),
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || 'Erreur');
                } else {
                    setResult(data);
                    if (onSpeakResult && data.success && Array.isArray(data.steps) && data.steps.length > 0) {
                        onSpeakResult(data.steps.join('\n'));
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Erreur de connexion');
            } finally {
                setLoading(false);
            }
        };
        solve();
    }, [equation]);

    if (loading) return (
        <div className="flex items-center gap-3 py-4 px-5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg,rgba(34,197,94,.08),rgba(16,185,129,.05))', border: '1px solid rgba(34,197,94,.25)' }}>
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-emerald-400 text-sm font-medium">Résolution en cours…</span>
        </div>
    );

    if (error) return (
        <div className="py-3 px-4 rounded-xl" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)' }}>
            <span className="text-red-400 text-sm">⚠ Erreur : {error}</span>
        </div>
    );

    if (!result?.success) return (
        <div className="py-3 px-4 rounded-xl" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)' }}>
            <span className="text-amber-400 text-sm">Impossible de résoudre cette équation.</span>
        </div>
    );

    // Cas nouveau format
    const hasNewFormat = Array.isArray(result.steps) && result.steps.length > 0 && result.steps[0].includes('Étape');
    const hasSolutions = result.solutions && result.solutions.length > 0;

    return (
        <div className="my-4 rounded-2xl overflow-hidden w-full"
            style={{ background: 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(16,185,129,.07))', border: '1px solid rgba(34,197,94,.3)' }}>

            {/* En-tête */}
            <div className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.06)' }}>
                <span className="text-xl">🔢</span>
                <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">Résolution</span>
                {result.domain_latex && result.domain_latex !== '\\mathbb{R}' && (
                    <span className="ml-auto text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                        <Md>{`$D_f = ${result.domain_latex}$`}</Md>
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* Étapes pédagogiques */}
                {hasNewFormat && result.steps!.map((step, i) => {
                    const isConclusion = step.startsWith('**Conclusion');
                    return (
                        <div key={i}
                            className={`rounded-xl p-4 ${isConclusion ? 'text-center' : ''}`}
                            style={{
                                background: isConclusion
                                    ? 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1))'
                                    : 'rgba(15,23,42,.4)',
                                border: isConclusion
                                    ? '1px solid rgba(34,197,94,.4)'
                                    : '1px solid rgba(71,85,105,.3)',
                            }}>
                            <div className="text-sm space-y-2">
                                <Md>{step}</Md>
                            </div>
                        </div>
                    );
                })}

                {/* Ancien format : discriminant */}
                {!hasNewFormat && result.steps && result.steps.map((step, i) => (
                    <div key={i} className="text-sm rounded-lg px-3 py-2"
                        style={{ background: 'rgba(15,23,42,.4)', border: '1px solid rgba(71,85,105,.3)' }}>
                        <Md>{step}</Md>
                    </div>
                ))}

                {/* Boîte des solutions */}
                {hasSolutions && !hasNewFormat && (
                    <div className="pt-4" style={{ borderTop: '1px solid rgba(34,197,94,.2)' }}>
                        <div className="text-xs text-slate-400 mb-3 uppercase tracking-widest">Solutions</div>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {result.solutions!.map((sol, i) => (
                                <div key={i} className="px-4 py-2 rounded-xl"
                                    style={{ background: 'rgba(15,23,42,.6)', border: '1px solid rgba(34,197,94,.35)' }}>
                                    <Md>{`$x_{${i + 1}} = ${result.latex_solutions?.[i] || sol}$`}</Md>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pas de solution */}
                {(!hasSolutions && !hasNewFormat) && (
                    <div className="text-center text-amber-400 text-sm">
                        Aucune solution réelle — $\Delta &lt; 0$
                    </div>
                )}
            </div>
        </div>
    );
}
