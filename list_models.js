
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
    console.log('📡 Récupération de la liste des modèles OpenAI...');

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
            },
        });

        const data = await response.json();
        if (response.ok) {
            console.log('✅ Liste récupérée !');
            const models = data.data.map(m => m.id).sort();
            console.log('Modèles disponibles (extrait) :');
            const interesting = models.filter(id => id.includes('gpt') || id.includes('o1'));
            console.log(interesting.join(', '));

            if (models.includes('o1-mini')) {
                console.log('\n✨ o1-mini est bien présent dans la liste !');
            } else {
                console.log('\n❌ o1-mini n\'est pas dans la liste des modèles accessibles.');
            }
        } else {
            console.log('❌ Erreur :', data.error?.message);
        }
    } catch (e) {
        console.error('Erreur :', e.message);
    }
}

listModels();
