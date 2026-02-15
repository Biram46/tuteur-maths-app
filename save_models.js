
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

async function listAllAndSave() {
    const openaiKey = process.env.OPENAI_API_KEY;
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${openaiKey}` },
        });

        const data = await response.json();
        if (response.ok) {
            const models = data.data.map(m => m.id).sort();
            fs.writeFileSync('all_openai_models.txt', models.join('\n'));
            console.log(`Fichier 'all_openai_models.txt' créé avec ${models.length} modèles.`);
        }
    } catch (e) {
        console.error(e);
    }
}

listAllAndSave();
