'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    /** Identifiant du bloc pour le log (optionnel) */
    blockId?: string;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

/**
 * Error Boundary pour isoler les erreurs de rendu des figures mathématiques.
 * Si renderFigure() lève une exception sur un bloc @@@  malformé,
 * seul ce bloc affiche un message d'erreur — le reste de la conversation
 * reste intact.
 *
 * Usage :
 *   <FigureErrorBoundary blockId={rawBlock}>
 *     {renderFigure(rawBlock)}
 *   </FigureErrorBoundary>
 */
export class FigureErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            errorMessage: error?.message ?? 'Erreur inconnue',
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.warn(
            `[FigureErrorBoundary] Erreur rendu figure${this.props.blockId ? ` (${this.props.blockId.slice(0, 40)})` : ''}:`,
            error.message,
            info.componentStack?.slice(0, 200)
        );
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-2 my-2 rounded-lg bg-red-950/40 border border-red-800/50 text-red-400 text-[12px] font-mono">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>Figure non rendue — format inattendu</span>
                </div>
            );
        }

        return this.props.children;
    }
}
