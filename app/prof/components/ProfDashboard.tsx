'use client';

import { useState, useCallback, useTransition } from 'react';
import type { Level, Chapter, Resource } from '@/lib/data';
import type { ProfContext, ProfResourceType } from '@/lib/prof-types';
import ContextSelector from './ContextSelector';
import SequenceGrid from './SequenceGrid';
import ProfChatbot from './ProfChatbot';
import ResourceManager from './ResourceManager';
import CurriculumManager from './CurriculumManager';
import PdfToLatex from './PdfToLatex';
import { getOrCreateSequence } from '../actions';

interface ProfDashboardProps {
    initialData: {
        levels: Level[];
        chapters: Chapter[];
        resources: Resource[];
        sequences: any[];
        chatSessions: any[];
    };
    teacherId: string;
}

type ViewMode = 'grid' | 'chat' | 'resources' | 'curriculum' | 'converter' | 'free';

const FREE_MODE_CONTEXT: ProfContext = {
    level_id: 'libre',
    level_label: 'Mode libre',
    level_code: 'libre',
    chapter_id: 'libre',
    chapter_title: 'Mode libre',
    resource_type: 'cours',
    free_mode: true,
};

export default function ProfDashboard({ initialData, teacherId }: ProfDashboardProps) {
    const { levels, chapters, resources, sequences, chatSessions } = initialData;

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [profContext, setProfContext] = useState<ProfContext | null>(null);
    const [selectedLevelId, setSelectedLevelId] = useState<string>(
        levels.length > 0 ? levels[0].id : ''
    );
    const [sequenceId, setSequenceId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Quand le contexte change via ContextSelector
    const handleContextChange = useCallback((ctx: ProfContext | null) => {
        setProfContext(ctx);
        if (ctx) {
            setSelectedLevelId(ctx.level_id);
        }
    }, []);

    // Quand on clique sur une cellule dans la grille
    const handleCellClick = useCallback((chapterId: string, chapterTitle: string, resourceType: ProfResourceType) => {
        const level = levels.find(l => l.id === selectedLevelId);
        if (!level) return;

        const ctx: ProfContext = {
            level_id: level.id,
            level_label: level.label,
            level_code: level.code,
            chapter_id: chapterId,
            chapter_title: chapterTitle,
            resource_type: resourceType,
        };

        setProfContext(ctx);

        // Créer ou récupérer la séquence
        startTransition(async () => {
            try {
                const seq = await getOrCreateSequence(teacherId, level.id, chapterId);
                setSequenceId(seq.id);
                ctx.sequence_id = seq.id;
                setProfContext({ ...ctx });
                setViewMode('chat');
            } catch (e) {
                console.error('Erreur getOrCreateSequence:', e);
            }
        });
    }, [levels, selectedLevelId, teacherId]);

    // Retour à la grille depuis le chat
    const handleBackToGrid = useCallback(() => {
        setViewMode('grid');
        setProfContext(null);
    }, []);

    // Ouverture du chat via le contextSelector (quand les 3 selects sont remplis)
    const handleStartChat = useCallback(() => {
        if (!profContext) return;

        startTransition(async () => {
            try {
                const seq = await getOrCreateSequence(teacherId, profContext.level_id, profContext.chapter_id);
                setSequenceId(seq.id);
                setProfContext(prev => prev ? { ...prev, sequence_id: seq.id } : null);
                setViewMode('chat');
            } catch (e) {
                console.error('Erreur getOrCreateSequence:', e);
            }
        });
    }, [profContext, teacherId]);

    return (
        <div className="space-y-8">
            {/* ── MODE SWITCH ────────────────────────────────────── */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="inline-flex bg-white/[0.03] border border-white/10 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            viewMode === 'grid'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        📋 Séquences
                    </button>
                    <button
                        onClick={() => setViewMode('chat')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            viewMode === 'chat'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        💬 Chatbot
                    </button>
                    <button
                        onClick={() => setViewMode('resources')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            viewMode === 'resources'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        📚 Ressources
                    </button>
                    <button
                        onClick={() => setViewMode('curriculum')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            viewMode === 'curriculum'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        🗂️ Curriculum
                    </button>
                    <button
                        onClick={() => setViewMode('converter')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            viewMode === 'converter'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        🔄 Convertisseur
                    </button>
                    <button
                        onClick={() => setViewMode('free')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            viewMode === 'free'
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        🎨 Mode libre
                    </button>
                </div>

                {viewMode === 'chat' && profContext && (
                    <button
                        onClick={handleBackToGrid}
                        className="text-sm text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                        ← Retour aux séquences
                    </button>
                )}
            </div>

            {/* ── SÉLECTEUR DE CONTEXTE ──────────────────────────── */}
            {viewMode === 'chat' && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                    <ContextSelector
                        levels={levels}
                        chapters={chapters}
                        onContextChange={handleContextChange}
                        initialContext={profContext}
                    />
                    {profContext && !sequenceId && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleStartChat}
                                disabled={isPending}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPending ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <span>🚀</span>
                                )}
                                Démarrer la création
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── VUE GRILLE ────────────────────────────────────── */}
            {viewMode === 'grid' && (
                <div className="space-y-6">
                    {/* Sélecteur de niveau pour la grille */}
                    <div className="flex flex-wrap gap-2">
                        {levels.map(level => (
                            <button
                                key={level.id}
                                onClick={() => setSelectedLevelId(level.id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border ${
                                    selectedLevelId === level.id
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 scale-105'
                                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06] hover:border-white/20'
                                }`}
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>

                    <SequenceGrid
                        levels={levels}
                        chapters={chapters}
                        resources={resources}
                        sequences={sequences}
                        selectedLevelId={selectedLevelId}
                        onCellClick={handleCellClick}
                    />
                </div>
            )}

            {/* ── VUE CHATBOT ───────────────────────────────────── */}
            {viewMode === 'chat' && profContext && sequenceId && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                    <ProfChatbot
                        context={profContext}
                        sequenceId={sequenceId}
                        teacherId={teacherId}
                    />
                </div>
            )}

            {viewMode === 'chat' && !profContext && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4 opacity-20">👆</div>
                    <p className="text-slate-500 text-sm">
                        Sélectionnez une classe, un chapitre et un type de ressource pour commencer
                    </p>
                </div>
            )}

            {/* ── VUE MODE LIBRE ────────────────────────────────── */}
            {viewMode === 'free' && (
                <div className="bg-white/[0.02] border border-violet-500/20 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                    <ProfChatbot
                        context={FREE_MODE_CONTEXT}
                        sequenceId="libre"
                        teacherId={teacherId}
                    />
                </div>
            )}

            {/* ── VUE RESSOURCES ────────────────────────────────── */}
            {viewMode === 'resources' && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <ResourceManager levels={levels} chapters={chapters} />
                </div>
            )}

            {/* ── VUE CONVERTISSEUR ─────────────────────────────── */}
            {viewMode === 'converter' && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <PdfToLatex />
                </div>
            )}

            {/* ── VUE CURRICULUM ────────────────────────────────── */}
            {viewMode === 'curriculum' && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">Curriculum</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Gérez les niveaux et chapitres visibles dans l'application</p>
                    </div>
                    <CurriculumManager initialLevels={levels} initialChapters={chapters} />
                </div>
            )}
        </div>
    );
}
