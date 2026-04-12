export const dynamic = 'force-dynamic';
import { createClient } from "@/lib/supabaseAction";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { cookies } from "next/headers";
import { checkTrustedDevice, generateDeviceFingerprint } from "@/lib/admin2fa";
import { headers } from "next/headers";
import { isAdminEmail } from "@/lib/api-auth";
import RagAdminDashboard from "./RagAdminDashboard";
import { fetchRagDocuments, RagDocument } from "./actions";

export default async function RagAdminPage() {
    // Check Authentication
    let user;
    try {
        const supabase = await createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
            redirect('/login');
        }

        user = authUser;

        // Strict Admin Check
        if (!isAdminEmail(user.email)) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-400 font-mono">
                    Access Denied: You do not have administrator privileges.
                </div>
            );
        }

        // ============================================
        // 2FA CHECK
        // ============================================
        const cookieStore = await cookies();
        const deviceToken = cookieStore.get('admin_trusted_device')?.value;
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || '';
        const acceptLanguage = headersList.get('accept-language') || '';
        const currentFingerprint = generateDeviceFingerprint(userAgent, acceptLanguage);

        const { trusted } = await checkTrustedDevice(user.id, deviceToken || '', currentFingerprint);

        if (!trusted && process.env.NODE_ENV !== 'development') {
            redirect('/admin/verify-2fa');
        }

    } catch (e) {
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
            throw e;
        }
        if ((e as any)?.digest?.includes('NEXT_REDIRECT') || (e as any)?.message?.includes('NEXT_REDIRECT')) {
            throw e;
        }

        console.error('Admin page error:', e);
        redirect('/');
    }

    // Fetch initial data
    let initialDocs: RagDocument[] = [];
    let errorMsg = null;
    try {
        const res = await fetchRagDocuments(1, 30, '', '', '');
        initialDocs = res.documents;
    } catch (e: any) {
        errorMsg = e.message;
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none"></div>

            <header className="relative z-30 border-b border-emerald-500/10 bg-slate-950/50 backdrop-blur-xl px-12 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-['Orbitron'] tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white uppercase">
                        RAG <span className="text-emerald-500">Database</span>
                    </h1>
                    <p className="text-[10px] font-mono text-emerald-600 tracking-[0.4em] uppercase mt-1">Console de Contrôle RAG</p>
                </div>

                <nav className="flex items-center gap-8">
                    <a href="/admin" className="group flex items-center gap-2 text-xs font-['Orbitron'] tracking-widest text-slate-400 hover:text-cyan-400 transition-all uppercase">
                        <span className="w-2 h-2 rounded-full border border-slate-600 group-hover:bg-cyan-500 transition-all"></span>
                        Admin Principal
                    </a>
                    <a href="/admin/security" className="group flex items-center gap-2 text-xs font-['Orbitron'] tracking-widest text-slate-400 hover:text-green-400 transition-all uppercase">
                        <span className="w-2 h-2 rounded-full border border-slate-600 group-hover:bg-green-500 transition-all"></span>
                        Sécurité 2FA
                    </a>
                    <div className="h-4 w-[1px] bg-slate-800"></div>
                    <form action={logout}>
                        <button type="submit" className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-2 rounded-full text-[10px] font-['Orbitron'] tracking-[0.2em] text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            Déconnexion
                        </button>
                    </form>
                </nav>
            </header>

            <main className="relative z-20 max-w-[1800px] mx-auto px-12 py-6 flex-1 flex flex-col gap-6 overflow-hidden">
                {errorMsg && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded mb-4">
                        Erreur de connexion à la base: {errorMsg}
                    </div>
                )}
                <RagAdminDashboard initialDocs={initialDocs} />
            </main>
        </div>
    );
}
