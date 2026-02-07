
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log('--- DERNIERS LOGS D\'AUDIT 2FA ---');
    const { data: logs, error: logsError } = await supabase
        .from('admin_2fa_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logsError) {
        console.error('Erreur logs:', logsError);
    } else {
        console.table(logs.map(l => ({
            event: l.event_type,
            success: l.success,
            email_sent: l.metadata?.email_sent,
            date: new Date(l.created_at).toLocaleString('fr-FR')
        })));
    }

    console.log('\n--- DERNIÈRES SESSIONS 2FA ---');
    const { data: sessions, error: sessionsError } = await supabase
        .from('admin_2fa_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (sessionsError) {
        console.error('Erreur sessions:', sessionsError);
    } else {
        console.table(sessions.map(s => ({
            id: s.id.slice(0, 8),
            code: s.code,
            verified: s.verified,
            date: new Date(s.created_at).toLocaleString('fr-FR')
        })));
    }
}

checkLogs();
