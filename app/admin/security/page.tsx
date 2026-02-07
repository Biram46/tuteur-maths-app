export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';
import { getTrustedDevices, getAuditLogs } from '@/lib/admin2fa';
import SecurityDashboard from './SecurityDashboard';

export default async function SecurityPage() {
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
    } catch (e) {
        if ((e as any)?.message?.includes('NEXT_REDIRECT')) throw e;
        redirect('/');
    }

    // Récupérer les appareils de confiance et les logs
    const devices = await getTrustedDevices(user.id);
    const logs = await getAuditLogs(user.id, 20);

    return <SecurityDashboard devices={devices} logs={logs} />;
}
