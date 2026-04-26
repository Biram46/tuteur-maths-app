import { supabaseServer } from '@/lib/supabaseServer';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET!;

/**
 * Extrait le chemin de stockage (path) depuis une URL publique Supabase Storage.
 * Ex: "https://xxx.supabase.co/storage/v1/object/public/bucket/prof/abc.tex" → "prof/abc.tex"
 */
export function storagePathFromPublicUrl(url: string): string | null {
    if (!url) return null;
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
        if (url.startsWith(prefix)) {
            return decodeURIComponent(url.slice(prefix.length).split('?')[0]);
        }
        // Fallback : extraire depuis le pathname
        const urlObj = new URL(url);
        const marker = `/object/public/${BUCKET}/`;
        const idx = urlObj.pathname.indexOf(marker);
        if (idx !== -1) {
            return decodeURIComponent(urlObj.pathname.slice(idx + marker.length));
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Télécharge le contenu texte d'un fichier depuis Storage via le service role.
 * Fonctionne même si le bucket est privé (bypasse RLS).
 */
export async function downloadStorageText(path: string): Promise<string> {
    const { data, error } = await supabaseServer.storage
        .from(BUCKET)
        .download(path);
    if (error || !data) {
        throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
    }
    return data.text();
}

/**
 * Génère une URL signée à durée limitée pour l'accès côté client.
 * Fonctionne uniquement si le fichier existe et le bucket est configuré.
 */
export async function createSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabaseServer.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresIn);
    if (error || !data) {
        throw new Error(`Signed URL creation failed: ${error?.message ?? 'no data'}`);
    }
    return data.signedUrl;
}
