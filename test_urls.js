
const http = require('http');

const urls = [
    'http://localhost:3000/resources/1ere/second_degre_cours.md',
    'http://localhost:3000/resources/1ere/second_degre_cours.tex',
    'http://localhost:3000/resources/1ere/second_degre_cours.pdf',
    'http://localhost:3000/resources/1ere/second_degre_cours.docx'
];

async function testUrls() {
    console.log('🔍 Testing static resource accessibility...');
    for (const url of urls) {
        await new Promise((resolve) => {
            http.get(url, (res) => {
                console.log(`${url} - Status: ${res.statusCode} - Size: ${res.headers['content-length']} bytes`);
                resolve();
            }).on('error', (e) => {
                console.log(`${url} - Error: ${e.message}`);
                resolve();
            });
        });
    }
}

testUrls();
