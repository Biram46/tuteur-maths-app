'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    fetchRagDocuments, 
    addRagDocument, 
    deleteRagDocument, 
    updateRagDocument, 
    bulkDeleteByFilename,
    fetchRagStats,
    fetchRagFileGroups,
    fixRagContentWithAI,
    RagDocument,
    RagStats,
    RagFileGroup
} from './actions';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import MathTable from '@/app/components/MathTable';
import MathGraph from '@/app/components/MathGraph';
import GeometryFigure from '@/app/components/GeometryFigure';

export default function RagAdminDashboard({ initialDocs }: { initialDocs: RagDocument[] }) {
    const [documents, setDocuments] = useState<RagDocument[]>(initialDocs);
    const [stats, setStats] = useState<RagStats[]>([]);
    const [fileGroups, setFileGroups] = useState<RagFileGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterNiveau, setFilterNiveau] = useState('');
    const [filterType, setFilterType] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalDocs, setTotalDocs] = useState(0);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<RagDocument | null>(null);
    const [docContent, setDocContent] = useState('');
    const [docMetadata, setDocMetadata] = useState('');
    const [activeTab, setActiveTab] = useState<'source' | 'preview'>('source');

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        loadStats();
        loadDocuments();
    }, [page, filterNiveau, filterType]);

    const loadStats = async () => {
        try {
            const [s, f] = await Promise.all([fetchRagStats(), fetchRagFileGroups()]);
            setStats(s);
            setFileGroups(f);
        } catch (e: any) {
            console.error('Stats error:', e);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const res = await fetchRagDocuments(page, 30, searchTerm, filterNiveau, filterType);
            setDocuments(res.documents);
            setTotalDocs(res.total);
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        setPage(1);
        loadDocuments();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Es-tu sûr de vouloir supprimer ce chunk ?')) return;
        setLoading(true);
        try {
            await deleteRagDocument(id);
            setDocuments(docs => docs.filter(d => d.id !== id));
            setSuccessMsg('Chunk supprimé.');
            setTimeout(() => setSuccessMsg(''), 3000);
            loadStats();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDeleteFile = async (filename: string) => {
        if (!confirm(`Es-tu sûr de vouloir supprimer TOUS les chunks du fichier "${filename}" ?`)) return;
        setLoading(true);
        try {
            const res = await bulkDeleteByFilename(filename);
            setSuccessMsg(`${res.deleted} chunks supprimés pour ${filename}.`);
            setTimeout(() => setSuccessMsg(''), 3000);
            loadDocuments();
            loadStats();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        
        let parsedMetadata = {};
        try {
            parsedMetadata = JSON.parse(docMetadata);
        } catch (e) {
            setErrorMsg('Format JSON invalide dans les métadonnées.');
            return;
        }

        if (!docContent.trim()) {
            setErrorMsg('Le contenu ne peut pas être vide.');
            return;
        }

        setLoading(true);
        try {
            if (editingDoc) {
                const updated = await updateRagDocument(editingDoc.id, docContent, parsedMetadata);
                setDocuments(docs => docs.map(d => d.id === editingDoc.id ? updated : d));
                setSuccessMsg('Document mis à jour.');
            } else {
                const created = await addRagDocument(docContent, parsedMetadata);
                setDocuments([created, ...documents]);
                setSuccessMsg('Nouveau document ajouté.');
            }
            setIsModalOpen(false);
            setTimeout(() => setSuccessMsg(''), 3000);
            loadStats();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicFix = async () => {
        if (!docContent.trim()) return;
        setLoading(true);
        try {
            const result = await fixRagContentWithAI(docContent);
            const fixed = result.replace(/^```markdown\n/i, '').replace(/^```\n/i, '').replace(/\n```$/i, '').trim();
            setDocContent(fixed);
            setSuccessMsg('Magie opérée : LaTeX nettoyé.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e: any) {
            setErrorMsg(`Erreur Magie : ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingDoc(null);
        setDocContent('');
        setDocMetadata(JSON.stringify({ source: "manuel", niveau: "seconde", type_doc: "cours" }, null, 2));
        setIsModalOpen(true);
        setActiveTab('source');
    };

    const openEditModal = (doc: RagDocument) => {
        setEditingDoc(doc);
        setDocContent(doc.content);
        setDocMetadata(JSON.stringify(doc.metadata, null, 2));
        setIsModalOpen(true);
        setActiveTab('source');
    };

    // Parasite score: documents that look like admin files
    const parasiteGroups = useMemo(() => {
        const keywords = ['bulletin', 'incident', 'classe', 'lettre', 'appréciation', 'liste', 'plan', 'infographie', 'reunion'];
        return fileGroups.filter(g => {
            const name = (g.filename || '').toLowerCase();
            return keywords.some(k => name.includes(k));
        });
    }, [fileGroups]);

    return (
        <div className="w-full flex-1 flex flex-col gap-6 overflow-hidden rag-admin-container">
            <style jsx global>{`
                .rag-admin-container *::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .rag-admin-container *::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 10px;
                }
                .rag-admin-container *::-webkit-scrollbar-thumb {
                    background: rgba(16, 185, 129, 0.4);
                    border-radius: 10px;
                    border: 2px solid rgba(15, 23, 42, 0.5);
                }
                .rag-admin-container *::-webkit-scrollbar-thumb:hover {
                    background: rgba(16, 185, 129, 0.7);
                }
            `}</style>
            {/* Stats Row - More compact */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 border border-emerald-500/20 px-4 py-2 rounded-xl">
                    <h3 className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-1">Total Chunks</h3>
                    <p className="text-xl font-bold text-slate-100">{totalDocs}</p>
                </div>
                <div className="bg-slate-900/50 border border-amber-500/20 px-4 py-2 rounded-xl">
                    <h3 className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-1">Files Parasites</h3>
                    <p className="text-xl font-bold text-slate-100">{parasiteGroups.length}</p>
                </div>
                <div className="bg-slate-900/50 border border-cyan-500/20 px-4 py-2 rounded-xl col-span-2 overflow-x-auto">
                    <h3 className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1">RÉPARTITION</h3>
                    <div className="flex gap-4">
                        {stats.filter(s => s.type_doc === 'cours').map(s => (
                            <div key={`${s.niveau}-${s.type_doc}`} className="flex items-baseline gap-2">
                                <span className="text-[9px] text-slate-500 font-mono uppercase">{s.niveau}</span>
                                <span className="text-xs font-bold text-cyan-400">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toolbar - More compact */}
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20 shadow-lg">
                <form onSubmit={handleSearch} className="flex gap-3 items-center">
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        className="bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 w-64 font-mono text-xs focus:border-emerald-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select 
                        className="bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 text-xs font-mono outline-none focus:border-emerald-500"
                        value={filterNiveau}
                        onChange={(e) => setFilterNiveau(e.target.value)}
                    >
                        <option value="">Tous Niveaux</option>
                        <option value="seconde">Seconde</option>
                        <option value="1spe">1ère Spé</option>
                        <option value="1stmg">1ère STMG</option>
                        <option value="tle_spe">Terminale Spé</option>
                        <option value="tle_comp">Terminale Comp</option>
                        <option value="tle_expert">Terminale Expert</option>
                    </select>
                    <button 
                        type="submit"
                        className="bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded hover:bg-emerald-600/40 text-sm font-mono transition-all"
                    >
                        Filtrer
                    </button>
                    {loading && <span className="text-emerald-500 animate-pulse text-sm">Synchronisation...</span>}
                </form>
                <div className="flex gap-4">
                    <button 
                        onClick={openCreateModal}
                        className="bg-emerald-500 text-slate-950 font-bold px-6 py-2 rounded shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all uppercase tracking-wider text-sm"
                    >
                        + Nouveau Chunk
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded text-sm font-mono animate-pulse">
                    ALERTE SYSTÈME : {errorMsg}
                </div>
            )}
            
            {successMsg && (
                <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 p-4 rounded text-sm font-mono">
                    {successMsg}
                </div>
            )}

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Main Documents Table */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden flex-[2] flex flex-col">
                    <div className="overflow-y-auto w-full p-4 flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase cursor-default">
                                    <th className="p-4 font-normal">Contenu & Rendu</th>
                                    <th className="p-4 font-normal">Métadonnées</th>
                                    <th className="p-4 font-normal text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-500 font-mono">
                                            Aucun document trouvé.
                                        </td>
                                    </tr>
                                ) : documents.map((doc) => (
                                    <tr key={doc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-2 w-[65%]">
                                            <div className="flex flex-col gap-2">
                                                <div className="bg-slate-950/80 p-6 rounded-xl border border-slate-800 text-sm h-auto shadow-inner group-hover:border-emerald-500/30 transition-all">
                                                    <div className="prose prose-invert prose-sm max-w-none math-rendered">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkMath, remarkGfm]}
                                                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                            components={{
                                                                mathtable: ({ node, ...props }) => {
                                                                    try {
                                                                        const data = JSON.parse(props.data);
                                                                        return (
                                                                            <div className="w-full overflow-x-auto my-4 pb-4 border border-slate-800/50 rounded-lg bg-slate-900/30" style={{ scrollbarWidth: 'auto' }}>
                                                                                <div style={{ minWidth: '1080px' }}>
                                                                                    <MathTable data={data} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } catch (e) {
                                                                        return <pre className="text-red-400 text-[10px]">Erreur Table: {props.data}</pre>;
                                                                    }
                                                                },
                                                                mathgraph: ({ node, ...props }) => {
                                                                    try {
                                                                        const data = JSON.parse(props.data);
                                                                        return (
                                                                            <div className="w-full overflow-x-auto my-4 pb-4 bg-slate-900 rounded-lg border border-slate-700 shadow-xl" style={{ scrollbarWidth: 'auto' }}>
                                                                                <div style={{ minWidth: '600px' }}>
                                                                                    <MathGraph {...data} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } catch (e) {
                                                                        return <pre className="text-red-400 text-[10px]">Erreur Graph: {props.data}</pre>;
                                                                    }
                                                                },
                                                                geometryfigure: ({ node, ...props }) => {
                                                                    try {
                                                                        const data = JSON.parse(props.data);
                                                                        return (
                                                                            <div className="w-full overflow-x-auto my-4 py-2 flex justify-center bg-slate-900/10 rounded-lg" style={{ scrollbarWidth: 'auto' }}>
                                                                                <div style={{ minWidth: '500px' }}>
                                                                                    <GeometryFigure scene={data} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } catch (e) {
                                                                        return <pre className="text-red-400 text-[10px]">Erreur Géo: {props.data}</pre>;
                                                                    }
                                                                },
                                                                p: ({ node, ...props }) => <div className="mb-4 last:mb-0 leading-relaxed break-words" {...props} />
                                                            }}
                                                        >
                                                            {doc.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block w-fit font-mono uppercase ${
                                                    doc.metadata.type_doc === 'cours' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {doc.metadata.type_doc || 'N/A'}
                                                </span>
                                                <span className="text-[10px] text-emerald-400 font-mono uppercase">{doc.metadata.niveau}</span>
                                                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{doc.metadata.filename}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => openEditModal(doc)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded transition-all">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-all">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/30">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Affichage {(page-1)*30 + 1}-{Math.min(page*30, totalDocs)} sur {totalDocs}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs disabled:opacity-30 border border-slate-700"
                            >
                                Précédent
                            </button>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs border border-emerald-500/30 font-mono">{page}</span>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * 30 >= totalDocs}
                                className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs disabled:opacity-30 border border-slate-700"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Files & Parasites */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden max-w-sm">
                    {/* Parasite Protection */}
                    <div className="bg-slate-900/50 rounded-xl border border-amber-500/30 overflow-hidden flex flex-col">
                        <div className="p-4 bg-amber-500/10 border-b border-amber-500/30">
                            <h3 className="text-sm font-['Orbitron'] text-amber-500 uppercase tracking-widest">Protocoles d'Urgence</h3>
                            <p className="text-[9px] text-amber-600 font-mono mt-1">Détection de documents non-pédagogiques</p>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[300px] flex flex-col gap-2">
                            {parasiteGroups.length === 0 ? (
                                <p className="text-xs text-slate-500 font-mono text-center py-4">Aucun parasite flaggé.</p>
                            ) : parasiteGroups.map(g => (
                                <div key={`${g.niveau}-${g.type_doc}-${g.filename}`} className="bg-slate-950 p-2 rounded border border-amber-500/20 flex justify-between items-center group">
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-[10px] text-amber-400 font-mono truncate">{g.filename}</span>
                                        <span className="text-[9px] text-slate-500 font-mono uppercase">{g.chunks} chunks</span>
                                    </div>
                                    <button 
                                        onClick={() => handleBulkDeleteFile(g.filename!)}
                                        className="p-1 text-amber-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Purger ce fichier"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* All Files List */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="text-sm font-['Orbitron'] text-slate-400 uppercase tracking-widest">Index des Fichiers</h3>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1 flex flex-col gap-1">
                            {fileGroups.map(g => (
                                <div key={`${g.niveau}-${g.type_doc}-${g.filename}`} className="text-[10px] p-2 hover:bg-slate-800/50 cursor-pointer flex justify-between group">
                                    <span className="text-slate-400 font-mono truncate max-w-[180px]">{g.filename || 'Sans-Nom'}</span>
                                    <span className="text-cyan-500 font-mono">{g.chunks}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-8">
                    <div className="bg-slate-900 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-2xl w-[1000px] h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <div className="flex items-center gap-6">
                                <h2 className="text-xl font-['Orbitron'] text-emerald-400 uppercase">
                                    {editingDoc ? 'Modification Node RAG' : 'Initialisation Node RAG'}
                                </h2>
                                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                                    <button 
                                        onClick={() => setActiveTab('source')}
                                        className={`px-4 py-1.5 rounded-md text-[10px] font-mono transition-all ${activeTab === 'source' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        CODE LATEX / BRUT
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('preview')}
                                        className={`px-4 py-1.5 rounded-md text-[10px] font-mono transition-all ${activeTab === 'preview' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        APERÇU LIVE
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="flex flex-1 overflow-hidden p-6 gap-6 bg-slate-950/50">
                            <div className="flex-[3] flex flex-col gap-4 overflow-hidden">
                                <div className="grid grid-cols-2 gap-6 h-full">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Source LaTeX / Texte Brut</label>
                                            <button 
                                                onClick={handleMagicFix}
                                                disabled={loading}
                                                className="bg-purple-600/20 border border-purple-500/50 text-purple-400 px-3 py-1 rounded-md text-[9px] font-bold hover:bg-purple-600/40 transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                                            >
                                                <span>✨ MAGIC FIX (AI)</span>
                                            </button>
                                        </div>
                                        <textarea 
                                            className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-200 outline-none focus:border-emerald-500 flex-1 font-mono resize-none shadow-2xl transition-all"
                                            value={docContent}
                                            onChange={e => setDocContent(e.target.value)}
                                            placeholder="Coller le contenu ici (Supporte LaTeX via $ ou $$)..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 overflow-hidden">
                                        <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest px-2">Rendu Mathématique Temps Réel</label>
                                        <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-8 flex-1 overflow-y-auto shadow-2xl">
                                            <div className="prose max-w-none prose-slate">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath, remarkGfm]}
                                                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                    components={{
                                                        // @ts-ignore
                                                        mathtable: ({ node, ...props }) => {
                                                            try {
                                                                const data = JSON.parse(props.data);
                                                                return (
                                                                    <div className="w-full overflow-x-auto my-4 pb-4 border border-slate-200 rounded-lg shadow-inner bg-slate-50">
                                                                        <div style={{ minWidth: '1080px' }}>
                                                                            <MathTable data={data} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } catch (e) {
                                                                return <pre className="text-red-400 text-[10px]">Erreur Table: {props.data}</pre>;
                                                            }
                                                        },
                                                        mathgraph: ({ node, ...props }) => {
                                                            try {
                                                                const data = JSON.parse(props.data);
                                                                return (
                                                                    <div className="w-full overflow-x-auto my-4 pb-4 bg-white rounded-lg border border-slate-200 shadow-xl">
                                                                        <div style={{ minWidth: '600px' }}>
                                                                            <MathGraph {...data} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } catch (e) {
                                                                return <pre className="text-red-400 text-[10px]">Erreur Graph: {props.data}</pre>;
                                                            }
                                                        },
                                                        geometryfigure: ({ node, ...props }) => {
                                                            try {
                                                                const data = JSON.parse(props.data);
                                                                return (
                                                                    <div className="w-full overflow-x-auto my-4 py-2 flex justify-center bg-slate-50/50 rounded-lg">
                                                                        <div style={{ minWidth: '500px' }}>
                                                                            <GeometryFigure scene={data} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } catch (e) {
                                                                return <pre className="text-red-400 text-[10px]">Erreur Géo: {props.data}</pre>;
                                                            }
                                                        },
                                                        p: ({ node, ...props }) => <div className="mb-4 last:mb-0 leading-relaxed break-words" {...props} />
                                                    }}
                                                >
                                                    {docContent || "*Contenu vide*"}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col gap-4 overflow-hidden border-l border-slate-800 pl-6">
                                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-xl flex-1 overflow-hidden">
                                        <h3 className="text-xs font-['Orbitron'] text-slate-500 uppercase tracking-widest">Configuration Métadonnées</h3>
                                        <textarea 
                                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-[11px] text-cyan-300 outline-none focus:border-emerald-500 flex-1 font-mono shadow-inner resize-none"
                                            value={docMetadata}
                                            onChange={e => setDocMetadata(e.target.value)}
                                        />
                                        <div className="p-2 bg-emerald-500/5 rounded border border-emerald-500/10">
                                            <p className="text-[9px] text-slate-500 leading-relaxed italic">
                                                Identifiez le document via son niveau et type pour le RAG. 
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="w-full py-4 rounded-xl font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Synchronisation...
                                                </>
                                            ) : (
                                                'Enregistrer les modifications'
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => setIsModalOpen(false)}
                                            className="w-full py-2 rounded-lg font-bold border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest"
                                        >
                                            Abandonner
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
