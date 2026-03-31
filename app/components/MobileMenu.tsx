"use client";

import { Level, Chapter } from "@/lib/data";
import Link from "next/link";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    levels: Level[];
    chapters: Chapter[];
    selectedLevelId: string | null;
    selectedChapterId: string | null;
    onLevelSelect: (id: string) => void;
    onChapterSelect: (id: string) => void;
};

export default function MobileMenu({
    isOpen,
    onClose,
    levels,
    chapters,
    selectedLevelId,
    selectedChapterId,
    onLevelSelect,
    onChapterSelect,
}: Props) {
    if (!isOpen) return null;

    // Filtrer les chapitres du niveau actif
    const visibleChapters = chapters.filter(
        (c) => c.level_id === selectedLevelId && c.published
    );

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <aside className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl z-50 md:hidden transform transition-transform duration-300 overflow-y-auto border-r border-white/10">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="text-xl">📐</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white">Tuteur Maths</h1>
                            <p className="text-xs text-slate-400">ESPACE ÉLÈVE</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        aria-label="Fermer le menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="p-4 border-b border-white/10">
                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/20 text-blue-400 font-medium"
                            onClick={onClose}
                        >
                            <span>📚</span> Espace élèves
                        </Link>
                        <Link
                            href="/assistant"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                            onClick={onClose}
                        >
                            <span>🤖</span> Module Assistant
                        </Link>
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                            onClick={onClose}
                        >
                            <span>👨‍🏫</span> Espace prof
                        </Link>
                        <Link
                            href="/sujets"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600/20 text-red-400 font-medium"
                            onClick={onClose}
                        >
                            <span>📄</span> EAM 2026
                        </Link>
                    </nav>
                </div>

                {/* Section Niveaux */}
                <div className="p-4 space-y-3">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Niveau</h2>
                    <div className="flex flex-wrap gap-2">
                        {levels.map((level) => (
                            <button
                                key={level.id}
                                onClick={() => {
                                    onLevelSelect(level.id);
                                }}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 border min-h-[44px] ${
                                    selectedLevelId === level.id
                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
                                }`}
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section Chapitres */}
                <div className="p-4 space-y-3">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Chapitres</h2>
                    <div className="flex flex-col gap-2">
                        {visibleChapters.map((chapter) => (
                            <button
                                key={chapter.id}
                                onClick={() => {
                                    onChapterSelect(chapter.id);
                                    onClose();
                                }}
                                className={`group flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300 border min-h-[52px] ${
                                    selectedChapterId === chapter.id
                                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/10 border-blue-500/50 text-white"
                                        : "bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    selectedChapterId === chapter.id
                                        ? "bg-blue-500 text-white"
                                        : "bg-white/10 text-slate-500 group-hover:bg-white/20 group-hover:text-white"
                                }`}>
                                    <span className="text-xs font-bold">{visibleChapters.indexOf(chapter) + 1}</span>
                                </div>
                                <span className="text-sm font-medium line-clamp-2">{chapter.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>
        </>
    );
}
