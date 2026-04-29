import { NextResponse } from 'next/server';

export const maxDuration = 15;

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pythonApiUrl = process.env.SYMPY_API_URL || process.env.NEXT_PUBLIC_SYMPY_API_URL;
    if (!pythonApiUrl) {
        return NextResponse.json({ error: 'No SYMPY_API_URL configured' }, { status: 500 });
    }

    const start = Date.now();
    try {
        const res = await fetch(`${pythonApiUrl}/health`, {
            signal: AbortSignal.timeout(10_000),
        });
        const elapsed = Date.now() - start;
        const ok = res.ok;
        return NextResponse.json({ ok, elapsed_ms: elapsed, status: res.status });
    } catch (err: any) {
        const elapsed = Date.now() - start;
        return NextResponse.json({ ok: false, elapsed_ms: elapsed, error: err.message }, { status: 200 });
    }
}
