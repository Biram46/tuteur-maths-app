
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

async function searchSpecificModel() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const target = 'o4-mini-deep-research-2025-06-26';
    console.log(`🔍 Recherche spécifique du modèle: ${target}...`);

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${openaiKey}` },
        });

        const data = await response.json();
        if (response.ok) {
            const models = data.data.map(m => m.id);
            const exists = models.includes(target);

            if (exists) {
                console.log(`✅ TROUVÉ : ${target} est disponible !`);
            } else {
                console.log(`❌ NON TROUVÉ : ${target} n'est pas dans votre liste.`);
                const similar = models.filter(id => id.includes('o4') || id.includes('deep-research'));
                if (similar.length > 0) {
                    console.log('Modèles similaires trouvés :', similar.join(', '));
                } else {
                    console.log('Aucun modèle o4 ou deep-research trouvé.');
                }
            }
        } else {
            console.log('Erreur API :', data.error?.message);
        }
    } catch (e) {
        console.error('Erreur :', e.message);
    }
}

searchSpecificModel();
