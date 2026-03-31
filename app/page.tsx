import { getEducationalData } from "@/lib/data";
import { createClient } from "@/lib/supabaseAction";
import UserAuthButton from "./components/UserAuthButton";
import StudentClientView from "./components/StudentClientView";
import { redirect } from "next/navigation";
import NavExamButton from "./components/NavExamButton";
import Link from "next/link";
import { Level, Chapter, Resource } from "@/lib/data";

/**
 * Force dynamic rendering to ensure updated data is always fetched.
 */
export const dynamic = 'force-dynamic';

/**
 * Page d'accueil (Espace Élève)
 * Server Component : Charge les données initiales
 */
export default async function Home() {
    let user = null;
    let levels: Level[] = [];
    let chapters: Chapter[] = [];
    let resources: Resource[] = [];
    let errorDetails = null;

    try {
        // 1. Auth check
        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
            // Check if it's just a "not logged in" situation vs "misconfiguration"
            // If misconfigured (dummy client), it returns specific error
            if (userError?.message === "Missing Supabase Environment Variables") {
                throw new Error(userError.message);
            }
            redirect('/login');
        }

        user = userData.user;

        // 2. Data Fetching
        const data = await getEducationalData();
        levels = data.levels;
        chapters = data.chapters;
        resources = data.resources;

    } catch (e: any) {
        // Catch redirects first (Next.js internals)
        if (e?.message === 'NEXT_REDIRECT') {
            throw e;
        }

        console.error("HOME PAGE CRITICAL ERROR:", e);
        errorDetails = e.message || "Erreur inconnue";
    }

    // If critical error (maintenance mode)
    if (errorDetails) {
        return (
            <div className="min-h-screen p-12 bg-[#020617] text-white font-mono flex flex-col items-center justify-center">
                <h1 className="text-2xl text-red-500 mb-4">Maintenance en cours</h1>
                <p className="mb-4 text-center">L'application ne parvient pas à démarrer correctement.</p>
                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg mb-8 max-w-md">
                    <p className="text-sm opacity-80 mb-2">Erreur technique :</p>
                    <code className="block bg-black p-4 rounded text-red-300 text-xs break-all">
                        {errorDetails}
                    </code>
                </div>
                <div className="text-slate-500 text-sm text-center">
                    <p>Administrateur : Vérifiez les variables d'environnement sur Vercel.</p>
                    <p className="mt-2 text-xs opacity-50">NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Vue Client : Interactive */}
            <StudentClientView
                levels={levels}
                chapters={chapters}
                resources={resources}
            />
        </>
    );
}
