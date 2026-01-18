import { getEducationalData } from "@/lib/data";
import AdminDashboard from "./AdminDashboard";
import { createClient } from "@/lib/supabaseAction";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";

export default async function AdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is logged in and is the admin
    if (!user || user.email !== 'biram26@yahoo.fr') {
        redirect('/');
    }

    const data = await getEducationalData();

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            {/* Animated background particles effect would go here if we had a component */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent_50%)] pointer-events-none"></div>

            <header className="relative z-30 border-b border-cyan-500/10 bg-slate-950/50 backdrop-blur-xl px-12 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-['Orbitron'] tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white uppercase">
                        Structure <span className="text-cyan-500">Pédagogique</span>
                    </h1>
                    <p className="text-[10px] font-mono text-cyan-600 tracking-[0.4em] uppercase mt-1">Console de Contrôle Magistrale</p>
                </div>

                <nav className="flex items-center gap-8">
                    <a href="/assistant" className="group flex items-center gap-2 text-xs font-['Orbitron'] tracking-widest text-slate-400 hover:text-cyan-400 transition-all uppercase">
                        <span className="w-2 h-2 rounded-full border border-slate-600 group-hover:bg-cyan-500 transition-all"></span>
                        Module Assistant
                    </a>
                    <a href="/" className="group flex items-center gap-2 text-xs font-['Orbitron'] tracking-widest text-slate-400 hover:text-fuchsia-400 transition-all uppercase">
                        <span className="w-2 h-2 rounded-full border border-slate-600 group-hover:bg-fuchsia-500 transition-all"></span>
                        Espace Élève
                    </a>
                    <div className="h-4 w-[1px] bg-slate-800"></div>
                    <form action={logout}>
                        <button type="submit" className="bg-cyan-500/10 border border-cyan-500/30 px-6 py-2 rounded-full text-[10px] font-['Orbitron'] tracking-[0.2em] text-cyan-400 hover:bg-cyan-500/20 transition-all uppercase shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                            Déconnexion
                        </button>
                    </form>
                </nav>
            </header>

            <main className="relative z-20 max-w-[1600px] mx-auto p-12 h-[calc(100vh-100px)] flex flex-col gap-8">
                <AdminDashboard initialData={data} />
            </main>

            {/* Futuristic Footer Overlay */}
            <div className="fixed bottom-6 right-12 z-40 text-[8px] font-mono text-slate-600 tracking-[0.5em] uppercase pointer-events-none">
                System Status: Active // Resource Sync: Completed // Admin ID: 0x4f2A
            </div>
        </div>
    );
}
