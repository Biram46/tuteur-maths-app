'use client';

import { useState, useTransition } from 'react';
import { addRagNote, deleteRagNotes } from '../actions';

type IngestStats = { total: number; indexed: number; skipped: number; chunks: number; errors: number };
type IngestError = { id: string; url: string; reason: string };

interface Props {
    chapters: { id: string; title: string; level_id: string }[];
    levels: { id: string; label: string }[];
}

export default function RagNotesManager({ chapters, levels }: Props) {
    const [isPending, startTransition] = useTransition();
    const [content, setContent] = useState('');
    const [chapitreCustom, setChapitreCustom] = useState('');
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [ingestLoading, setIngestLoading] = useState(false);
    const [ingestStats, setIngestStats] = useState<IngestStats | null>(null);
    const [ingestErrors, setIngestErrors] = useState<IngestError[]>([]);

    const visibleChapters = selectedLevelId
        ? chapters.filter(c => c.level_id === selectedLevelId)
        : chapters;

    const selectedChapter = chapters.find(c => c.id === selectedChapterId);
    const selectedLevel = levels.find(l => l.id === selectedLevelId);

    const chapitre = chapitreCustom.trim() || selectedChapter?.title || '';
    const niveau = selectedLevel?.label || '';

    const handleAdd = () => {
        if (!content.trim() || !chapitre || !niveau) {
            setStatus({ ok: false, msg: 'Remplis tous les champs.' });
            return;
        }
        startTransition(async () => {
            const result = await addRagNote({ content: content.trim(), chapitre, niveau });
            if (result.success) {
                setStatus({ ok: true, msg: `✅ Note ajoutée dans le RAG (${chapitre} — ${niveau})` });
                setContent('');
            } else {
                setStatus({ ok: false, msg: `❌ Erreur : ${result.error}` });
            }
        });
    };

    const handleIngest = async (force: boolean) => {
        if (!confirm(force ? 'Ré-indexer TOUTES les ressources LaTeX ? (écrase les chunks existants)' : 'Indexer les nouvelles ressources LaTeX ?')) return;
        setIngestLoading(true);
        setIngestStats(null);
        try {
            const res = await fetch('/api/admin/rag-ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force }),
            });
            const json = await res.json();
            if (json.success) {
                setIngestStats(json.stats);
                setIngestErrors(json.errorDetails ?? []);
            } else {
                setStatus({ ok: false, msg: `Erreur indexation : ${json.error}` });
            }
        } catch (err: any) {
            setStatus({ ok: false, msg: `Erreur réseau : ${err.message}` });
        } finally {
            setIngestLoading(false);
        }
    };

    const handleDelete = (chap: string) => {
        if (!confirm(`Supprimer toutes les notes manuelles RAG pour "${chap}" ?`)) return;
        startTransition(async () => {
            const result = await deleteRagNotes(chap);
            setStatus(result.success
                ? { ok: true, msg: `✅ Notes supprimées pour "${chap}"` }
                : { ok: false, msg: `❌ ${result.error}` }
            );
        });
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                    Notes pédagogiques RAG
                </h2>
            </header>

            <div className="bg-slate-900/40 rounded-3xl border border-cyan-500/10 p-8 space-y-6">
                <p className="text-slate-400 text-sm">
                    Ajoute une note pédagogique directement dans la base de connaissances du tuteur IA.
                    Elle sera utilisée lors des réponses aux élèves sur ce chapitre.
                </p>

                {/* Niveau */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Classe / Niveau</label>
                    <select
                        value={selectedLevelId}
                        onChange={e => { setSelectedLevelId(e.target.value); setSelectedChapterId(''); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">— Sélectionner un niveau —</option>
                        {levels.map(l => (
                            <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                    </select>
                </div>

                {/* Chapitre */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Chapitre</label>
                    <select
                        value={selectedChapterId}
                        onChange={e => { setSelectedChapterId(e.target.value); setChapitreCustom(''); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 mb-2"
                        disabled={!selectedLevelId}
                    >
                        <option value="">— Sélectionner un chapitre —</option>
                        {visibleChapters.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={chapitreCustom}
                        onChange={e => { setChapitreCustom(e.target.value); setSelectedChapterId(''); }}
                        placeholder="Ou saisir un nom de chapitre libre…"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                </div>

                {/* Contenu */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Note pédagogique</label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={5}
                        placeholder="Ex : Dans le produit scalaire, ne pas oublier le projeté orthogonal comme méthode de calcul…"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                    <p className="text-xs text-slate-600 mt-1">{content.length} caractères</p>
                </div>

                {status && (
                    <div className={`px-4 py-3 rounded-xl text-sm font-medium ${status.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {status.msg}
                    </div>
                )}

                <button
                    onClick={handleAdd}
                    disabled={isPending || !content.trim() || !chapitre || !niveau}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                >
                    {isPending ? '⏳ Ajout en cours…' : '➕ Ajouter dans le RAG'}
                </button>
            </div>

            {/* Indexation automatique LaTeX */}
            <div className="bg-slate-900/40 rounded-3xl border border-fuchsia-500/10 p-6 space-y-4">
                <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest">Indexation automatique (fichiers LaTeX)</h3>
                <p className="text-slate-400 text-xs">
                    Parcourt toutes les ressources avec un fichier <code className="text-fuchsia-300">.tex</code>, les découpe en chunks et les indexe dans le RAG via <strong>text-embedding-3-small</strong>.
                </p>

                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => handleIngest(false)}
                        disabled={ingestLoading}
                        className="px-5 py-2.5 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-sm font-bold hover:bg-fuchsia-600/30 disabled:opacity-40 transition-all"
                    >
                        {ingestLoading ? '⏳ Indexation…' : '⚡ Indexer les nouvelles'}
                    </button>
                    <button
                        onClick={() => handleIngest(true)}
                        disabled={ingestLoading}
                        className="px-5 py-2.5 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-600/20 disabled:opacity-40 transition-all"
                    >
                        🔄 Ré-indexer tout (force)
                    </button>
                </div>

                {ingestStats && (
                    <div className="space-y-3">
                        <div className="bg-slate-800/60 rounded-2xl border border-fuchsia-500/10 p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                                { label: 'Ressources', value: ingestStats.total },
                                { label: 'Indexées', value: ingestStats.indexed, color: 'text-green-400' },
                                { label: 'Ignorées', value: ingestStats.skipped, color: 'text-slate-400' },
                                { label: 'Chunks créés', value: ingestStats.chunks, color: 'text-fuchsia-400' },
                                { label: 'Erreurs', value: ingestStats.errors, color: 'text-red-400' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="text-center">
                                    <p className={`text-2xl font-bold font-mono ${color ?? 'text-white'}`}>{value}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>
                        {ingestErrors.length > 0 && (
                            <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2">Détail des erreurs</p>
                                {ingestErrors.map((e, i) => (
                                    <p key={i} className="text-[10px] text-red-300 font-mono truncate">{e.reason} — {e.url.split('/').pop()}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Info suppression */}
            <div className="bg-slate-900/40 rounded-3xl border border-red-500/10 p-6">
                <h3 className="text-sm font-bold text-red-400 mb-3 uppercase tracking-widest">Supprimer les notes manuelles</h3>
                <p className="text-slate-500 text-xs mb-4">Supprime toutes les notes manuelles d'un chapitre (les chunks issus de PDF ne sont pas affectés).</p>
                <div className="flex gap-3">
                    <input
                        id="del-chap"
                        type="text"
                        placeholder="Nom exact du chapitre"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                        onClick={() => {
                            const val = (document.getElementById('del-chap') as HTMLInputElement)?.value;
                            if (val) handleDelete(val);
                        }}
                        disabled={isPending}
                        className="px-5 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-600/30 disabled:opacity-40 transition-all"
                    >
                        🗑 Supprimer
                    </button>
                </div>
            </div>
        </div>
    );
}
