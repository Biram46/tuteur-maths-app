// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
    console.warn(
        "[supabaseServer] Variables d'environnement manquantes (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY)."
    );
}

// Ensure we don't crash at import time if keys are missing
// Requests will fail later, which we can catch
export const supabaseServer = createClient(supabaseUrl, supabaseKey);
