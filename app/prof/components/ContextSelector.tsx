'use client';

import { useState, useEffect } from 'react';
import type { Level, Chapter } from '@/lib/data';
import {
    RESOURCE_TYPE_LABELS,
    RESOURCE_TYPE_DESCRIPTIONS,
    EAM_ELIGIBLE_LEVELS,
    type ProfResourceType,
    type ProfContext,
} from '@/lib/prof-types';

interface ContextSelectorProps {
    levels: Level[];
    chapters: Chapter[];
    onContextChange: (context: ProfContext | null) => void;
    initialContext?: ProfContext | null;
}

export default function ContextSelector({
    levels,
    chapters,
    onContextChange,
    initialContext,
}: ContextSelectorProps) {
    const [selectedLevelId, setSelectedLevelId] = useState<string>(
        initialContext?.level_id || ''
    );
    const [selectedChapterId, setSelectedChapterId] = useState<string>(
        initialContext?.chapter_id || ''
    );
    const [selectedResourceType, setSelectedResourceType] = useState<ProfResourceType | ''>(
        initialContext?.resource_type || ''
    );

    // Chapitres filtrés par niveau
    const filteredChapters = chapters.filter(c => c.level_id === selectedLevelId);

    // Types de ressources disponibles
    const selectedLevel = levels.find(l => l.id === selectedLevelId);
    const isEamEligible = selectedLevel && EAM_ELIGIBLE_LEVELS.some(
        code => selectedLevel.code?.toLowerCase().includes(code) || selectedLevel.label?.toLowerCase().includes('premi')
    );

    const availableTypes: ProfResourceType[] = [
        'cours', 'exercices_1', 'exercices_2', 'exercices_3',
        'interactif', 'ds',
        ...(isEamEligible ? ['eam' as ProfResourceType] : []),
    ];

    // Reset chapitre quand le niveau change
    useEffect(() => {
        setSelectedChapterId('');
        setSelectedResourceType('');
    }, [selectedLevelId]);

    // Notifier le parent quand le contexte est complet
    useEffect(() => {
        if (selectedLevelId && selectedChapterId && selectedResourceType) {
            const level = levels.find(l => l.id === selectedLevelId);
            const chapter = chapters.find(c => c.id === selectedChapterId);
            if (level && chapter) {
                onContextChange({
                    level_id: level.id,
                    level_label: level.label,
                    level_code: level.code,
                    chapter_id: chapter.id,
                    chapter_title: chapter.title,
                    resource_type: selectedResourceType,
                });
            }
        } else {
            onContextChange(null);
        }
    }, [selectedLevelId, selectedChapterId, selectedResourceType, levels, chapters, onContextChange]);

    return (
        <div className="space-y-4">
            {/* Sélecteurs principaux */}
            <div className="flex flex-col md:flex-row gap-3">
                {/* Classe */}
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                        Classe
                    </label>
                    <select
                        id="prof-level-select"
                        value={selectedLevelId}
                        onChange={e => setSelectedLevelId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer hover:bg-white/[0.05]"
                    >
                        <option value="" className="bg-slate-900">— Sélectionnez une classe —</option>
                        {levels.map(level => (
                            <option key={level.id} value={level.id} className="bg-slate-900">
                                {level.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Chapitre */}
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                        Séquence / Chapitre
                    </label>
                    <select
                        id="prof-chapter-select"
                        value={selectedChapterId}
                        onChange={e => setSelectedChapterId(e.target.value)}
                        disabled={!selectedLevelId}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <option value="" className="bg-slate-900">— Sélectionnez un chapitre —</option>
                        {filteredChapters.map(chapter => (
                            <option key={chapter.id} value={chapter.id} className="bg-slate-900">
                                {chapter.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Type de ressource */}
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                        Type de ressource
                    </label>
                    <select
                        id="prof-resource-type-select"
                        value={selectedResourceType}
                        onChange={e => setSelectedResourceType(e.target.value as ProfResourceType)}
                        disabled={!selectedChapterId}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <option value="" className="bg-slate-900">— Type de ressource —</option>
                        {availableTypes.map(type => (
                            <option key={type} value={type} className="bg-slate-900">
                                {RESOURCE_TYPE_LABELS[type]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Description du type sélectionné */}
            {selectedResourceType && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <span className="text-indigo-400 text-lg">
                        {RESOURCE_TYPE_LABELS[selectedResourceType].split(' ')[0]}
                    </span>
                    <p className="text-xs text-slate-400">
                        {RESOURCE_TYPE_DESCRIPTIONS[selectedResourceType]}
                    </p>
                </div>
            )}
        </div>
    );
}
