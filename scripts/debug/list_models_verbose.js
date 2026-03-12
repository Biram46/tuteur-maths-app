
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

async function listModels() {
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log('--- START LISTING MODELS ---');

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
            },
        });

        const data = await response.json();
        if (response.ok) {
            const models = data.data.map(m => m.id);
            console.log('Total models:', models.length);

            const o1Models = models.filter(id => id.startsWith('o1'));
            console.log('O1 Series:', o1Models.length > 0 ? o1Models.join(', ') : 'NONE');

            const gpt4Models = models.filter(id => id.startsWith('gpt-4'));
            console.log('GPT-4 Series (subset):', gpt4Models.slice(0, 10).join(', '));

            if (models.includes('o1-mini')) {
                console.log('FOUND: o1-mini');
            } else {
                console.log('NOT FOUND: o1-mini');
            }
        } else {
            console.log('ERROR:', data.error?.message);
        }
    } catch (e) {
        console.error('EXCEPTION:', e.message);
    }
    console.log('--- END LISTING MODELS ---');
}

listModels();
