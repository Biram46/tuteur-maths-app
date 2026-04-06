async function test() {
    const res = await fetch('http://localhost:5000/sign-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            expression: '(2x - 4)(-x + 3)(x^2 + 1)',
            niveau: 'terminale_spe'
        })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}
test();
