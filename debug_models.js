
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

async function debugModels() {
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log('Key used:', openaiKey.substring(0, 15) + '...');
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${openaiKey}` },
        });

        const data = await response.json();
        console.log('Full API Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

debugModels();
