import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { storagePathFromPublicUrl, createSignedUrl } from "@/lib/storage";

/**
 * GET /api/storage/sign?url=<storageUrl>
 *
 * Génère une URL signée temporaire (1h) depuis une URL Supabase Storage publique.
 * Requiert une session authentifiée.
 * Redirige directement vers l'URL signée.
 */
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return new NextResponse("Authentification requise", { status: 401 });
    }

    const fileUrl = request.nextUrl.searchParams.get("url");
    if (!fileUrl) {
        return new NextResponse("Paramètre url manquant", { status: 400 });
    }

    const storagePath = storagePathFromPublicUrl(fileUrl);
    if (!storagePath) {
        // URL non-Storage (ex: fichier local /public/) : redirection directe
        return NextResponse.redirect(fileUrl);
    }

    try {
        const signedUrl = await createSignedUrl(storagePath, 3600);
        return NextResponse.redirect(signedUrl);
    } catch (e: any) {
        return new NextResponse(`Fichier introuvable: ${e.message}`, { status: 404 });
    }
}
