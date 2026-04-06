'use client';

import { useMemo, useTransition } from 'react';
import type { Level, Chapter, Resource } from '@/lib/data';
import {
    type SequenceGridRow,
    type CellStatus,
    type ProfResourceType,
    GRID_COLUMNS,
    EAM_COLUMN,
    EAM_ELIGIBLE_LEVELS,
    type ProfContext,
} from '@/lib/prof-types';
import { publishResourcesByIds } from '../actions';

interface SequenceGridProps {
    levels: Level[];
    chapters: Chapter[];
    resources: Resource[];
    sequences: any[];
    selectedLevelId: string | null;
    onCellClick: (chapterId: string, chapterTitle: string, resourceType: ProfResourceType) => void;
}

/** Détermine le statut d'une cellule en cherchant dans les ressources */
function getCellStatus(resources: Resource[], chapterId: string, kinds: string[], label?: string): CellStatus {
    const matching = resources.filter(r => {
        if (r.chapter_id !== chapterId) return false;
        const kindMatch = kinds.some(k => r.kind.toLowerCase().includes(k));
        if (!kindMatch) return false;
        if (label && r.label) {
            return r.label.toLowerCase().includes(label.toLowerCase());
        }
        return true;
    });

    if (matching.length === 0) return 'none';
    if (matching.some(r => r.status === 'published')) return 'published';
    return 'draft';
}

/** Icône de statut */
function StatusIcon({ status }: { status: CellStatus }) {
    switch (status) {
        case 'published':
            return <span title="Publié" className="text-green-400 text-lg">✅</span>;
        case 'draft':
            return <span title="Brouillon" className="text-amber-400 text-lg animate-pulse">🔄</span>;
        case 'none':
        default:
            return <span title="Non créé" className="text-slate-600 text-sm">—</span>;
    }
}

export default function SequenceGrid({
    levels,
    chapters,
    resources,
    sequences,
    selectedLevelId,
    onCellClick,
}: SequenceGridProps) {
    const [isPending, startTransition] = useTransition();

    // Filtrer les chapitres du niveau sélectionné
    const visibleChapters = useMemo(() =>
        chapters.filter(c => c.level_id === selectedLevelId)
            .sort((a, b) => a.position - b.position),
        [chapters, selectedLevelId]
    );

    // Vérifier si le niveau est éligible EAM
    const selectedLevel = levels.find(l => l.id === selectedLevelId);
    const showEam = selectedLevel && EAM_ELIGIBLE_LEVELS.some(
        code => selectedLevel.code?.toLowerCase().includes(code) || selectedLevel.label?.toLowerCase().includes('premi')
    );

    // Colonnes visibles
    const columns = useMemo(() =>
        showEam ? [...GRID_COLUMNS, EAM_COLUMN] : GRID_COLUMNS,
        [showEam]
    );

    // Construire les lignes de la grille
    const gridRows: SequenceGridRow[] = useMemo(() =>
        visibleChapters.map(chapter => {
            const seq = sequences.find(s =>
                s.chapter_id === chapter.id && s.level_id === selectedLevelId
            );

            return {
                chapter_id: chapter.id,
                chapter_title: chapter.title,
                chapter_position: chapter.position,
                sequence_id: seq?.id || null,
                cours: getCellStatus(resources, chapter.id, ['cours']),
                fe1: getCellStatus(resources, chapter.id, ['exercice', 'exo', 'exercices'], 'N°1'),
                fe2: getCellStatus(resources, chapter.id, ['exercice', 'exo', 'exercices'], 'N°2'),
                fe3: getCellStatus(resources, chapter.id, ['exercice', 'exo', 'exercices'], 'N°3'),
                interactif: getCellStatus(resources, chapter.id, ['interactif']),
                ds: getCellStatus(resources, chapter.id, ['ds', 'devoir']),
                ...(showEam ? { eam: getCellStatus(resources, chapter.id, ['eam', 'épreuve']) } : {}),
            };
        }),
        [visibleChapters, resources, sequences, selectedLevelId, showEam]
    );

    // Compter les brouillons pour le bouton TOUT VALIDER
    const totalDrafts = useMemo(() =>
        resources.filter(r =>
            r.status === 'draft' &&
            visibleChapters.some(c => c.id === r.chapter_id)
        ).length,
        [resources, visibleChapters]
    );

    // Publier tous les brouillons du niveau sélectionné
    const handlePublishAll = () => {
        // Récupérer directement les IDs des ressources en brouillon pour les chapitres visibles
        const draftResourceIds = resources
            .filter(r =>
                r.status === 'draft' &&
                visibleChapters.some(c => c.id === r.chapter_id)
            )
            .map(r => r.id);

        if (draftResourceIds.length === 0) return;

        startTransition(async () => {
            try {
                await publishResourcesByIds(draftResourceIds);
            } catch (e) {
                console.error('Erreur publication:', e);
            }
        });
    };

    if (!selectedLevelId) {
        return (
            <div className="text-center py-16">
                <div className="text-4xl mb-4 opacity-30">📋</div>
                <p className="text-slate-500 text-sm">Sélectionnez une classe pour voir les séquences</p>
            </div>
        );
    }

    if (visibleChapters.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="text-4xl mb-4 opacity-30">📂</div>
                <p className="text-slate-500 text-sm">Aucun chapitre pour ce niveau</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Titre + Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">
                        Séquences — {selectedLevel?.label}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {visibleChapters.length} chapitre{visibleChapters.length > 1 ? 's' : ''} •{' '}
                        {totalDrafts > 0 ? (
                            <span className="text-amber-400">{totalDrafts} brouillon{totalDrafts > 1 ? 's' : ''}</span>
                        ) : (
                            <span className="text-green-400">Tout publié</span>
                        )}
                    </p>
                </div>

                {totalDrafts > 0 && (
                    <button
                        onClick={handlePublishAll}
                        disabled={isPending}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white text-sm font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/40 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span>✅</span>
                        )}
                        TOUT VALIDER
                    </button>
                )}
            </div>

            {/* Grille */}
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Chapitre
                            </th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className="text-center px-3 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {gridRows.map((row, idx) => (
                            <tr
                                key={row.chapter_id}
                                className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${
                                    idx % 2 === 0 ? '' : 'bg-white/[0.01]'
                                }`}
                            >
                                <td className="px-5 py-3 font-medium text-slate-300 max-w-[200px] truncate">
                                    {row.chapter_title}
                                </td>
                                {columns.map(col => {
                                    const status = row[col.key as keyof SequenceGridRow] as CellStatus;
                                    return (
                                        <td key={col.key} className="text-center px-3 py-3">
                                            <button
                                                onClick={() => onCellClick(row.chapter_id, row.chapter_title, col.resourceType)}
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/5 transition-all active:scale-90 cursor-pointer"
                                                title={`${col.label} — ${row.chapter_title}`}
                                            >
                                                <StatusIcon status={status} />
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Légende */}
            <div className="flex items-center gap-6 px-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="text-green-400">✅</span> Publié</span>
                <span className="flex items-center gap-1.5"><span className="text-amber-400">🔄</span> Brouillon</span>
                <span className="flex items-center gap-1.5"><span className="text-slate-600">—</span> Non créé</span>
                <span className="ml-auto italic">Cliquez sur une cellule pour créer ou modifier</span>
            </div>
        </div>
    );
}
