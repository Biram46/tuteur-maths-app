/**
 * Script de test pour l'intégration Perplexity AI
 * Exécutez ce script pour vérifier que votre configuration fonctionne
 * 
 * Usage: node --loader ts-node/esm test-perplexity.mjs
 * Ou créez une route API de test
 */

// Ce fichier peut être utilisé comme référence pour tester l'API

export const testPerplexityConnection = async () => {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
        console.error('❌ PERPLEXITY_API_KEY non définie dans .env.local');
        return false;
    }

    console.log('🔍 Test de connexion à Perplexity AI...');

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un assistant mathématique.',
                    },
                    {
                        role: 'user',
                        content: 'Dis bonjour en une phrase courte.',
                    },
                ],
                max_tokens: 50,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erreur API:', error);
            return false;
        }

        const data = await response.json();
        console.log('✅ Connexion réussie !');
        console.log('📝 Réponse:', data.choices[0].message.content);
        console.log('💰 Tokens utilisés:', data.usage.total_tokens);

        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        return false;
    }
};

// Tests unitaires pour les différentes fonctions
export const testCases = [
    {
        name: 'Question simple',
        message: 'Qu\'est-ce qu\'une équation du second degré ?',
        context: 'Niveau Seconde',
    },
    {
        name: 'Explication de concept',
        message: 'Explique-moi les dérivées',
        context: 'Niveau Terminale',
    },
    {
        name: 'Aide exercice',
        message: 'Comment résoudre x² - 5x + 6 = 0 ?',
        context: 'Exercice de mathématiques',
    },
];

/**
 * Fonction pour tester tous les cas
 */
export const runAllTests = async () => {
    console.log('🧪 Démarrage des tests Perplexity AI\n');

    const connectionOk = await testPerplexityConnection();

    if (!connectionOk) {
        console.log('\n❌ Tests interrompus : problème de connexion');
        return;
    }

    console.log('\n📋 Exécution des tests de cas d\'usage...\n');

    for (const testCase of testCases) {
        console.log(`\n🔬 Test: ${testCase.name}`);
        console.log(`   Message: ${testCase.message}`);
        console.log(`   Contexte: ${testCase.context}`);

        try {
            const response = await fetch('http://localhost:3000/api/perplexity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: testCase.message,
                    context: testCase.context,
                }),
            });

            const data = await response.json();

            if (data.success) {
                console.log(`   ✅ Succès`);
                console.log(`   📝 Réponse (extrait): ${data.response.substring(0, 100)}...`);
            } else {
                console.log(`   ❌ Échec: ${data.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    console.log('\n✨ Tests terminés !');
};

// Pour utilisation en tant que module
export default {
    testPerplexityConnection,
    testCases,
    runAllTests,
};
