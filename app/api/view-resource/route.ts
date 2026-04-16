
import { NextRequest, NextResponse } from "next/server";
import { isUrlSafe } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
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

        const buffer = await response.arrayBuffer();

        // Supabase sert les HTML en text/plain — forcer text/html
        let finalContentType = "application/octet-stream";
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith(".html") || lowerUrl.endsWith(".htm")) {
            finalContentType = "text/html; charset=utf-8";
        } else if (lowerUrl.endsWith(".pdf")) {
            finalContentType = "application/pdf";
        } else {
            const ct = response.headers.get("content-type");
            if (ct) finalContentType = ct;
        }

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": finalContentType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Error in view-resource proxy:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
