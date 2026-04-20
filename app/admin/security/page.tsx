export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabaseAction';
import { redirect } from 'next/navigation';
import { getTrustedDevices, getAuditLogs } from '@/lib/admin2fa';
import { isAdmin } from '@/lib/api-auth';
import { getAdminAuditLogs } from '@/lib/audit-logger';
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
        if (!isAdmin(user)) {
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

    const [devices, logs, adminLogs] = await Promise.all([
        getTrustedDevices(user.id),
        getAuditLogs(user.id, 20),
        getAdminAuditLogs(30),
    ]);

    return <SecurityDashboard devices={devices} logs={logs} adminLogs={adminLogs} />;
}
