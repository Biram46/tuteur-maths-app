'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { getDraftContent, updateDraftContent, publishResource } from '../actions';

interface DraftEditorProps {
    resourceId: string;
    resourceLabel: string;
    chapterTitle: string;
    onClose: () => void;
    onSaved?: () => void;
}

export default function DraftEditor({
    resourceId,
    resourceLabel,
    chapterTitle,
    onClose,
    onSaved,
}: DraftEditorProps) {
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [published, setPublished] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Charger le contenu à l'ouverture
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getDraftContent(resourceId);
                if (!cancelled) {
                    setContent(data.content);
                    setOriginalContent(data.content);
                    setLoading(false);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e.message);
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [resourceId]);

    const hasChanges = content !== originalContent;

    // Sauvegarder
    const handleSave = useCallback(() => {
        startTransition(async () => {
            try {
                await updateDraftContent(resourceId, content);
                setOriginalContent(content);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                onSaved?.();
            } catch (e: any) {
                setError(e.message);
            }
        });
    }, [content, resourceId, onSaved]);

    // Sauvegarder + Publier
    const handleSaveAndPublish = useCallback(() => {
        startTransition(async () => {
            try {
                if (hasChanges) {
                    await updateDraftContent(resourceId, content);
                    setOriginalContent(content);
                }
                await publishResource(resourceId);
                setPublished(true);
                setTimeout(() => {
                    onSaved?.();
                    onClose();
                }, 1000);
            } catch (e: any) {
                setError(e.message);
            }
        });
    }, [content, hasChanges, resourceId, onSaved, onClose]);

    // Raccourci clavier Ctrl+S
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasChanges) handleSave();
            }
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [hasChanges, handleSave, onClose]);

    // Gestion du Tab dans le textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = textareaRef.current;
            if (!ta) return;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newVal = content.substring(0, start) + '    ' + content.substring(end);
            setContent(newVal);
            requestAnimationFrame(() => {
                ta.selectionStart = ta.selectionEnd = start + 4;
            });
        }
    };

    const lineCount = content.split('\n').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-[95vw] max-w-[1200px] h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
                            ✏️
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">{resourceLabel}</h2>
                            <p className="text-[10px] text-slate-500">{chapterTitle}</p>
                        </div>
                        {hasChanges && (
                            <span className="ml-3 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                Modifié
                            </span>
                        )}
                        {saved && (
                            <span className="ml-2 text-green-400 text-xs font-bold animate-pulse">
                                ✓ Sauvegardé
                            </span>
                        )}
                        {published && (
                            <span className="ml-2 text-green-400 text-xs font-bold animate-pulse">
                                ✅ Publié !
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sauvegarder */}
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isPending}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 disabled:hover:bg-indigo-600/20"
                        >
                            {isPending ? '⏳' : '💾'} Sauvegarder
                        </button>

                        {/* Sauvegarder & Publier */}
                        <button
                            onClick={handleSaveAndPublish}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 disabled:opacity-50"
                        >
                            {isPending ? '⏳' : '🚀'} Valider & Publier
                        </button>

                        {/* Fermer */}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all text-sm"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Corps — éditeur */}
                <div className="flex-1 overflow-hidden relative">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin"></div>
                                <span className="text-xs text-slate-500">Chargement du brouillon…</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center max-w-md">
                                <p className="text-red-400 text-sm font-medium mb-2">Erreur</p>
                                <p className="text-red-300/70 text-xs">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex">
                            {/* Numéros de ligne */}
                            <div className="w-12 bg-slate-950/50 border-r border-white/5 py-3 overflow-hidden text-right pr-2 select-none pointer-events-none flex-shrink-0"
                                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '20px' }}
                            >
                                {Array.from({ length: lineCount }, (_, i) => (
                                    <div key={i} className="text-slate-600 h-5">{i + 1}</div>
                                ))}
                            </div>

                            {/* Éditeur */}
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                className="flex-1 bg-transparent text-slate-200 p-3 resize-none focus:outline-none overflow-auto"
                                style={{
                                    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
                                    fontSize: '13px',
                                    lineHeight: '20px',
                                    tabSize: 4,
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer — statistiques */}
                <div className="px-6 py-2 border-t border-white/5 bg-slate-950/30 flex items-center justify-between text-[10px] text-slate-600">
                    <span>{lineCount} lignes • {content.length} caractères</span>
                    <span className="tracking-widest uppercase">Ctrl+S pour sauvegarder • Échap pour fermer</span>
                </div>
            </div>
        </div>
    );
}
