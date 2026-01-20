// lib/supabaseBrowser.ts
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
    console.warn(
        "[supabaseBrowser] Variables d'environnement manquantes. Vérifiez .env.local ou les variables Vercel"
    );
}

// Utiliser une valeur par défaut pour éviter les crashs
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseKey || 'placeholder-key';

export const supabaseBrowser = createBrowserClient(url, key);
