'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import type { Level, Chapter } from '@/lib/data';
import {
    getResourcesForProf,
    deleteResourceFromProf,
    getSignedUploadUrlForProf,
    createResourceEntryForProf,
    createResourceEntryFromUrl,
    type ResourceWithContext,
} from '../actions';
import { publishResource, unpublishResource } from '../actions';

const KIND_LABELS: Record<string, string> = {
    'cours': 'Cours',
    'cours-pdf': 'Cours',
    'exercices-pdf': 'Exercices',
    'interactif': 'Interactif',
};

const KIND_COLORS: Record<string, string> = {
    'cours': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'cours-pdf': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'exercices-pdf': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'interactif': 'text-green-400 bg-green-500/10 border-green-500/30',
};

const ACCEPTED_EXT: Record<string, string> = {
    'cours': '.pdf,.tex',
    'cours-pdf': '.pdf,.tex',
    'exercices-pdf': '.pdf,.tex',
    'interactif': '.html',
};

const PAGE_SIZE = 20;

interface Props {
    levels: Level[];
    chapters: Chapter[];
}

export default function ResourceManager({ levels, chapters }: Props) {
    const [resources, setResources] = useState<ResourceWithContext[]>([]);
    const [loading, setLoading] = useState(true);
    const [, startTransition] = useTransition();

    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterKind, setFilterKind] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(0);

    const [busyId, setBusyId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'file' | 'url'>('file');
    const [modalLevelId, setModalLevelId] = useState('');
    const [modalChapterId, setModalChapterId] = useState('');
    const [modalKind, setModalKind] = useState('cours');
    const [modalLabel, setModalLabel] = useState('');
    const [modalFile, setModalFile] = useState<File | null>(null);
    const [modalUrl, setModalUrl] = useState('');
    const [modalBusy, setModalBusy] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const loadResources = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getResourcesForProf();
            setResources(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadResources(); }, [loadResources]);
    useEffect(() => { setPage(0); }, [search, filterLevel, filterKind, filterStatus]);

    const COURS_KINDS = ['cours', 'cours-pdf'];

    const filtered = resources.filter(r => {
        if (filterLevel && r.level_id !== filterLevel) return false;
        if (filterKind) {
            if (filterKind === 'cours') {
                if (!COURS_KINDS.includes(r.kind)) return false;
            } else {
                if (r.kind !== filterKind) return false;
            }
        }
        if (filterStatus && r.status !== filterStatus) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!r.label?.toLowerCase().includes(q) && !r.chapter_title?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const modalChapters = chapters.filter(c => c.level_id === modalLevelId);

    const handlePublish = (id: string) => {
        setBusyId(id);
        startTransition(async () => {
            try { await publishResource(id); await loadResources(); }
            catch (e) { console.error(e); }
            finally { setBusyId(null); }
        });
    };

    const handleUnpublish = (id: string) => {
        setBusyId(id);
        startTransition(async () => {
            try { await unpublishResource(id); await loadResources(); }
            catch (e) { console.error(e); }
            finally { setBusyId(null); }
        });
    };

    const handleDelete = async (id: string) => {
        setBusyId(id);
        try {
            await deleteResourceFromProf(id);
            setResources(prev => prev.filter(r => r.id !== id));
        } finally {
            setBusyId(null);
            setDeleteConfirm(null);
        }
    };

    const resetModal = () => {
        setModalLevelId('');
        setModalChapterId('');
        setModalKind('cours');
        setModalLabel('');
        setModalFile(null);
        setModalUrl('');
        setModalMode('file');
        setModalError(null);
    };

    const handleModalSubmit = async () => {
        if (!modalChapterId) { setModalError('Sélectionnez un chapitre'); return; }
        if (modalMode === 'file' && !modalFile) { setModalError('Sélectionnez un fichier'); return; }
        if (modalMode === 'url' && !modalUrl.trim()) { setModalError('Entrez une URL valide'); return; }

        setModalBusy(true);
        setModalError(null);
        try {
            if (modalMode === 'file' && modalFile) {
                const ts = Date.now();
                const safe = modalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const storagePath = `resources/${ts}-${safe}`;
                const { signedUrl } = await getSignedUploadUrlForProf(storagePath);
                const resp = await fetch(signedUrl, {
                    method: 'PUT',
                    body: modalFile,
                    headers: { 'Content-Type': modalFile.type || 'application/octet-stream' },
                });
                if (!resp.ok) throw new Error(`Upload échoué (${resp.status})`);
                await createResourceEntryForProf({
                    chapterId: modalChapterId,
                    kind: modalKind,
                    storagePath,
                    label: modalLabel || undefined,
                });
            } else {
                await createResourceEntryFromUrl({
                    chapterId: modalChapterId,
                    kind: modalKind,
                    url: modalUrl.trim(),
                    label: modalLabel || undefined,
                });
            }
            await loadResources();
            setShowModal(false);
            resetModal();
        } catch (e: any) {
            setModalError(e.message);
        } finally {
            setModalBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Ressources pédagogiques</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{resources.length} ressource{resources.length !== 1 ? 's' : ''} au total</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                >
                    <span>+</span> Ajouter
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <input
                    type="text"
                    placeholder="Rechercher par label ou chapitre…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px] bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
                <select
                    value={filterLevel}
                    onChange={e => setFilterLevel(e.target.value)}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                    <option value="">Tous les niveaux</option>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                <select
                    value={filterKind}
                    onChange={e => setFilterKind(e.target.value)}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                    <option value="">Tous les types</option>
                    {Object.entries(KIND_LABELS).filter(([k]) => k !== 'cours-pdf').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50"
                >
                    <option value="">Tous les statuts</option>
                    <option value="published">Publié</option>
                    <option value="draft">Brouillon</option>
                </select>
                {(search || filterLevel || filterKind || filterStatus) && (
                    <button
                        onClick={() => { setSearch(''); setFilterLevel(''); setFilterKind(''); setFilterStatus(''); }}
                        className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                    >
                        Effacer filtres
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm">
                        {resources.length === 0
                            ? 'Aucune ressource. Cliquez sur "+ Ajouter" pour commencer.'
                            : 'Aucun résultat pour ces filtres.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Niveau</th>
                                    <th className="px-4 py-3 text-left font-medium">Chapitre</th>
                                    <th className="px-4 py-3 text-left font-medium">Label</th>
                                    <th className="px-4 py-3 text-left font-medium">Type</th>
                                    <th className="px-4 py-3 text-left font-medium">Fichiers</th>
                                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginated.map(r => (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                {r.level_code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={r.chapter_title}>
                                            {r.chapter_title}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate" title={r.label || ''}>
                                            {r.label || <span className="italic text-slate-600">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${KIND_COLORS[r.kind] || 'text-slate-400 bg-white/5 border-white/10'}`}>
                                                {KIND_LABELS[r.kind] || r.kind}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 flex-wrap">
                                                {r.pdf_url && (
                                                    <a href={`/api/storage/sign?url=${encodeURIComponent(r.pdf_url)}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                        title="Ouvrir le PDF">PDF</a>
                                                )}
                                                {r.latex_url && (
                                                    <a href={`/api/download?url=${encodeURIComponent(r.latex_url)}&filename=cours.tex`} download
                                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                                                        title="Télécharger le .tex">TEX</a>
                                                )}
                                                {r.html_url && (
                                                    <a href={r.html_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/20 transition-colors"
                                                        title="Ouvrir le HTML">HTML</a>
                                                )}
                                                {r.docx_url && (
                                                    <a href={r.docx_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                        title="Ouvrir le DOCX">DOCX</a>
                                                )}
                                                {!r.pdf_url && !r.latex_url && !r.html_url && !r.docx_url && (
                                                    <span className="text-[10px] text-slate-600 italic">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                                                r.status === 'published'
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                                            }`}>
                                                {r.status === 'published' ? 'Publié' : 'Brouillon'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {deleteConfirm === r.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-red-400">Confirmer ?</span>
                                                    <button
                                                        onClick={() => handleDelete(r.id)}
                                                        disabled={busyId === r.id}
                                                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-40"
                                                    >
                                                        {busyId === r.id ? '…' : 'Oui'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="text-xs px-2 py-1 rounded border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                                                    >
                                                        Non
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {r.status === 'draft' ? (
                                                        <button
                                                            onClick={() => handlePublish(r.id)}
                                                            disabled={busyId === r.id}
                                                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-40"
                                                        >
                                                            {busyId === r.id ? <span className="animate-pulse">…</span> : 'Publier'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUnpublish(r.id)}
                                                            disabled={busyId === r.id}
                                                            className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-40"
                                                        >
                                                            {busyId === r.id ? <span className="animate-pulse">…</span> : 'Dépublier'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setDeleteConfirm(r.id)}
                                                        disabled={busyId === r.id}
                                                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-40"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >←</button>
                        <span className="px-3 py-1">{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-colors"
                        >→</button>
                    </div>
                </div>
            )}

            {/* Modal ajout */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => { setShowModal(false); resetModal(); }}
                    />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white">Ajouter une ressource</h3>
                            <button
                                onClick={() => { setShowModal(false); resetModal(); }}
                                className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
                            >×</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Niveau</label>
                                <select
                                    value={modalLevelId}
                                    onChange={e => { setModalLevelId(e.target.value); setModalChapterId(''); }}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                >
                                    <option value="">— Choisir —</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Chapitre</label>
                                <select
                                    value={modalChapterId}
                                    onChange={e => setModalChapterId(e.target.value)}
                                    disabled={!modalLevelId}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-40"
                                >
                                    <option value="">— Choisir —</option>
                                    {modalChapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Type</label>
                                <select
                                    value={modalKind}
                                    onChange={e => { setModalKind(e.target.value); setModalFile(null); }}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                >
                                    {Object.entries(KIND_LABELS)
                                        .filter(([k]) => k !== 'cours-pdf')
                                        .map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Label (optionnel)</label>
                                <input
                                    type="text"
                                    value={modalLabel}
                                    onChange={e => setModalLabel(e.target.value)}
                                    placeholder="Ex : Cours Ch. 1"
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setModalMode('file')}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                                    modalMode === 'file'
                                        ? 'bg-indigo-600 border-indigo-500 text-white'
                                        : 'border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                Uploader un fichier
                            </button>
                            <button
                                onClick={() => setModalMode('url')}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                                    modalMode === 'url'
                                        ? 'bg-indigo-600 border-indigo-500 text-white'
                                        : 'border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                Entrer une URL
                            </button>
                        </div>

                        {modalMode === 'file' ? (
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                    Fichier{' '}
                                    <span className="text-slate-600">
                                        (accepté : {ACCEPTED_EXT[modalKind] || '.pdf,.tex,.html'})
                                    </span>
                                </label>
                                <input
                                    type="file"
                                    accept={ACCEPTED_EXT[modalKind] || '.pdf,.tex,.html'}
                                    onChange={e => setModalFile(e.target.files?.[0] || null)}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600/30 file:text-indigo-300 file:text-xs cursor-pointer"
                                />
                                {modalFile && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {modalFile.name} ({(modalFile.size / 1024).toFixed(1)} Ko)
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">URL publique</label>
                                <input
                                    type="url"
                                    value={modalUrl}
                                    onChange={e => setModalUrl(e.target.value)}
                                    placeholder="https://…"
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                        )}

                        {modalError && (
                            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                {modalError}
                            </p>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={handleModalSubmit}
                                disabled={modalBusy}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {modalBusy ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Envoi en cours…
                                    </>
                                ) : 'Enregistrer'}
                            </button>
                            <button
                                onClick={() => { setShowModal(false); resetModal(); }}
                                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
