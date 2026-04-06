async function test() {
    const res = await fetch('http://localhost:3000/api/math-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'sign_table',
            expression: '(2*x - 4)*(-x + 3)*(x^2 + 1)',
            niveau: 'terminale_spe'
        })
    });
    const json = await res.json();
    console.log(JSON.stringify(json.rawData, null, 2));
}
test();
