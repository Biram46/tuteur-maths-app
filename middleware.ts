import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/api-auth';

const PROTECTED_PREFIXES = ['/admin', '/prof'];
const SKIP_PATHS = ['/admin/login', '/admin/verify-2fa'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some(
        r => pathname === r || pathname.startsWith(r + '/')
    );
    const isSkipped = SKIP_PATHS.some(
        r => pathname === r || pathname.startsWith(r + '/')
    );

    if (!isProtected || isSkipped) return NextResponse.next();

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (!isAdmin(user)) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/prof/:path*'],
};
