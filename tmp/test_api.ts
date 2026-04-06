import { NextRequest } from 'next/server';

async function test() {
    try {
        const { POST: POST_MATH } = await import('../app/api/math-engine/route');
        const reqMath = new NextRequest('http://localhost/api/math-engine', {
            method: 'POST',
            body: JSON.stringify({ type: 'sign_table', expression: 'sqrt(x+2)' }),
        });
        const resMath = await POST_MATH(reqMath);
        const dataMath = await resMath.json();
        console.log("MATH ENGINE DATA (sqrt):", dataMath);

        const { POST: POST_ROUTER } = await import('../app/api/math-router/route');
        const reqRouter = new NextRequest('http://localhost/api/math-router', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Étudier le signe de f(x) = (x+2)(x-3)',
                niveau: 'seconde'
            }),
        });
        const resRouter = await POST_ROUTER(reqRouter);
        const dataRouter = await resRouter.json();
        console.log("ROUTER DATA:", dataRouter);

    } catch (e) {
        console.error("CRASH", e);
    }
}
test();
