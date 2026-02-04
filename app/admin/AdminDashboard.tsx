"use client";

import { useState, useEffect } from "react";
import { Level, Chapter, Resource } from "@/lib/data";
import {
    createOrUpdateLevel,
    createOrUpdateChapter,
    createOrUpdateResource,
    uploadResourceWithFile,
    deleteLevel,
    deleteChapter,
    deleteResource
} from "./actions";

interface Props {
    initialData: {
        levels: Level[];
        chapters: Chapter[];
        resources: Resource[];
    };
}

export default function AdminDashboard({ initialData }: Props) {
    const { levels, chapters, resources } = initialData;
    const [activeTab, setActiveTab] = useState<"levels" | "chapters" | "resources" | "results" | "converter">("levels");

    // States for editing
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);

    // States for converter
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [targetFormat, setTargetFormat] = useState<"pdf" | "docx" | "tex">("pdf");
    const [isConverting, setIsConverting] = useState(false);
    const [conversionError, setConversionError] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return (
        <div className="flex-1 min-h-[600px] bg-slate-950/50 backdrop-blur-xl border border-cyan-500/10 rounded-3xl animate-pulse flex items-center justify-center">
            <div className="text-cyan-500/30 font-['Orbitron'] tracking-[0.5em] uppercase text-sm">Chargement du Système Admin...</div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/50 backdrop-blur-xl border border-cyan-500/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Sidebar / Tabs */}
            <div className="flex border-b border-cyan-500/10">
                <button
                    onClick={() => setActiveTab("levels")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'levels' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Niveaux
                </button>
                <button
                    onClick={() => setActiveTab("chapters")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'chapters' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Chapitres
                </button>
                <button
                    onClick={() => setActiveTab("resources")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'resources' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Ressources
                </button>
                <button
                    onClick={() => setActiveTab("results")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'results' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Résultats
                </button>
                <button
                    onClick={() => setActiveTab("converter")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'converter' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    🔄 Convertisseur
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">

                {/* --- TAB NIVEAUX --- */}
                {activeTab === "levels" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Gestion des Niveaux</h2>
                            <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.3em]">Total: {levels.length}</span>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Table */}
                            <div className="bg-slate-900/40 rounded-2xl border border-cyan-500/10 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-cyan-500/5 border-b border-cyan-500/10 font-['Orbitron'] text-[10px] text-cyan-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Nom</th>
                                            <th className="px-6 py-4">Code</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyan-500/5">
                                        {levels.map((level) => (
                                            <tr key={level.id} className="group hover:bg-cyan-500/5 transition-colors">
                                                <td className="px-6 py-4 text-slate-300 font-medium">{level.label}</td>
                                                <td className="px-6 py-4"><span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 text-[10px] font-mono">{level.code}</span></td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingLevel(level)}
                                                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                            </svg>
                                                        </button>
                                                        <form action={deleteLevel}>
                                                            <input type="hidden" name="id" value={level.id} />
                                                            <button type="submit" className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                                </svg>
                                                            </button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Form */}
                            <div className="bg-slate-900/60 rounded-3xl border border-cyan-500/20 p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl pointer-events-none"></div>
                                <h3 className="text-lg font-bold font-['Orbitron'] text-cyan-100 mb-6 uppercase tracking-wider">
                                    {editingLevel ? 'Modifier le niveau' : 'Nouvel emplacement pédagogique'}
                                </h3>
                                <form action={createOrUpdateLevel} key={editingLevel?.id || 'new'} className="space-y-6">
                                    <input type="hidden" name="id" value={editingLevel?.id || ""} />

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Désignation</label>
                                        <input
                                            type="text"
                                            name="label"
                                            placeholder="Ex : Terminale Générale"
                                            defaultValue={editingLevel?.label || ""}
                                            required
                                            className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all font-['Exo_2']"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Code Système</label>
                                            <input
                                                type="text"
                                                name="code"
                                                placeholder="Ex : TG"
                                                defaultValue={editingLevel?.code || ""}
                                                required
                                                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all font-mono text-sm uppercase"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Priorité Affichage</label>
                                            <input
                                                type="number"
                                                name="position"
                                                defaultValue={editingLevel?.position || levels.length + 1}
                                                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button type="submit" className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">
                                            {editingLevel ? 'Mettre à jour' : 'Initialiser'}
                                        </button>
                                        {editingLevel && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingLevel(null)}
                                                className="px-6 border border-slate-700 hover:border-slate-500 text-slate-400 transition-all rounded-xl text-[10px] uppercase tracking-widest"
                                            >
                                                Annuler
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB CHAPITRES --- */}
                {activeTab === "chapters" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Gestion des Chapitres</h2>
                            <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.3em]">Total: {chapters.length}</span>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Table */}
                            <div className="bg-slate-900/40 rounded-2xl border border-cyan-500/10 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-cyan-500/5 border-b border-cyan-500/10 font-['Orbitron'] text-[10px] text-cyan-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Niveau</th>
                                            <th className="px-6 py-4">Titre</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyan-500/5">
                                        {chapters.map((chapter) => {
                                            const level = levels.find(l => l.id === chapter.level_id);
                                            return (
                                                <tr key={chapter.id} className="group hover:bg-cyan-500/5 transition-colors">
                                                    <td className="px-6 py-4 text-cyan-400 font-mono text-[10px]">{level?.code || '???'}</td>
                                                    <td className="px-6 py-4 text-slate-300 font-medium">
                                                        {chapter.title}
                                                        {!chapter.published && <span className="ml-2 text-[8px] text-fuchsia-400/60 uppercase border border-fuchsia-500/30 px-1 rounded">Brouillon</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingChapter(chapter)}
                                                                className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                                </svg>
                                                            </button>
                                                            <form action={deleteChapter}>
                                                                <input type="hidden" name="id" value={chapter.id} />
                                                                <button type="submit" className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                                    </svg>
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Form */}
                            <div className="bg-slate-900/60 rounded-3xl border border-cyan-500/20 p-8 shadow-2xl relative overflow-hidden">
                                <h3 className="text-lg font-bold font-['Orbitron'] text-cyan-100 mb-6 uppercase tracking-wider">
                                    {editingChapter ? 'Modifier le chapitre' : 'Séquencer le cours'}
                                </h3>
                                <form action={createOrUpdateChapter} key={editingChapter?.id || 'new'} className="space-y-6">
                                    <input type="hidden" name="id" value={editingChapter?.id || ""} />

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Niveau Cible</label>
                                        <select
                                            name="level_id"
                                            defaultValue={editingChapter?.level_id || ""}
                                            required
                                            className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-['Exo_2']"
                                        >
                                            <option value="">Sélectionner un niveau</option>
                                            {levels.map(l => <option key={l.id} value={l.id}>{l.label} ({l.code})</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Titre du Chapitre</label>
                                        <input
                                            type="text"
                                            name="title"
                                            placeholder="Ex : Nombres Complexes"
                                            defaultValue={editingChapter?.title || ""}
                                            required
                                            className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-400 transition-all font-['Exo_2']"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Code URL</label>
                                            <input
                                                type="text"
                                                name="code"
                                                placeholder="Ex : complexes"
                                                defaultValue={editingChapter?.code || ""}
                                                required
                                                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-mono text-xs"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Ordre</label>
                                            <input
                                                type="number"
                                                name="position"
                                                defaultValue={editingChapter?.position || chapters.length + 1}
                                                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                        <div className="relative">
                                            <input type="checkbox" name="published" defaultChecked={editingChapter ? editingChapter.published : true} className="sr-only peer" />
                                            <div className="w-10 h-6 bg-slate-800 rounded-full border border-cyan-900 peer-checked:bg-cyan-500/50 peer-checked:border-cyan-400 shadow-inner transition-all"></div>
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all"></div>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-cyan-400 transition-colors">Visible par les élèves</span>
                                    </label>

                                    <div className="flex gap-3 pt-4">
                                        <button type="submit" className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">
                                            {editingChapter ? 'Mettre à jour' : 'Graver le chapitre'}
                                        </button>
                                        {editingChapter && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingChapter(null)}
                                                className="px-6 border border-slate-700 hover:border-slate-500 text-slate-400 transition-all rounded-xl text-[10px] uppercase tracking-widest"
                                            >
                                                Annuler
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB RESSOURCES --- */}
                {activeTab === "resources" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Gestion des Ressources</h2>
                            <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.3em]">Total: {resources.length}</span>
                        </header>

                        <div className="grid grid-cols-1 gap-12">
                            {/* Table Large */}
                            <div className="bg-slate-900/40 rounded-2xl border border-cyan-500/10 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-cyan-500/5 border-b border-cyan-500/10 font-['Orbitron'] text-[10px] text-cyan-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Séquence</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Contenu / Liens</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyan-500/5">
                                        {resources.map((r) => {
                                            const ch = chapters.find(c => c.id === r.chapter_id);
                                            const pf = levels.find(l => l.id === ch?.level_id);
                                            return (
                                                <tr key={r.id} className="group hover:bg-cyan-500/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-cyan-400 font-mono text-[10px] uppercase tracking-tighter">{pf?.code || '???'}</span>
                                                            <span className="text-slate-300 text-xs font-medium">{ch?.title || '???'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${r.kind === 'cours' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                            r.kind === 'interactif' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30' :
                                                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                            }`}>
                                                            {r.kind}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2 flex-wrap">
                                                            {r.pdf_url && <span title={r.pdf_url} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[8px] text-red-400 font-bold">PDF</span>}
                                                            {r.docx_url && <span title={r.docx_url} className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[8px] text-blue-400 font-bold">DOC</span>}
                                                            {r.latex_url && <span title={r.latex_url} className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-[8px] text-slate-300 font-bold">TEX</span>}
                                                            {r.html_url && <span title={r.html_url} className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-[8px] text-fuchsia-400 font-bold">HTML</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingResource(r)}
                                                                className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                                </svg>
                                                            </button>
                                                            <form action={deleteResource}>
                                                                <input type="hidden" name="id" value={r.id} />
                                                                <button type="submit" className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                                    </svg>
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Manual Form */}
                                <div className="bg-slate-900/60 rounded-3xl border border-cyan-500/20 p-8 shadow-2xl relative">
                                    <h3 className="text-lg font-bold font-['Orbitron'] text-cyan-100 mb-6 uppercase tracking-wider">Lien Externe / Manuel</h3>
                                    <form action={createOrUpdateResource} key={editingResource?.id || 'new_manual'} className="space-y-6">
                                        <input type="hidden" name="id" value={editingResource?.id || ""} />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Séquence (Chapitre)</label>
                                                <select
                                                    name="chapter_id"
                                                    defaultValue={editingResource?.chapter_id || ""}
                                                    required
                                                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 text-xs focus:outline-none transition-all"
                                                >
                                                    <option value="">Sélectionner</option>
                                                    {chapters.map(ch => {
                                                        const lv = levels.find(l => l.id === ch.level_id);
                                                        return <option key={ch.id} value={ch.id}>{lv?.code} - {ch.title}</option>;
                                                    })}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Type de contenu</label>
                                                <select
                                                    name="kind"
                                                    defaultValue={editingResource?.kind || "cours"}
                                                    required
                                                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 text-xs focus:outline-none transition-all"
                                                >
                                                    <option value="cours">Cours Magistral</option>
                                                    <option value="exercices">Série d'exercices</option>
                                                    <option value="interactif">Module interactif</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">URL Documentation PDF</label>
                                                <input type="text" name="pdf_url" defaultValue={editingResource?.pdf_url || ""} placeholder="https://..." className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">URL Documentation DOCX</label>
                                                <input type="text" name="docx_url" defaultValue={editingResource?.docx_url || ""} placeholder="https://..." className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">URL Source LaTeX</label>
                                                <input type="text" name="latex_url" defaultValue={editingResource?.latex_url || ""} placeholder="https://..." className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">URL Module Interactif (HTML)</label>
                                                <input type="text" name="html_url" defaultValue={editingResource?.html_url || ""} placeholder="ex: /exos/polynomes.html" className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-fuchsia-400 focus:border-fuchsia-500/50 transition-all font-mono" />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button type="submit" className="flex-1 bg-slate-800 border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 font-bold py-3 rounded-xl transition-all text-[10px] uppercase tracking-widest">
                                                {editingResource ? 'Mettre à jour' : 'Indexer la ressource'}
                                            </button>
                                            {editingResource && (
                                                <button type="button" onClick={() => setEditingResource(null)} className="px-4 border border-slate-800 text-slate-500 rounded-xl text-[8px] uppercase tracking-widest">X</button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* Upload Form (Client-Side) */}
                                <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 rounded-3xl border-2 border-dashed border-cyan-500/20 p-8 shadow-2xl relative overflow-hidden group/upload">
                                    <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                                    <h3 className="text-lg font-bold font-['Orbitron'] text-fuchsia-100 mb-6 uppercase tracking-wider flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 animate-bounce">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                        </svg>
                                        Upload Direct (Client)
                                    </h3>

                                    {/* Client-Side Upload Form with Signed URL (Bypass RLS & Vercel Limits) */}
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const file = formData.get("file") as File;
                                        const chapterId = formData.get("chapter_id") as string;
                                        const kind = formData.get("kind") as string;

                                        if (!file || !chapterId || !kind) return;

                                        const btn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                                        const originalText = btn.innerText;
                                        btn.disabled = true;
                                        btn.innerText = "Autorisation...";
                                        btn.style.opacity = "0.7";

                                        try {
                                            // 1. Initialiser le client Supabase Browser avec @supabase/ssr
                                            // Utilisation dynamique pour compatibilit
                                            const { createBrowserClient } = require('@supabase/ssr');
                                            const supabase = createBrowserClient(
                                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                            );
                                            const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET!;

                                            // 2. Générer le chemin
                                            const timestamp = Date.now();
                                            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                                            const filePath = `resources/${timestamp}-${safeName}`;

                                            // 3. RECUPERER UNE URL SIGNEE (Privilège Serveur) via Server Action
                                            const { getSignedUploadUrlAction, createResourceEntry } = require("./actions");

                                            console.log("Asking for signed url for:", filePath);
                                            // Appel Server Action
                                            const { token, path } = await getSignedUploadUrlAction(filePath);

                                            if (!token) throw new Error("Impossible d'obtenir le token d'upload.");

                                            // 4. UPLOAD AVEC TOKEN (Direct Browser -> Supabase)
                                            btn.innerText = "Upload en cours...";

                                            const { error: uploadError } = await supabase.storage
                                                .from(bucketName)
                                                .uploadToSignedUrl(path, token, file, {
                                                    contentType: file.type // Force le type MIME du fichier (ex: text/html)
                                                });

                                            if (uploadError) throw new Error("Erreur Storage: " + uploadError.message);

                                            // 5. Récupérer URL publique
                                            const { data: { publicUrl } } = supabase.storage
                                                .from(bucketName)
                                                .getPublicUrl(filePath);

                                            console.log("Upload OK, URL:", publicUrl);

                                            // 6. Enregistrement BDD via Server Action
                                            btn.innerText = "Finalisation...";
                                            await createResourceEntry(chapterId, kind, publicUrl, safeName);

                                            alert("✅ Ressource ajoutée avec succès !");
                                            window.location.reload();

                                        } catch (err: any) {
                                            console.error(err);
                                            alert("❌ Erreur: " + err.message);
                                            btn.disabled = false;
                                            btn.innerText = originalText;
                                            btn.style.opacity = "1";
                                        }
                                    }} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest">Séquence Destination</label>
                                            <select name="chapter_id" required className="w-full bg-slate-950/80 border border-fuchsia-500/20 rounded-xl px-4 py-3 text-slate-200 text-xs focus:ring-1 focus:ring-fuchsia-500/50 outline-none transition-all">
                                                <option value="">Sélectionner</option>
                                                {chapters.map(ch => {
                                                    const lv = levels.find(l => l.id === ch.level_id);
                                                    return <option key={ch.id} value={ch.id}>{lv?.code} - {ch.title}</option>;
                                                })}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest">Format de sortie</label>
                                            <select name="kind" required className="w-full bg-slate-950/80 border border-fuchsia-500/20 rounded-xl px-4 py-3 text-slate-200 text-xs outline-none transition-all">
                                                <option value="interactif">Module Interactif (HTML)</option>
                                                <option value="cours-pdf">Cours Pédagogique (PDF)</option>
                                                <option value="cours-docx">Format Modifiable (DOCX)</option>
                                                <option value="cours-latex">Source LaTeX (TEX)</option>
                                                <option value="exercices-pdf">Fiche d'Exercices (PDF)</option>
                                                <option value="exercices-docx">Exercices Modifiables (DOCX)</option>
                                                <option value="exercices-latex">Exercices LaTeX (TEX)</option>
                                            </select>
                                        </div>

                                        <div className="relative group/file">
                                            <input type="file" name="file" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="border-2 border-dashed border-slate-700 bg-slate-950/40 rounded-2xl p-10 text-center group-hover/file:border-fuchsia-500/40 transition-all">
                                                <p className="text-slate-400 text-xs font-['Exo_2'] mb-1">Cliquer ou glisser le fichier ici</p>
                                                <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.2em]">Max 50MB • PDF, DOCX, TEX, HTML</p>
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 text-white font-bold py-4 rounded-2xl shadow-[0_0_30px_rgba(192,38,211,0.3)] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] mt-4">
                                            Injecter dans le Cloud
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB RESULTATS --- */}
                {activeTab === "results" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Monitoring Élèves</h2>
                            <button className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg hover:bg-cyan-500/10 transition-all uppercase tracking-widest">Exporter CSV</button>
                        </header>

                        <div className="bg-slate-900/40 rounded-3xl border border-cyan-500/10 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-cyan-500/5 border-b border-cyan-500/10 font-['Orbitron'] text-[10px] text-cyan-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-6">Élève ID</th>
                                        <th className="px-8 py-6">Module / Exercice</th>
                                        <th className="px-8 py-6">Data Point</th>
                                        <th className="px-8 py-6">Timestamp</th>
                                        <th className="px-8 py-6 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cyan-500/5 font-['Exo_2']">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="hover:bg-cyan-500/5 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-cyan-500/20">U{i}</div>
                                                    <span className="text-slate-200 font-medium">Élève ID_{1000 + i}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 text-sm">Polynômes de degré 2</td>
                                            <td className="px-8 py-5"><span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">VALIDATED</span></td>
                                            <td className="px-8 py-5 text-slate-500 text-xs">Aujourd'hui, 14:32</td>
                                            <td className="px-8 py-5 text-right font-mono font-bold text-cyan-400">{15 + i}/20</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB CONVERTISSEUR --- */}
                {activeTab === "converter" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Convertisseur de Fichiers</h2>
                            <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.3em]">LaTeX • PDF • DOCX</span>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Zone d'upload */}
                            <div className="bg-slate-900/60 rounded-3xl border border-cyan-500/20 p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 blur-3xl pointer-events-none"></div>

                                <h3 className="text-lg font-bold font-['Orbitron'] text-cyan-100 mb-6 uppercase tracking-wider flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                    </svg>
                                    Fichier Source
                                </h3>

                                <div className="space-y-6">
                                    <div className="relative group/file">
                                        <input
                                            type="file"
                                            accept=".tex,.pdf,.docx"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setSelectedFile(file);
                                                    setConversionError(null);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="border-2 border-dashed border-cyan-500/30 bg-slate-950/40 rounded-2xl p-12 text-center group-hover/file:border-cyan-500/60 transition-all hover:bg-slate-950/60">
                                            {selectedFile ? (
                                                <div className="space-y-3">
                                                    <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-cyan-300 font-medium">{selectedFile.name}</p>
                                                    <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-500">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-slate-400 text-sm font-['Exo_2'] mb-2">Cliquer ou glisser le fichier ici</p>
                                                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em]">TEX • PDF • DOCX</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {selectedFile && (
                                        <button
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setConversionError(null);
                                            }}
                                            className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all text-xs"
                                        >
                                            ✕ Annuler la sélection
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Zone de configuration et conversion */}
                            <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 rounded-3xl border-2 border-cyan-500/20 p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 opacity-50 pointer-events-none"></div>

                                <h3 className="text-lg font-bold font-['Orbitron'] text-fuchsia-100 mb-6 uppercase tracking-wider flex items-center gap-3 relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    Conversion
                                </h3>

                                <div className="space-y-6 relative">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest ml-1">Format de sortie</label>
                                        <select
                                            value={targetFormat}
                                            onChange={(e) => setTargetFormat(e.target.value as "pdf" | "docx" | "tex")}
                                            disabled={!selectedFile}
                                            className="w-full bg-slate-950/80 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            <option value="pdf">📕 PDF</option>
                                            <option value="docx">📝 DOCX (Word)</option>
                                            <option value="tex">∑ LaTeX (.tex)</option>
                                        </select>
                                    </div>

                                    {conversionError && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
                                            <div className="font-bold mb-1">❌ Erreur de conversion</div>
                                            <div className="text-xs opacity-80 whitespace-pre-line">{conversionError}</div>
                                        </div>
                                    )}

                                    <button
                                        onClick={async () => {
                                            if (!selectedFile) return;

                                            setIsConverting(true);
                                            setConversionError(null);

                                            try {
                                                const formData = new FormData();
                                                formData.append('file', selectedFile);
                                                formData.append('targetFormat', targetFormat);

                                                // Essayer d'abord l'API locale (Pandoc)
                                                const response = await fetch('/api/convert-local', {
                                                    method: 'POST',
                                                    body: formData,
                                                });

                                                if (!response.ok) {
                                                    const errorData = await response.json();
                                                    throw new Error(errorData.error || 'Erreur de conversion');
                                                }

                                                // Si c'est un fichier binaire (PDF, DOCX), on le télécharge
                                                const contentType = response.headers.get('content-type');
                                                if (contentType?.includes('application/')) {
                                                    const blob = await response.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = selectedFile.name.replace(/\.[^.]+$/, `.${targetFormat}`);
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);

                                                    alert('✅ Conversion réussie ! Le fichier a été téléchargé.');
                                                    setSelectedFile(null);
                                                } else {
                                                    const result = await response.json();
                                                    throw new Error(result.error || 'Format de réponse inattendu');
                                                }

                                            } catch (error: any) {
                                                console.error('Conversion error:', error);
                                                setConversionError(error.message);
                                            } finally {
                                                setIsConverting(false);
                                            }
                                        }}
                                        disabled={!selectedFile || isConverting}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:shadow-none active:scale-95 transition-all text-sm uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isConverting ? (
                                            <span className="flex items-center justify-center gap-3">
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Conversion en cours...
                                            </span>
                                        ) : (
                                            '🔄 Convertir le fichier'
                                        )}
                                    </button>

                                    {/* Info sur les conversions supportées */}
                                    <div className="mt-6 p-4 bg-slate-950/50 rounded-xl border border-cyan-500/10">
                                        <h4 className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-3">Conversions disponibles</h4>
                                        <div className="space-y-2 text-xs text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <span className="text-orange-400">⚙️</span>
                                                <span>LaTeX (.tex) → PDF (requiert Pandoc)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-orange-400">⚙️</span>
                                                <span>LaTeX → DOCX (requiert Pandoc)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-orange-400">⚙️</span>
                                                <span>DOCX → LaTeX (requiert Pandoc)</span>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-cyan-500/10 text-[10px]">
                                                <p className="text-cyan-300 font-bold mb-1">📦 Installation Pandoc :</p>
                                                <code className="bg-slate-900 px-2 py-1 rounded text-amber-300">
                                                    winget install --id JohnMacFarlane.Pandoc
                                                </code>
                                                <p className="mt-2 text-slate-500">Redémarrez votre PC après installation</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guide d'utilisation */}
                        <div className="mt-8 bg-slate-900/40 rounded-2xl border border-cyan-500/10 p-6">
                            <h4 className="text-sm font-bold font-['Orbitron'] text-cyan-300 mb-4 uppercase tracking-wider">📚 Guide d'utilisation</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
                                <div className="space-y-2">
                                    <div className="font-bold text-cyan-400">1. Sélectionnez un fichier</div>
                                    <p>Glissez-déposez ou cliquez pour choisir un fichier .tex, .pdf ou .docx</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-bold text-fuchsia-400">2. Choisissez le format</div>
                                    <p>Sélectionnez le format de sortie souhaité (PDF, DOCX, ou LaTeX)</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-bold text-purple-400">3. Convertissez</div>
                                    <p>Cliquez sur le bouton de conversion et téléchargez le résultat</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
