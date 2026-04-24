'use client';

import { useState } from 'react';
import type { Level, Chapter } from '@/lib/data';
import {
    createLevelFromProf,
    updateLevelFromProf,
    deleteLevelFromProf,
    createChapterFromProf,
    updateChapterFromProf,
    deleteChapterFromProf,
} from '../actions';

interface Props {
    initialLevels: Level[];
    initialChapters: Chapter[];
}

export default function CurriculumManager({ initialLevels, initialChapters }: Props) {
    const [levels, setLevels] = useState<Level[]>(initialLevels);
    const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
    const [selectedLevelId, setSelectedLevelId] = useState<string>(initialLevels[0]?.id || '');

    // Level form
    const [levelForm, setLevelForm] = useState({ label: '', code: '', position: '' });
    const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
    const [editingLevelData, setEditingLevelData] = useState({ label: '', code: '', position: '' });
    const [levelBusy, setLevelBusy] = useState(false);
    const [levelError, setLevelError] = useState<string | null>(null);
    const [deleteLevelConfirm, setDeleteLevelConfirm] = useState<string | null>(null);

    // Chapter form
    const [chapterForm, setChapterForm] = useState({ title: '', position: '' });
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
    const [editingChapterData, setEditingChapterData] = useState({ title: '', position: '', published: false });
    const [chapterBusy, setChapterBusy] = useState(false);
    const [chapterError, setChapterError] = useState<string | null>(null);
    const [deleteChapterConfirm, setDeleteChapterConfirm] = useState<string | null>(null);

    const selectedChapters = chapters
        .filter(c => c.level_id === selectedLevelId)
        .sort((a, b) => a.position - b.position);

    // ── LEVEL ACTIONS ────────────────────────────────────────

    const handleCreateLevel = async () => {
        if (!levelForm.label.trim() || !levelForm.code.trim()) {
            setLevelError('Label et code sont obligatoires');
            return;
        }
        setLevelBusy(true);
        setLevelError(null);
        try {
            const newLevel = await createLevelFromProf({
                label: levelForm.label.trim(),
                code: levelForm.code.trim(),
                position: levelForm.position ? Number(levelForm.position) : undefined,
            });
            setLevels(prev => [...prev, newLevel].sort((a, b) => a.position - b.position));
            setLevelForm({ label: '', code: '', position: '' });
        } catch (e: any) {
            setLevelError(e.message);
        } finally {
            setLevelBusy(false);
        }
    };

    const handleSaveLevel = async (id: string) => {
        if (!editingLevelData.label.trim() || !editingLevelData.code.trim()) return;
        setLevelBusy(true);
        try {
            await updateLevelFromProf({
                id,
                label: editingLevelData.label.trim(),
                code: editingLevelData.code.trim(),
                position: editingLevelData.position ? Number(editingLevelData.position) : undefined,
            });
            setLevels(prev => prev.map(l =>
                l.id === id
                    ? { ...l, label: editingLevelData.label.trim(), code: editingLevelData.code.trim().toUpperCase(), position: Number(editingLevelData.position) || l.position }
                    : l
            ));
            setEditingLevelId(null);
        } catch (e: any) {
            setLevelError(e.message);
        } finally {
            setLevelBusy(false);
        }
    };

    const handleDeleteLevel = async (id: string) => {
        setLevelBusy(true);
        try {
            await deleteLevelFromProf(id);
            setLevels(prev => prev.filter(l => l.id !== id));
            setChapters(prev => prev.filter(c => c.level_id !== id));
            if (selectedLevelId === id) {
                const remaining = levels.filter(l => l.id !== id);
                setSelectedLevelId(remaining[0]?.id || '');
            }
        } catch (e: any) {
            setLevelError(e.message);
        } finally {
            setLevelBusy(false);
            setDeleteLevelConfirm(null);
        }
    };

    // ── CHAPTER ACTIONS ──────────────────────────────────────

    const handleCreateChapter = async () => {
        if (!chapterForm.title.trim() || !selectedLevelId) {
            setChapterError('Titre obligatoire — sélectionnez un niveau à gauche');
            return;
        }
        setChapterBusy(true);
        setChapterError(null);
        try {
            const newChapter = await createChapterFromProf(
                selectedLevelId,
                chapterForm.title.trim(),
                chapterForm.position ? Number(chapterForm.position) : undefined,
            );
            setChapters(prev => [...prev, { ...newChapter }].sort((a, b) => a.position - b.position));
            setChapterForm({ title: '', position: '' });
        } catch (e: any) {
            setChapterError(e.message);
        } finally {
            setChapterBusy(false);
        }
    };

    const handleSaveChapter = async (id: string) => {
        if (!editingChapterData.title.trim()) return;
        setChapterBusy(true);
        try {
            await updateChapterFromProf({
                id,
                title: editingChapterData.title.trim(),
                position: editingChapterData.position ? Number(editingChapterData.position) : undefined,
                published: editingChapterData.published,
            });
            setChapters(prev => prev.map(c =>
                c.id === id
                    ? { ...c, title: editingChapterData.title.trim(), position: Number(editingChapterData.position) || c.position, published: editingChapterData.published }
                    : c
            ));
            setEditingChapterId(null);
        } catch (e: any) {
            setChapterError(e.message);
        } finally {
            setChapterBusy(false);
        }
    };

    const handleDeleteChapter = async (id: string) => {
        setChapterBusy(true);
        try {
            await deleteChapterFromProf(id);
            setChapters(prev => prev.filter(c => c.id !== id));
        } catch (e: any) {
            setChapterError(e.message);
        } finally {
            setChapterBusy(false);
            setDeleteChapterConfirm(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── NIVEAUX ─────────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-white/5">
                    <h3 className="font-bold text-white text-sm">Niveaux</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{levels.length} niveau{levels.length > 1 ? 'x' : ''}</p>
                </div>

                <div className="flex-1 divide-y divide-white/5 overflow-y-auto max-h-[360px]">
                    {levels.length === 0 && (
                        <div className="px-5 py-8 text-center text-sm text-slate-600">Aucun niveau</div>
                    )}
                    {levels.map(level => (
                        <div
                            key={level.id}
                            className={`px-5 py-3 transition-colors cursor-pointer ${selectedLevelId === level.id ? 'bg-indigo-500/10' : 'hover:bg-white/[0.02]'}`}
                            onClick={() => { setSelectedLevelId(level.id); setEditingChapterId(null); }}
                        >
                            {editingLevelId === level.id ? (
                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            value={editingLevelData.label}
                                            onChange={e => setEditingLevelData(p => ({ ...p, label: e.target.value }))}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                            placeholder="Label"
                                        />
                                        <input
                                            value={editingLevelData.code}
                                            onChange={e => setEditingLevelData(p => ({ ...p, code: e.target.value }))}
                                            className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-mono uppercase focus:outline-none focus:border-indigo-500/50"
                                            placeholder="Code"
                                        />
                                        <input
                                            type="number"
                                            value={editingLevelData.position}
                                            onChange={e => setEditingLevelData(p => ({ ...p, position: e.target.value }))}
                                            className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                            placeholder="Pos."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSaveLevel(level.id)}
                                            disabled={levelBusy}
                                            className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
                                        >
                                            Sauvegarder
                                        </button>
                                        <button
                                            onClick={() => setEditingLevelId(null)}
                                            className="text-xs px-3 py-1 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {selectedLevelId === level.id && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                        )}
                                        <span className="text-sm text-white font-medium truncate">{level.label}</span>
                                        <span className="text-[11px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
                                            {level.code}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {deleteLevelConfirm === level.id ? (
                                            <>
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDeleteLevel(level.id); }}
                                                    disabled={levelBusy}
                                                    className="text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-40"
                                                >Oui</button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteLevelConfirm(null); }}
                                                    className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                                                >Non</button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setEditingLevelId(level.id); setEditingLevelData({ label: level.label, code: level.code, position: String(level.position) }); }}
                                                    className="p-1 text-slate-500 hover:text-white transition-colors rounded hover:bg-white/5"
                                                    title="Modifier"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                        <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteLevelConfirm(level.id); }}
                                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                                                    title="Supprimer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add level form */}
                <div className="px-5 py-4 border-t border-white/5 bg-white/[0.01] space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Nouveau niveau</p>
                    {levelError && <p className="text-xs text-red-400">{levelError}</p>}
                    <div className="flex gap-2">
                        <input
                            value={levelForm.label}
                            onChange={e => setLevelForm(p => ({ ...p, label: e.target.value }))}
                            placeholder="Nom (ex : Terminale)"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                            onKeyDown={e => e.key === 'Enter' && handleCreateLevel()}
                        />
                        <input
                            value={levelForm.code}
                            onChange={e => setLevelForm(p => ({ ...p, code: e.target.value }))}
                            placeholder="TG"
                            className="w-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                        />
                        <input
                            type="number"
                            value={levelForm.position}
                            onChange={e => setLevelForm(p => ({ ...p, position: e.target.value }))}
                            placeholder="Pos"
                            className="w-14 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>
                    <button
                        onClick={handleCreateLevel}
                        disabled={levelBusy || !levelForm.label.trim() || !levelForm.code.trim()}
                        className="w-full py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                        {levelBusy ? 'Création…' : '+ Ajouter ce niveau'}
                    </button>
                </div>
            </div>

            {/* ── CHAPITRES ───────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-white/5">
                    <h3 className="font-bold text-white text-sm">
                        Chapitres
                        {selectedLevelId && (
                            <span className="text-slate-500 font-normal ml-1">
                                — {levels.find(l => l.id === selectedLevelId)?.label}
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {selectedChapters.length} chapitre{selectedChapters.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {!selectedLevelId ? (
                    <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                        ← Sélectionnez un niveau
                    </div>
                ) : (
                    <>
                        <div className="flex-1 divide-y divide-white/5 overflow-y-auto max-h-[360px]">
                            {selectedChapters.length === 0 && (
                                <div className="px-5 py-8 text-center text-sm text-slate-600">
                                    Aucun chapitre pour ce niveau
                                </div>
                            )}
                            {selectedChapters.map(chapter => (
                                <div key={chapter.id} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                                    {editingChapterId === chapter.id ? (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={editingChapterData.title}
                                                    onChange={e => setEditingChapterData(p => ({ ...p, title: e.target.value }))}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                                />
                                                <input
                                                    type="number"
                                                    value={editingChapterData.position}
                                                    onChange={e => setEditingChapterData(p => ({ ...p, position: e.target.value }))}
                                                    className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                                    placeholder="Pos."
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={editingChapterData.published}
                                                    onChange={e => setEditingChapterData(p => ({ ...p, published: e.target.checked }))}
                                                    className="rounded border-white/20 bg-white/5 accent-indigo-500"
                                                />
                                                Publié (visible aux élèves)
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveChapter(chapter.id)}
                                                    disabled={chapterBusy}
                                                    className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
                                                >
                                                    Sauvegarder
                                                </button>
                                                <button
                                                    onClick={() => setEditingChapterId(null)}
                                                    className="text-xs px-3 py-1 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chapter.published ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                                    title={chapter.published ? 'Publié' : 'Brouillon'}
                                                />
                                                <span className="text-sm text-slate-200 truncate">{chapter.title}</span>
                                                <span className="text-[11px] text-slate-600 font-mono flex-shrink-0">#{chapter.position}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {deleteChapterConfirm === chapter.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleDeleteChapter(chapter.id)}
                                                            disabled={chapterBusy}
                                                            className="text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-40"
                                                        >Oui</button>
                                                        <button
                                                            onClick={() => setDeleteChapterConfirm(null)}
                                                            className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                                                        >Non</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => { setEditingChapterId(chapter.id); setEditingChapterData({ title: chapter.title, position: String(chapter.position), published: chapter.published }); }}
                                                            className="p-1 text-slate-500 hover:text-white transition-colors rounded hover:bg-white/5"
                                                            title="Modifier"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                                <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteChapterConfirm(chapter.id)}
                                                            className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                                                            title="Supprimer"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add chapter form */}
                        <div className="px-5 py-4 border-t border-white/5 bg-white/[0.01] space-y-2">
                            <p className="text-xs text-slate-500 font-medium">Nouveau chapitre</p>
                            {chapterError && <p className="text-xs text-red-400">{chapterError}</p>}
                            <div className="flex gap-2">
                                <input
                                    value={chapterForm.title}
                                    onChange={e => setChapterForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Titre du chapitre"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                                    onKeyDown={e => e.key === 'Enter' && handleCreateChapter()}
                                />
                                <input
                                    type="number"
                                    value={chapterForm.position}
                                    onChange={e => setChapterForm(p => ({ ...p, position: e.target.value }))}
                                    placeholder="Pos"
                                    className="w-14 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <button
                                onClick={handleCreateChapter}
                                disabled={chapterBusy || !chapterForm.title.trim()}
                                className="w-full py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                            >
                                {chapterBusy ? 'Création…' : '+ Ajouter ce chapitre'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
