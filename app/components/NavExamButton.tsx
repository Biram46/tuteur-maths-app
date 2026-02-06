"use client";

import { useState } from "react";
import ExamInfoModal from "./ExamInfoModal";

export default function NavExamButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="nav-tab flex items-center gap-2 hover:bg-red-50 group transition-all"
            >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse group-hover:scale-125"></span>
                <span className="text-red-600 font-bold text-[10px] md:text-xs">EPREUVE ANTICIPEE 1ère MATHS 2026</span>
            </button>
            <ExamInfoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
