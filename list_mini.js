
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

async function listMini() {
    const openaiKey = process.env.OPENAI_API_KEY;
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${openaiKey}` },
        });

        const data = await response.json();
        if (response.ok) {
            const models = data.data.map(m => m.id);
            const matches = models.filter(id => id.toLowerCase().includes('mini'));
            console.log('--- MODELS MATCHING "mini" ---');
            console.log(matches.join('\n'));
            console.log('---------------------------');
        }
    } catch (e) { }
}

listMini();
