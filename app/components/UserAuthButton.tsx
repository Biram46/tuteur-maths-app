"use client";

import { logout } from "../auth/actions";
import Link from "next/link";
import { useTransition } from "react";

export default function UserAuthButton({ user }: { user: any }) {
    const [isPending, startTransition] = useTransition();

    if (!user) {
        return (
            <Link
                href="/login"
                className="px-6 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-400 hover:bg-cyan-500/20 transition-all uppercase shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            >
                Connexion
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[8px] font-['Orbitron'] tracking-[0.3em] text-cyan-600 uppercase">Utilisateur Actif</span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    {user.email}
                </span>
            </div>
            <button
                onClick={() => startTransition(() => logout())}
                disabled={isPending}
                className="px-6 py-2 rounded-full border border-red-500/30 bg-red-500/5 text-[10px] font-['Orbitron'] tracking-[0.2em] text-red-400 hover:bg-red-500/10 transition-all uppercase"
            >
                {isPending ? "Dégagement..." : "Quitter"}
            </button>
        </div>
    );
}
