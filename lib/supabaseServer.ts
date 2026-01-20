// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
    console.warn(
        "[supabaseServer] Variables d'environnement manquantes. Vérifiez .env.local ou les variables Vercel"
    );
}

// Utiliser une valeur par défaut pour éviter les crashs lors du build
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseKey || 'placeholder-key';

export const supabaseServer = createClient(url, key);
