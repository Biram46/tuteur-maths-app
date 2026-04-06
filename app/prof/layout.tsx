import { logout } from "@/app/auth/actions";
import Link from "next/link";

export default function ProfLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(99,102,241,0.15),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(6,182,212,0.10),transparent_50%)]"></div>
            </div>

            {/* Header */}
            <header className="relative z-30 border-b border-indigo-500/10 bg-slate-950/60 backdrop-blur-xl px-6 md:px-12 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
                        P
                    </div>
                    <div>
                        <h1 className="text-lg font-bold font-[var(--font-orbitron)] tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300 uppercase">
                            Espace Professeur
                        </h1>
                        <p className="text-[9px] font-mono text-indigo-500/60 tracking-[0.3em] uppercase">
                            Création & Publication Pédagogique
                        </p>
                    </div>
                </div>

                <nav className="flex items-center gap-2 md:gap-6">
                    <Link
                        href="/prof"
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 transition-all"></span>
                        <span className="hidden md:inline">Séquences</span>
                    </Link>
                    <Link
                        href="/admin"
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 group-hover:bg-cyan-400 transition-all"></span>
                        <span className="hidden md:inline">Admin</span>
                    </Link>
                    <Link
                        href="/"
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/5 transition-all"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500/40 group-hover:bg-fuchsia-400 transition-all"></span>
                        <span className="hidden md:inline">Espace Élève</span>
                    </Link>
                    <div className="hidden md:block h-4 w-px bg-slate-800"></div>
                    <form action={logout}>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold tracking-[0.15em] text-indigo-400 hover:bg-indigo-500/20 transition-all uppercase"
                        >
                            Déconnexion
                        </button>
                    </form>
                </nav>
            </header>

            {/* Main content */}
            <main className="relative z-20">
                {children}
            </main>

            {/* Footer status */}
            <div className="fixed bottom-4 right-8 z-40 text-[8px] font-mono text-slate-700 tracking-[0.4em] uppercase pointer-events-none">
                Espace Professeur • v1.0
            </div>
        </div>
    );
}
