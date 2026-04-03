const https = require('https');

const data = JSON.stringify({
    type: 'variation_table',
    expression: 'x^3 - (3)/(2)*x^2 - 6x + 5',
    niveau: 'terminale-specialite',
    options: { searchDomain: [-5, 5] }
});

const options = {
    hostname: 'tuteur-maths-app.vercel.app',
    port: 443,
    path: '/api/math-engine',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log(body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
