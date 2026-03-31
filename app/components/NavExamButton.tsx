"use client";

import { useState } from "react";
import ExamInfoModal from "./ExamInfoModal";

export default function NavExamButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] md:text-xs rounded-lg shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 min-h-[44px]"
            >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span className="hidden sm:inline">Épreuve Anticipée de Mathématiques 1ère - Session 2026</span>
                <span className="sm:hidden">EAM 2026</span>
            </button>
            <ExamInfoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
