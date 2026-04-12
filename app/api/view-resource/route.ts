
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isUrlSafe } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
    // Vérification d'authentification
    const user = await getAuthUser();
    if (!user) {
        return new NextResponse("Authentification requise", { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return new NextResponse("URL parameter is missing", { status: 400 });
    }

    // Protection SSRF : valider l'URL avant de la proxyfier
    const urlCheck = isUrlSafe(url);
    if (!urlCheck.safe) {
        return new NextResponse(`URL non autorisée : ${urlCheck.reason}`, { status: 403 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return new NextResponse(`Error fetching resource: ${response.statusText}`, {
                status: response.status,
            });
        }

        const contentType = response.headers.get("content-type");
        const buffer = await response.arrayBuffer();

        // On force le text/html si c'est ce qu'on attend, 
        // ou on se fie à l'extension si le content-type est générique
        let finalContentType = contentType;
        if (url.toLowerCase().endsWith(".html")) {
            finalContentType = "text/html; charset=utf-8";
        }

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": finalContentType || "application/octet-stream",
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Error in view-resource proxy:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
