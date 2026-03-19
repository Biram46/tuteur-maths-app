async function test() {
    const res = await fetch('http://localhost:3000/api/math-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'sign_and_variation',
            expression: '(2*x - 1) / (x + 3)',
            niveau: 'terminale_spe'
        })
    });
    const json = await res.json();
    console.log(JSON.stringify(json.rawData.signTable, null, 2));
}
test();
