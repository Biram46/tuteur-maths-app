"use client";

import { useState, useEffect, useTransition } from "react";
import { Level, Chapter, Resource } from "@/lib/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileMenu from "./MobileMenu";
import NavExamButton from "./NavExamButton";
import { logout } from "../auth/actions";

type Props = {
    levels: Level[];
    chapters: Chapter[];
    resources: Resource[];
};

export default function StudentClientView({ levels, chapters, resources }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // États pour la navigation
    const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
        levels.length > 0 ? levels[0].id : null
    );
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Modal prénom/classe avant exercice interactif
    const [interactifModal, setInteractifModal] = useState<{ url: string; title: string } | null>(null);
    const [interactifName, setInteractifName] = useState('');
    const [interactifClass, setInteractifClass] = useState('');

    const CLASS_OPTIONS = ['Seconde', '1ère SPE MATHS', '1ère STMG', 'Terminale SPE MATHS', 'Terminale Maths Expertes', 'Terminale STMG'];

    // Mettre à jour le chapitre sélectionné quand on change de niveau
    useEffect(() => {
        if (selectedLevelId) {
            const firstChapter = chapters.find(
                (c) => c.level_id === selectedLevelId && c.published
            );
            setSelectedChapterId(firstChapter ? firstChapter.id : null);
        }
    }, [selectedLevelId, chapters]);

    const activeLevel = levels.find((l) => l.id === selectedLevelId);
    const activeChapter = chapters.find((c) => c.id === selectedChapterId);

    // Filtrer les chapitres du niveau actif
    const visibleChapters = chapters.filter(
        (c) => c.level_id === selectedLevelId && c.published
    );

    // Filtrer les ressources du chapitre actif
    const activeResources = resources.filter(
        (r) => r.chapter_id === selectedChapterId
    );

    // Helpers pour classer les ressources
    // On garde TOUTES les ressources valides (ayant une URL)
    const validCoursResources = activeResources
        .filter(r => r.kind.toLowerCase().includes('cours'))
        .filter(r => r.pdf_url || r.html_url || r.docx_url || r.latex_url);

    const validExosResources = activeResources
        .filter(r => r.kind.toLowerCase().includes('exer') || r.kind.toLowerCase().includes('exo'))
        .filter(r => r.pdf_url || r.html_url || r.docx_url || r.latex_url);

    const validInteractifResources = activeResources
        .filter(r => r.kind === 'interactif' || r.html_url?.endsWith('.html'))
        .filter(r => r.html_url || r.pdf_url); // Interactif a souvent html_url

    // Fonction pour ouvrir une ressource
    const openResource = (url: string | null, type: 'cours' | 'exercice' | 'interactif', title: string, studentName?: string, studentClass?: string) => {
        if (!url) return;

        const params = new URLSearchParams({
            url: url,
            type: type,
            title: title,
            level: activeLevel?.label || '',
            ...(studentName ? { studentName } : {}),
            ...(studentClass ? { studentClass } : {}),
        });

        window.open(`/resource?${params.toString()}`, '_blank');
    };

    const handleInteractifClick = (url: string | null, title: string) => {
        if (!url) return;
        setInteractifModal({ url, title });
        setInteractifName('');
        setInteractifClass('');
    };

    const handleInteractifConfirm = () => {
        if (!interactifModal || !interactifName.trim() || !interactifClass) return;
        openResource(interactifModal.url, 'interactif', interactifModal.title, interactifName.trim(), interactifClass);
        setInteractifModal(null);
    };

    return (
        <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background ambiant effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            {/* Top Navigation Bar */}
            <nav className="relative z-50 flex items-center justify-between px-4 py-3 md:px-6 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
                {/* Left: Logo + Mobile Menu */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        aria-label="Ouvrir le menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📐</span>
                        <span className="font-bold text-white hidden sm:inline">Tuteur Maths</span>
                    </div>
                </div>

                {/* Center: Navigation Tabs (Desktop) */}
                <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                    <Link href="/" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm">
                        Espace élèves
                    </Link>
                    <Link href="/assistant" className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all">
                        Module Assistant
                    </Link>
                    <Link href="/prof" className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all">
                        Espace prof
                    </Link>
                </div>

                {/* Right: EAM Button + User */}
                <div className="flex items-center gap-3">
                    <NavExamButton />
                    <Link
                        href="/mon-compte"
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-medium text-sm transition-all"
                        title="Mon compte"
                    >
                        <span>👤</span>
                    </Link>
                    <button
                        onClick={() => startTransition(() => logout())}
                        disabled={isPending}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-medium text-sm transition-all"
                    >
                        <span>🚪</span>
                        <span>{isPending ? "Dégagement..." : "Quitter"}</span>
                    </button>
                </div>
            </nav>

            <div className="relative z-10 flex h-[calc(100vh-60px)] overflow-hidden">

                {/* 1. Sidebar NIVEAUX & CHAPITRES (Glassmorphism) - Hidden on mobile */}
                <aside className="hidden md:flex w-80 flex-col gap-6 p-6 border-r border-white/5 bg-white/5 backdrop-blur-xl transition-all h-full overflow-y-auto">

                    {/* Section Niveaux */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Niveau</h2>
                        <div className="flex flex-wrap gap-2">
                            {levels.map((level) => (
                                <button
                                    key={level.id}
                                    onClick={() => setSelectedLevelId(level.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border ${selectedLevelId === level.id
                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 scale-105"
                                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
                                        }`}
                                >
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section Chapitres */}
                    <div className="space-y-3 flex-1">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Chapitres</h2>
                        <div className="flex flex-col gap-2">
                            {visibleChapters.map((chapter) => (
                                <button
                                    key={chapter.id}
                                    onClick={() => setSelectedChapterId(chapter.id)}
                                    className={`group flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300 border ${selectedChapterId === chapter.id
                                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/10 border-blue-500/50 text-white"
                                        : "bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedChapterId === chapter.id ? "bg-blue-500 text-white" : "bg-white/10 text-slate-500 group-hover:bg-white/20 group-hover:text-white"
                                        }`}>
                                        <span className="text-xs font-bold">{visibleChapters.indexOf(chapter) + 1}</span>
                                    </div>
                                    <span className="text-sm font-medium line-clamp-2">{chapter.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* 2. Main Content (Dashboard Grid) */}
                <section className="flex-1 flex flex-col h-full overflow-hidden relative">

                    {/* Header Content */}
                    <header className="px-4 md:px-8 py-4 md:py-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
                        <div>
                            {activeChapter ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                        <span>{activeLevel?.label}</span>
                                        <span>•</span>
                                        <span>Chapitre {visibleChapters.findIndex(c => c.id === activeChapter.id) + 1}</span>
                                    </div>
                                    <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight">{activeChapter.title}</h2>
                                </div>
                            ) : (
                                <h2 className="text-xl text-slate-400">Sélectionnez un chapitre</h2>
                            )}
                        </div>
                        <div className="hidden md:flex items-center gap-3">
                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400">
                                📅 Année Scolaire 2025-2026
                            </div>
                        </div>
                    </header>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        {activeChapter ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">

                                {/* Card 1: COURS */}
                                <div className="group relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="relative h-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 flex flex-col hover:border-blue-500/50 transition-colors">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                            📖
                                        </div>
                                        <h3 className="text-base md:text-xl font-bold text-white mb-2">Cours Complet</h3>
                                        <p className="text-sm text-slate-400 mb-3 md:mb-6 flex-1">
                                            Accédez au cours détaillé, définitions, théorèmes et démonstrations.
                                        </p>

                                        <div className="space-y-2 mt-auto">
                                            {validCoursResources.length > 0 ? validCoursResources.map((res, idx) => {
                                                const url = res.pdf_url || res.html_url || res.docx_url || res.latex_url;
                                                // Déterminer l'icône/label selon le format
                                                let label = "Document";
                                                let icon = "📄";
                                                if (res.pdf_url) { label = "PDF"; icon = "📕"; }
                                                else if (res.docx_url) { label = "Word"; icon = "📝"; }
                                                else if (res.latex_url) { label = "LaTeX"; icon = "∑"; }
                                                else if (res.html_url) { label = "HTML"; icon = "🌐"; }

                                                return (
                                                    <button
                                                        key={res.id}
                                                        onClick={() => openResource(url, 'cours', activeChapter.title)}
                                                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-all group/btn"
                                                    >
                                                        <span className="text-sm font-medium text-slate-300 group-hover/btn:text-white flex items-center gap-2">
                                                            <span>{icon}</span>
                                                            <span>{label}</span>
                                                        </span>
                                                        <span className="text-xs opacity-50 group-hover/btn:opacity-100 transition-opacity">↗</span>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="text-center text-slate-500 py-3 text-xs italic bg-slate-800/30 rounded-lg">
                                                    Aucun cours disponible
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: EXERCICES */}
                                <div className="group relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="relative h-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col hover:border-purple-500/50 transition-colors">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                            📝
                                        </div>
                                        <h3 className="text-base md:text-xl font-bold text-white mb-2">Fiches d'Exercices</h3>
                                        <p className="text-sm text-slate-400 mb-3 md:mb-6 flex-1">
                                            Entraînez-vous avec une série d'exercices progressifs et corrigés.
                                        </p>

                                        <div className="space-y-2 mt-auto">
                                            {validExosResources.length > 0 ? validExosResources.map((res, idx) => {
                                                const url = res.pdf_url || res.html_url || res.docx_url || res.latex_url;
                                                let label = "Exercices";
                                                let icon = "📝";
                                                if (res.pdf_url) { label = "Exos PDF"; icon = "📕"; }
                                                else if (res.docx_url) { label = "Exos Word"; icon = "📝"; }
                                                else if (res.latex_url) { label = "Exos LaTeX"; icon = "∑"; }

                                                return (
                                                    <button
                                                        key={res.id}
                                                        onClick={() => openResource(url, 'exercice', `Exercices - ${activeChapter.title}`)}
                                                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-all group/btn"
                                                    >
                                                        <span className="text-sm font-medium text-slate-300 group-hover/btn:text-white flex items-center gap-2">
                                                            <span>{icon}</span>
                                                            <span>{label}</span>
                                                        </span>
                                                        <span className="text-xs opacity-50 group-hover/btn:opacity-100 transition-opacity">↗</span>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="text-center text-slate-500 py-3 text-xs italic bg-slate-800/30 rounded-lg">
                                                    Aucun exercice disponible
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: INTERACTIF */}
                                <div className="group relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="relative h-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col hover:border-amber-500/50 transition-colors">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                            ⚡
                                        </div>
                                        <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-widest animate-pulse">
                                            Populaire
                                        </div>
                                        <h3 className="text-base md:text-xl font-bold text-white mb-2">EXERCICES INTERACTIFS</h3>
                                        <p className="text-sm text-slate-400 mb-3 md:mb-6 flex-1">
                                            Préparez vos contrôles avec des exercices interactifs pour réviser efficacement.
                                        </p>

                                        <div className="space-y-2 mt-auto">
                                            {validInteractifResources.length > 0 ? validInteractifResources.map((res, idx) => {
                                                const url = res.html_url || res.pdf_url;
                                                return (
                                                    <button
                                                        key={res.id}
                                                        onClick={() => handleInteractifClick(url, res.label || `Interactif - ${activeChapter.title}`)}
                                                        className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 flex items-center justify-between transition-all group/btn"
                                                    >
                                                        <span className="text-sm font-medium text-amber-200 group-hover/btn:text-white flex items-center gap-2">
                                                            <span>🎮</span>
                                                            <span>Lancer l'activité {validInteractifResources.length > 1 ? `#${idx + 1}` : ''}</span>
                                                        </span>
                                                        <span className="text-xs opacity-50 group-hover/btn:opacity-100 transition-opacity">↗</span>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="text-center text-slate-500 py-3 text-xs italic bg-slate-800/30 rounded-lg">
                                                    Indisponible pour ce chapitre
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 md:p-12">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-slate-800/50 flex items-center justify-center text-4xl md:text-5xl mb-4 md:mb-6 shadow-2xl">
                                    👈
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Bienvenue sur votre Espace</h3>
                                <p className="text-slate-400 max-w-md mx-auto text-sm md:text-base">
                                    Sélectionnez un chapitre dans le menu pour accéder aux ressources pédagogiques.
                                </p>
                            </div>
                        )}

                        {/* Formulaire de contact */}
                        <ContactForm />

                        {/* Footer Info */}
                        <div className="mt-6 pt-4 border-t border-white/5 text-center text-slate-600 text-xs">
                            Tuteur Maths App v1.0 • 2026
                        </div>
                    </div>
                </section>

                {/* (AssistantSidebar is removed per user request) */}
            </div>

            {/* Modal prénom/classe avant exercice interactif */}
            {interactifModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col gap-5">
                        <div className="text-center">
                            <div className="text-4xl mb-3">⚡</div>
                            <h2 className="text-lg font-bold text-white">{interactifModal.title}</h2>
                            <p className="text-xs text-slate-400 mt-1">Entre ton prénom et ta classe pour commencer</p>
                        </div>
                        <input
                            type="text"
                            value={interactifName}
                            onChange={e => setInteractifName(e.target.value)}
                            placeholder="Ton prénom"
                            maxLength={30}
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-sm"
                        />
                        <select
                            value={interactifClass}
                            onChange={e => setInteractifClass(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 text-sm"
                        >
                            <option value="" disabled>Sélectionne ta classe</option>
                            {CLASS_OPTIONS.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => setInteractifModal(null)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleInteractifConfirm}
                                disabled={!interactifName.trim() || !interactifClass}
                                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Lancer 🎮
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Menu */}
            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                levels={levels}
                chapters={chapters}
                selectedLevelId={selectedLevelId}
                selectedChapterId={selectedChapterId}
                onLevelSelect={setSelectedLevelId}
                onChapterSelect={setSelectedChapterId}
            />

        </main>
    );
}

function ContactForm() {
    const [nom, setNom] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nom.trim() || !message.trim()) return;
        setSending(true);
        const subject = encodeURIComponent(`Message de ${nom} — Tuteur Maths`);
        const body = encodeURIComponent(`Nom : ${nom}\n\n${message}`);
        window.location.href = `mailto:prof@aimaths.fr?subject=${subject}&body=${body}`;
        setTimeout(() => { setSent(true); setSending(false); }, 500);
    };

    return (
        <div className="mt-12 pt-8 border-t border-white/5">
            <div className="max-w-lg mx-auto">
                <h3 className="text-sm font-bold text-slate-300 mb-1 text-center">📬 Contacter le professeur</h3>
                <p className="text-xs text-slate-500 text-center mb-5">
                    Une question ? Un problème ? Écris à{' '}
                    <a href="mailto:prof@aimaths.fr" className="text-cyan-400 hover:underline">prof@aimaths.fr</a>
                </p>
                {sent ? (
                    <div className="text-center py-4 text-green-400 text-sm font-medium">
                        ✅ Ton client mail s'est ouvert. Message prêt à envoyer !
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="text"
                            value={nom}
                            onChange={e => setNom(e.target.value)}
                            placeholder="Ton prénom et ta classe"
                            maxLength={60}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50"
                        />
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Ton message…"
                            rows={4}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                        />
                        <button
                            type="submit"
                            disabled={sending || !nom.trim() || !message.trim()}
                            className="w-full py-3 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-bold text-sm hover:bg-cyan-600/30 disabled:opacity-40 transition-all"
                        >
                            {sending ? '⏳ Ouverture…' : '✉️ Envoyer'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
