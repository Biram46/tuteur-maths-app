// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client;

if (supabaseUrl && supabaseKey) {
    try {
        client = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.error("Failed to initialize Supabase server client:", e);
    }
}

// Fallback proxy to prevent crash on import, but fail on usage
if (!client) {
    console.warn("Supabase Server Client not initialized (missing environment variables).");
    client = new Proxy({}, {
        get: (_target, prop) => {
            if (prop === 'then') return undefined; // Avoid Promise confusion
            return () => {
                const msg = `[Critical] Attempted to use Supabase Server Client but it is not initialized. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`;
                console.error(msg);
                throw new Error(msg);
            }
        }
    });
}

export const supabaseServer = client as any;
