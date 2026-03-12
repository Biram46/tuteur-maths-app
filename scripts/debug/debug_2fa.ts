
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkLogs() {
    // Dynamic import to ensure process.env is populated first
    const { supabaseServer } = await import("./lib/supabaseServer");

    console.log("Checking last 5 audit logs...");
    const { data, error } = await supabaseServer
        .from('admin_2fa_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching logs:", error);
        // continue to sessions
    } else {
        console.log(JSON.stringify(data, null, 2));
    }

    console.log("\nChecking last 5 sessions...");
    const { data: sessions, error: sessError } = await supabaseServer
        .from('admin_2fa_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (sessError) {
        console.error("Error fetching sessions:", sessError);
        return;
    }

    console.log(JSON.stringify(sessions, null, 2));
}

checkLogs();
