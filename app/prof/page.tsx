export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabaseAction";
import { redirect } from "next/navigation";
import { getProfesseurData } from "@/lib/data";
import ProfDashboard from "./components/ProfDashboard";

export default async function ProfPage() {
    // ── Auth check ──────────────────────────────────────────────
    let user;
    try {
        const supabase = await createClient();
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error || !authUser) {
            redirect('/login');
        }

        user = authUser;

        // Pour l'instant seul l'admin a accès
        if (user.email !== 'biram26@yahoo.fr') {
            return (
                <div className="min-h-screen flex items-center justify-center text-red-400 font-mono">
                    Accès refusé — Espace réservé aux professeurs.
                </div>
            );
        }
    } catch (e: any) {
        if (e?.digest?.includes?.('NEXT_REDIRECT') || e?.message?.includes?.('NEXT_REDIRECT')) {
            throw e;
        }
        console.error('Prof page error:', e);
        redirect('/login');
    }

    // ── Data fetching ───────────────────────────────────────────
    let data;
    try {
        data = await getProfesseurData(user.id);
    } catch (error: any) {
        console.error("PROF PAGE LOAD ERROR:", error);
        return (
            <div className="min-h-screen p-12 text-white font-mono flex flex-col items-center justify-center">
                <h1 className="text-2xl text-red-500 mb-4">Erreur de chargement</h1>
                <p className="text-slate-400 mb-4">Impossible de charger les données pédagogiques.</p>
                <code className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg text-red-300 text-sm">
                    {error.message || "Erreur inconnue"}
                </code>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-6 md:p-10 min-h-[calc(100vh-80px)]">
            <ProfDashboard
                initialData={data}
                teacherId={user.id}
            />
        </div>
    );
}
