import { NextRequest, NextResponse } from "next/server";
import { isUrlSafe, getAuthUser } from "@/lib/api-auth";
import { storagePathFromPublicUrl, createSignedUrl, downloadStorageText } from "@/lib/storage";

/**
 * GET /api/download?url=<storageUrl>&filename=<name.tex>
 *
 * Proxifie un fichier depuis Supabase Storage et le sert avec
 * Content-Disposition: attachment pour forcer le téléchargement.
 * Requiert une session authentifiée.
 */
export async function GET(request: NextRequest) {
    // Authentification obligatoire
    const user = await getAuthUser();
    if (!user) {
        return new NextResponse("Authentification requise", { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "document.tex";

    if (!fileUrl) {
        return new NextResponse("Paramètre url manquant", { status: 400 });
    }

    // Protection SSRF
    const check = isUrlSafe(fileUrl);
    if (!check.safe) {
        return new NextResponse(`URL non autorisée : ${check.reason}`, { status: 403 });
    }

    // Encoder le nom de fichier pour Content-Disposition (RFC 5987)
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const encodedName = encodeURIComponent(filename);

    // Si c'est une URL Supabase Storage connue, télécharger via le SDK (service role)
    // afin de fonctionner même si le bucket est rendu privé.
    const storagePath = storagePathFromPublicUrl(fileUrl);
    if (storagePath) {
        try {
            const content = await downloadStorageText(storagePath);
            return new NextResponse(content, {
                headers: {
                    "Content-Type": "text/x-latex; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
                    "Cache-Control": "private, no-store",
                },
            });
        } catch (e: any) {
            return new NextResponse(`Fichier introuvable: ${e.message}`, { status: 404 });
        }
    }

    // Fallback : fetch direct pour les URLs non-Storage (ex: /public/...)
    let upstream: Response;
    try {
        upstream = await fetch(fileUrl);
    } catch {
        return new NextResponse("Impossible de joindre le fichier", { status: 502 });
    }

    if (!upstream.ok) {
        return new NextResponse(`Fichier introuvable (${upstream.status})`, { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "text/x-latex; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
            "Cache-Control": "private, no-store",
        },
    });
}
