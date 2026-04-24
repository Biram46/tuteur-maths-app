import { NextRequest, NextResponse } from "next/server";
import { isUrlSafe } from "@/lib/api-auth";

/**
 * GET /api/download?url=<storageUrl>&filename=<name.tex>
 *
 * Proxifie un fichier depuis Supabase Storage et le sert avec
 * Content-Disposition: attachment pour forcer le téléchargement
 * même sur des URLs cross-origin (où l'attribut HTML download est ignoré).
 */
export async function GET(request: NextRequest) {
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

    // Encoder le nom de fichier pour Content-Disposition (RFC 5987)
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const encodedName = encodeURIComponent(filename);

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "text/x-latex; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
            "Cache-Control": "private, no-store",
        },
    });
}
