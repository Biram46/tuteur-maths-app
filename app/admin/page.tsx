import { getEducationalData } from "@/lib/data";
import AdminDashboard from "./AdminDashboard";
import { createClient } from "@/lib/supabaseAction";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { cookies } from "next/headers";
import { checkTrustedDevice, generateDeviceFingerprint, create2FASession } from "@/lib/admin2fa";
import { headers } from "next/headers";

export default async function AdminPage() {
    // Check Authentication
    let user;
    try {
        const supabase = await createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
            redirect('/');
        }

        user = authUser;

        // Strict Admin Check
        if (user.email !== 'biram26@yahoo.fr') {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-400 font-mono">
                    Access Denied: You do not have administrator privileges.
                </div>
            );
        }

        // ============================================
        // 2FA CHECK - Vérification appareil de confiance
        // ============================================
        const cookieStore = await cookies();
        const deviceToken = cookieStore.get('admin_trusted_device')?.value;
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || '';
        const acceptLanguage = headersList.get('accept-language') || '';
        const currentFingerprint = generateDeviceFingerprint(userAgent, acceptLanguage);

        // Vérifier si l'appareil est de confiance
        const { trusted } = await checkTrustedDevice(user.id, deviceToken || '', currentFingerprint);

        if (!trusted) {
            // Appareil non reconnu - Rediriger vers la vérification
            // La page de vérification se chargera de générer et d'envoyer le premier code
            redirect('/admin/verify-2fa');
        }

        // Si on arrive ici, l'appareil est de confiance - Continuer normalement

    } catch (e) {
        // Important: Next.js redirect() throws an error, we must not catch it
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
            throw e;
        }
        // Pour les versions plus récentes de Next.js qui utilisent des symboles ou des strings spécifiques
        if ((e as any)?.digest?.includes('NEXT_REDIRECT') || (e as any)?.message?.includes('NEXT_REDIRECT')) {
            throw e;
        }

        console.error('Admin page error:', e);
        redirect('/');
    }

    // Diagnostics / Data Fetching
    let data;
    try {
        data = await getEducationalData();
    } catch (error: any) {
        console.error("ADMIN PAGE LOAD ERROR:", error);
        return (
            <div className="min-h-screen p-12 bg-[#020617] text-white font-mono">
                <h1 className="text-2xl text-red-500 mb-4">Erreur Critique de Chargement</h1>
                <p className="mb-4">Impossible de charger les données pédagogiques.</p>
                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg mb-8">
                    <p className="text-sm opacity-80 mb-2">Message technique :</p>
                    <code className="block bg-black p-4 rounded text-red-300">
                        {error.message || "Erreur inconnue"}
                    </code>
                </div>

                <h2 className="text-xl text-cyan-400 mb-2">Solutions possibles (Vercel) :</h2>
                <ul className="list-disc pl-6 space-y-2 text-slate-300">
                    <li>Vérifiez que <strong>SUPABASE_SERVICE_ROLE_KEY</strong> est bien définie dans les variables d'environnement.</li>
                    <li>Vérifiez que <strong>NEXT_PUBLIC_SUPABASE_URL</strong> est correcte.</li>
                    <li>Vérifiez que la base de données est accessible.</li>
                </ul>
                <div className="mt-8">
                    <a href="/" className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700">Retour à l'accueil</a>
                </div>
            </div>
        );
    }

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
                    <a href="/admin/security" className="group flex items-center gap-2 text-xs font-['Orbitron'] tracking-widest text-slate-400 hover:text-green-400 transition-all uppercase">
                        <span className="w-2 h-2 rounded-full border border-slate-600 group-hover:bg-green-500 transition-all"></span>
                        Sécurité 2FA
                    </a>
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
