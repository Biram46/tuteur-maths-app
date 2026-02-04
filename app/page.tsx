import { getEducationalData } from "@/lib/data";
import { createClient } from "@/lib/supabaseAction";
import UserAuthButton from "./components/UserAuthButton";
import StudentClientView from "./components/StudentClientView";
import { redirect } from "next/navigation";
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
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Récupération des données depuis Supabase (via lib/data.ts)
    // Wrap in try-catch to prevent 500 error if DB is down or keys missing
    let levels: Level[] = [];
    let chapters: Chapter[] = [];
    let resources: Resource[] = [];
    let errorDetails = null;

    try {
        const data = await getEducationalData();
        levels = data.levels;
        chapters = data.chapters;
        resources = data.resources;
    } catch (e: any) {
        console.error("HOME PAGE DATA FETCH ERROR:", e);
        errorDetails = e.message;
        // We continue rendering with empty data, but could optionally show an error message
    }

    // If critical error (no data and error present), show maintenance mode or error
    if (errorDetails) {
        return (
            <div className="min-h-screen p-12 bg-[#020617] text-white font-mono flex flex-col items-center justify-center">
                <h1 className="text-2xl text-red-500 mb-4">Maintenance en cours</h1>
                <p className="mb-4 text-center">L'application ne parvient pas à récupérer les cours.</p>
                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg mb-8 max-w-md">
                    <p className="text-sm opacity-80 mb-2">Erreur technique :</p>
                    <code className="block bg-black p-4 rounded text-red-300 text-xs break-all">
                        {errorDetails}
                    </code>
                </div>
                <p className="text-slate-500 text-sm">Veuillez vérifier les variables d'environnement (SUPABASE_SERVICE_ROLE_KEY).</p>
            </div>
        );
    }

    return (
        <>
            {/* En-tête Global */}
            <header className="main-header">
                <div className="logo flex items-center gap-2">
                    <span className="text-2xl">📐</span>
                    <h1 className="text-xl font-bold">Tuteur Maths</h1>
                </div>

                <nav className="main-nav">
                    <button className="nav-tab nav-tab-active">
                        Espace élèves
                    </button>
                    <Link href="/assistant" className="nav-tab">
                        Module Assistant
                    </Link>
                    <Link href="/admin" className="nav-tab">
                        Espace prof
                    </Link>
                </nav>

                <div className="header-actions">
                    <UserAuthButton user={user} />
                </div>
            </header>


            {/* Vue Client : Interactive */}
            <StudentClientView
                levels={levels}
                chapters={chapters}
                resources={resources}
            />
        </>
    );
}
