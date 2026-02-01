import { getEducationalData } from "@/lib/data";
import { createClient } from "@/lib/supabaseAction";
import UserAuthButton from "./components/UserAuthButton";
import StudentClientView from "./components/StudentClientView";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    const { levels, chapters, resources } = await getEducationalData();

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

