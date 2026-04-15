'use client';

import { useEffect } from 'react';

export default function ProfError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Prof Error]', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-2xl text-white mx-auto mb-6 shadow-lg">
                    !
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Espace professeur indisponible</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    Une erreur est survenue dans le tableau de bord. Réessaie ou contacte le support.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                    >
                        Réessayer
                    </button>
                    <a
                        href="/prof"
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 transition-all"
                    >
                        Recharger
                    </a>
                </div>
            </div>
        </div>
    );
}
