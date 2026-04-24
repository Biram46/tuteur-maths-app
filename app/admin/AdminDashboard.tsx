"use client";

import React, { useState, useEffect } from "react";
import type { Level, Chapter, QuizResult, QcmResult } from "@/lib/data";
import type { EAMSujet, EAMNiveau } from "./actions";
import RagNotesManager from "./components/RagNotesManager";
import {
    createOrUpdateEAMSujet,
    deleteEAMSujet,
    deleteAllQcmResults
} from "./actions";

interface Props {
    initialData: {
        levels: Level[];
        chapters: Chapter[];
        quizResults: QuizResult[];
        qcmResults?: QcmResult[];
        eamSujets?: EAMSujet[];
    };
}

export default function AdminDashboard({ initialData }: Props) {
    const { levels, chapters, quizResults, qcmResults = [], eamSujets = [] } = initialData;
    const [activeTab, setActiveTab] = useState<"results" | "qcm_results" | "eam" | "rag">("results");

    const [editingEAMSujet, setEditingEAMSujet] = useState<EAMSujet | null>(null);

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
                    onClick={() => setActiveTab("results")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'results' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Exos
                </button>
                <button
                    onClick={() => setActiveTab("qcm_results")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'qcm_results' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    QCM
                </button>
                <button
                    onClick={() => setActiveTab("eam")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'eam' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    📄 EAM
                </button>
                <button
                    onClick={() => setActiveTab("rag")}
                    className={`flex-1 py-6 px-4 font-['Orbitron'] text-xs tracking-[0.2em] transition-all uppercase ${activeTab === 'rag' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    🧠 RAG
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">

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
                                        <th className="px-8 py-6">Élève</th>
                                        <th className="px-8 py-6">Classe</th>
                                        <th className="px-8 py-6">Module / Exercice</th>
                                        <th className="px-8 py-6">Data Point</th>
                                        <th className="px-8 py-6">Timestamp</th>
                                        <th className="px-8 py-6 text-right">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cyan-500/5 font-['Exo_2']">
                                    {(quizResults || []).map((result) => (
                                        <tr key={result.id} className="hover:bg-cyan-500/5 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-cyan-500/20" title={result.student_email || String(result.id)}>
                                                        {(result.student_name || result.student_email || "?").substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-200 font-medium text-xs">{result.student_name || result.student_email || "Anonyme"}</span>
                                                        {result.student_email && result.student_name && (
                                                            <span className="text-slate-500 text-[10px]">{result.student_email}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 text-xs">
                                                {result.student_class || <span className="text-slate-600 italic">—</span>}
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-cyan-500 uppercase tracking-wider">{result.niveau || "???"}</span>
                                                    <span>{result.chapitre || "Chapitre inconnu"}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${result.note_finale >= 10
                                                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                                                    : "text-red-400 bg-red-500/10 border-red-500/30"
                                                    }`}>
                                                    {result.note_finale >= 10 ? "ACQUIS" : "NON ACQUIS"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-500 text-xs font-mono">
                                                {new Date(result.created_at).toLocaleString('fr-FR', {
                                                    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`font-mono font-bold text-lg ${result.note_finale >= 15 ? "text-fuchsia-400" :
                                                    result.note_finale >= 10 ? "text-cyan-400" : "text-slate-500"
                                                    }`}>
                                                    {result.note_finale}/20
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB RESULTATS QCM ENTRAINE TOI --- */}
                {activeTab === "qcm_results" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">Monitoring Élèves (QCM)</h2>
                                <span className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-[0.3em]">Total: {qcmResults.length}</span>
                            </div>
                            <form action={deleteAllQcmResults} onSubmit={(e) => {
                                if(!confirm('Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT tous les résultats QCM ? Cette action est irréversible.')) e.preventDefault();
                            }}>
                                <button type="submit" className="text-[10px] font-mono text-red-500 border border-red-500/30 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all uppercase tracking-widest flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    Effacer toutes les notes
                                </button>
                            </form>
                        </header>

                        <div className="bg-slate-900/40 rounded-3xl border border-emerald-500/10 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-emerald-500/5 border-b border-emerald-500/10 font-['Orbitron'] text-[10px] text-emerald-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-6">Élève</th>
                                        <th className="px-8 py-6">Module</th>
                                        <th className="px-8 py-6">Validé le</th>
                                        <th className="px-8 py-6 text-right">Note (/20)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-500/5 font-['Exo_2']">
                                    {(qcmResults || []).map((result) => (
                                        <tr key={result.id} className="hover:bg-emerald-500/5 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-emerald-500/20" title={String(result.id)}>
                                                        {(result.student_name || result.student_email || "?").substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-200 font-medium text-xs">{result.student_name || result.student_email}</span>
                                                        {result.student_class && (
                                                            <span className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider">{result.student_class}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 text-sm font-medium">
                                                ENTRAÎNE-TOI (QCM) • {result.score_base}/{result.total_questions} Juste
                                            </td>
                                            <td className="px-8 py-5 text-slate-500 text-xs font-mono">
                                                {new Date(result.date || result.created_at).toLocaleString('fr-FR', {
                                                    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`font-mono font-bold text-xl ${result.score >= 15 ? "text-green-400" :
                                                    result.score >= 10 ? "text-emerald-400" : "text-amber-500"
                                                    }`}>
                                                    {result.score}/20
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {qcmResults.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-slate-500 text-xs tracking-widest uppercase">
                                                Aucun résultat QCM enregistré pour le moment.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB EAM (Épreuve Anticipée de Mathématiques) --- */}
                {activeTab === "eam" && (
                    <div className="animate-message">
                        <header className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">Sujets EAM 1ère</h2>
                            <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.3em]">Total: {eamSujets.length}</span>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Table des sujets existants */}
                            <div className="bg-slate-900/40 rounded-2xl border border-cyan-500/10 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-cyan-500/5 border-b border-cyan-500/10 font-['Orbitron'] text-[10px] text-cyan-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Titre</th>
                                            <th className="px-6 py-4">Niveau</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cyan-500/5">
                                        {eamSujets.map((sujet) => (
                                            <tr key={sujet.id} className="group hover:bg-cyan-500/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-300 font-medium">{sujet.titre}</span>
                                                        {sujet.description && (
                                                            <span className="text-xs text-slate-500">{sujet.description}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${sujet.niveau === '1ere_specialite' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                        sujet.niveau === '1ere_gt' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                                            'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                        }`}>
                                                        {sujet.niveau === '1ere_specialite' ? 'Spé' : sujet.niveau === '1ere_gt' ? 'GT' : 'Techno'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                                    {new Date(sujet.date_sujet).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingEAMSujet(sujet)}
                                                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                                            </svg>
                                                        </button>
                                                        <form action={deleteEAMSujet}>
                                                            <input type="hidden" name="id" value={sujet.id} />
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
                                        {eamSujets.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                                                    Aucun sujet EAM. Ajoutez votre premier sujet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Formulaire d'ajout/modification */}
                            <div className="space-y-8">
                                <div className="bg-slate-900/60 rounded-3xl border border-cyan-500/20 p-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl pointer-events-none"></div>
                                    <h3 className="text-lg font-bold font-['Orbitron'] text-cyan-100 mb-6 uppercase tracking-wider">
                                        {editingEAMSujet ? 'Modifier le sujet' : 'Nouveau sujet EAM'}
                                    </h3>
                                    <form action={createOrUpdateEAMSujet} key={editingEAMSujet?.id || 'new_eam'} className="space-y-6">
                                        <input type="hidden" name="id" value={editingEAMSujet?.id || ""} />

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Titre du sujet</label>
                                            <input
                                                type="text"
                                                name="titre"
                                                placeholder="Ex: Bac Blanc n°6"
                                                defaultValue={editingEAMSujet?.titre || ""}
                                                required
                                                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-400 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Description</label>
                                            <input
                                                type="text"
                                                name="description"
                                                placeholder="Ex: Suites, fonctions, probabilités"
                                                defaultValue={editingEAMSujet?.description || ""}
                                                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-400 transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Niveau</label>
                                                <select
                                                    name="niveau"
                                                    defaultValue={editingEAMSujet?.niveau || "1ere_specialite"}
                                                    required
                                                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
                                                >
                                                    <option value="1ere_specialite">1ère Spécialité Maths</option>
                                                    <option value="1ere_gt">1ère GT (sans spé)</option>
                                                    <option value="1ere_techno">1ère Technologique</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest ml-1">Date</label>
                                                <input
                                                    type="date"
                                                    name="date_sujet"
                                                    defaultValue={editingEAMSujet?.date_sujet?.split('T')[0] || ""}
                                                    required
                                                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-cyan-500/10">
                                            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Fichiers Sujet</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">PDF Sujet</label>
                                                    <input
                                                        type="text"
                                                        name="sujet_pdf_url"
                                                        placeholder="/eam/sujets/...pdf"
                                                        defaultValue={editingEAMSujet?.sujet_pdf_url || ""}
                                                        className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">LaTeX Sujet</label>
                                                    <input
                                                        type="text"
                                                        name="sujet_latex_url"
                                                        placeholder="/eam/sujets/...tex"
                                                        defaultValue={editingEAMSujet?.sujet_latex_url || ""}
                                                        className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Fichiers Corrigé</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">PDF Corrigé</label>
                                                    <input
                                                        type="text"
                                                        name="corrige_pdf_url"
                                                        placeholder="/eam/sujets/...pdf"
                                                        defaultValue={editingEAMSujet?.corrige_pdf_url || ""}
                                                        className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-mono text-slate-500 uppercase tracking-widest ml-1">LaTeX Corrigé</label>
                                                    <input
                                                        type="text"
                                                        name="corrige_latex_url"
                                                        placeholder="/eam/sujets/...tex"
                                                        defaultValue={editingEAMSujet?.corrige_latex_url || ""}
                                                        className="w-full bg-slate-950 border border-cyan-500/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                                <div className="relative">
                                                    <input type="checkbox" name="corrige_disponible" defaultChecked={editingEAMSujet ? editingEAMSujet.corrige_disponible : true} className="sr-only peer" />
                                                    <div className="w-10 h-6 bg-slate-800 rounded-full border border-cyan-900 peer-checked:bg-emerald-500/50 peer-checked:border-emerald-400 shadow-inner transition-all"></div>
                                                    <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all"></div>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-emerald-400 transition-colors">Corrigé disponible</span>
                                            </label>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button type="submit" className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">
                                                {editingEAMSujet ? 'Mettre à jour' : 'Ajouter le sujet'}
                                            </button>
                                            {editingEAMSujet && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingEAMSujet(null)}
                                                    className="px-6 border border-slate-700 hover:border-slate-500 text-slate-400 transition-all rounded-xl text-[10px] uppercase tracking-widest"
                                                >
                                                    Annuler
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* Upload Complet EAM - Tous les fichiers en une fois */}
                                <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 rounded-3xl border-2 border-dashed border-emerald-500/20 p-8 shadow-2xl relative overflow-hidden group/upload">
                                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                                    <h3 className="text-lg font-bold font-['Orbitron'] text-emerald-100 mb-6 uppercase tracking-wider flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                        </svg>
                                        Upload Complet - Nouveau Sujet EAM
                                    </h3>

                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);

                                        const titre = formData.get("titre") as string;
                                        const description = formData.get("description") as string;
                                        const niveau = formData.get("niveau") as string;
                                        const date_sujet = formData.get("date_sujet") as string;
                                        const corrige_disponible = formData.get("corrige_disponible") === "on";

                                        const sujet_pdf = (formData.get("sujet_pdf") as File) || null;
                                        const sujet_latex = (formData.get("sujet_latex") as File) || null;
                                        const corrige_pdf = (formData.get("corrige_pdf") as File) || null;
                                        const corrige_latex = (formData.get("corrige_latex") as File) || null;

                                        if (!titre || !niveau || !date_sujet) {
                                            alert("Titre, niveau et date sont obligatoires.");
                                            return;
                                        }

                                        const hasFiles = sujet_pdf?.size || sujet_latex?.size || corrige_pdf?.size || corrige_latex?.size;
                                        if (!hasFiles) {
                                            alert("Veuillez sélectionner au moins un fichier.");
                                            return;
                                        }

                                        const btn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
                                        const originalText = btn.innerText;
                                        btn.disabled = true;
                                        btn.innerText = "Upload en cours...";
                                        btn.style.opacity = "0.7";

                                        try {
                                            const { createEAMSujetWithFiles } = require("./actions");

                                            const result = await createEAMSujetWithFiles(
                                                { titre, description, niveau, date_sujet, corrige_disponible },
                                                { sujet_pdf, sujet_latex, corrige_pdf, corrige_latex }
                                            );

                                            if (result.success) {
                                                alert("Sujet EAM créé avec succès !");
                                                window.location.reload();
                                            } else {
                                                throw new Error(result.error || "Erreur inconnue");
                                            }

                                        } catch (err: any) {
                                            console.error("Erreur upload complet:", err);
                                            alert("Erreur: " + (err.message || JSON.stringify(err)));
                                        } finally {
                                            btn.disabled = false;
                                            btn.innerText = originalText;
                                            btn.style.opacity = "1";
                                        }
                                    }} className="space-y-6">
                                        {/* Métadonnées */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Titre *</label>
                                                <input
                                                    type="text"
                                                    name="titre"
                                                    placeholder="Ex: Bac Blanc n°6"
                                                    required
                                                    className="w-full bg-slate-950/80 border border-emerald-500/20 rounded-xl px-4 py-3 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Niveau *</label>
                                                <select name="niveau" required className="w-full bg-slate-950/80 border border-emerald-500/20 rounded-xl px-4 py-3 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all">
                                                    <option value="1ere_specialite">1ère Spécialité Maths</option>
                                                    <option value="1ere_gt">1ère GT (sans spé)</option>
                                                    <option value="1ere_techno">1ère Technologique</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Description</label>
                                                <input
                                                    type="text"
                                                    name="description"
                                                    placeholder="Ex: Suites, fonctions, probabilités"
                                                    className="w-full bg-slate-950/80 border border-emerald-500/20 rounded-xl px-4 py-3 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Date *</label>
                                                <input
                                                    type="date"
                                                    name="date_sujet"
                                                    required
                                                    className="w-full bg-slate-950/80 border border-emerald-500/20 rounded-xl px-4 py-3 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Fichiers */}
                                        <div className="space-y-4 pt-4 border-t border-emerald-500/20">
                                            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Fichiers Sujet</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">PDF Sujet</label>
                                                    <input
                                                        type="file"
                                                        name="sujet_pdf"
                                                        accept=".pdf"
                                                        className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-emerald-600/20 file:text-emerald-400 file:text-xs hover:file:bg-emerald-600/30 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">LaTeX Sujet</label>
                                                    <input
                                                        type="file"
                                                        name="sujet_latex"
                                                        accept=".tex"
                                                        className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-purple-600/20 file:text-purple-400 file:text-xs hover:file:bg-purple-600/30 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Fichiers Corrigé</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">PDF Corrigé</label>
                                                    <input
                                                        type="file"
                                                        name="corrige_pdf"
                                                        accept=".pdf"
                                                        className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-emerald-600/20 file:text-emerald-400 file:text-xs hover:file:bg-emerald-600/30 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">LaTeX Corrigé</label>
                                                    <input
                                                        type="file"
                                                        name="corrige_latex"
                                                        accept=".tex"
                                                        className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-pink-600/20 file:text-pink-400 file:text-xs hover:file:bg-pink-600/30 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                                <div className="relative">
                                                    <input type="checkbox" name="corrige_disponible" defaultChecked={true} className="sr-only peer" />
                                                    <div className="w-10 h-6 bg-slate-800 rounded-full border border-emerald-900 peer-checked:bg-emerald-500/50 peer-checked:border-emerald-400 shadow-inner transition-all"></div>
                                                    <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all"></div>
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-emerald-400 transition-colors">Corrigé disponible</span>
                                            </label>
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] mt-4">
                                            Uploader et Créer le Sujet
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB RAG — Notes pédagogiques manuelles --- */}
                {activeTab === "rag" && (
                    <div className="animate-message">
                        <RagNotesManager chapters={chapters} levels={levels} />
                    </div>
                )}

            </div>
        </div>
    );
}
