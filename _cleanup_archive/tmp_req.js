import fetch from 'node-fetch';

async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/math-engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'variation_table', 
                expression: 'x^3 - 3*x + 2', 
                niveau: 'terminale',
                options: {
                    searchDomain: [-3, 3]
                }
            })
        });
        const data = await res.json();
        console.log("SUCCESS:", data.success);
        console.log("AAA BLOCK:\n======\n" + data.aaaBlock + "\n======");
        console.log("AI CONTEXT:\n", data.aiContext);
    } catch (err) {
        console.error("Fetch err:", err);
    }
}
run();
