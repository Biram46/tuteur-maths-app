import { NextRequest, NextResponse } from 'next/server';

/**
 * Route API de test pour Perplexity AI
 * Accessible via GET /api/test-perplexity
 * 
 * Cette route permet de vérifier rapidement si l'intégration Perplexity fonctionne
 */
export async function GET(request: NextRequest) {
    const results = {
        timestamp: new Date().toISOString(),
        tests: [] as any[],
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
        },
    };

    // Test 1: Vérifier la présence de la clé API
    const test1 = {
        name: 'Configuration de la clé API',
        status: 'pending' as 'passed' | 'failed' | 'pending',
        message: '',
    };

    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
        test1.status = 'failed';
        test1.message = 'PERPLEXITY_API_KEY non définie dans les variables d\'environnement';
    } else if (apiKey === 'your_perplexity_api_key_here') {
        test1.status = 'failed';
        test1.message = 'Clé API non configurée (valeur par défaut détectée)';
    } else if (!apiKey.startsWith('pplx-')) {
        test1.status = 'failed';
        test1.message = 'Format de clé API invalide (devrait commencer par "pplx-")';
    } else {
        test1.status = 'passed';
        test1.message = `Clé API configurée (${apiKey.substring(0, 10)}...)`;
    }

    results.tests.push(test1);
    results.summary.total++;
    if (test1.status === 'passed') results.summary.passed++;
    else results.summary.failed++;

    // Test 2: Connexion à l'API Perplexity
    const test2 = {
        name: 'Connexion à l\'API Perplexity',
        status: 'pending' as 'passed' | 'failed' | 'pending',
        message: '',
        responseTime: 0,
    };

    if (test1.status === 'passed') {
        try {
            const startTime = Date.now();

            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'sonar-reasoning-pro',
                    messages: [
                        {
                            role: 'system',
                            content: 'Tu es un assistant de test.',
                        },
                        {
                            role: 'user',
                            content: 'Réponds simplement "OK" si tu me reçois.',
                        },
                    ],
                    // max_tokens: 10,
                }),
            });

            const endTime = Date.now();
            test2.responseTime = endTime - startTime;

            if (!response.ok) {
                const errorData = await response.json();
                test2.status = 'failed';
                test2.message = `Erreur HTTP ${response.status}: ${JSON.stringify(errorData)}`;
            } else {
                const data = await response.json();
                test2.status = 'passed';
                test2.message = `Connexion réussie (${test2.responseTime}ms) - Réponse: "${data.choices[0].message.content}"`;
            }
        } catch (error) {
            test2.status = 'failed';
            test2.message = `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
        }
    } else {
        test2.status = 'failed';
        test2.message = 'Test ignoré (clé API non configurée)';
    }

    results.tests.push(test2);
    results.summary.total++;
    if (test2.status === 'passed') results.summary.passed++;
    else results.summary.failed++;

    // Test 3: Test de la route API locale
    const test3 = {
        name: 'Route API locale /api/perplexity',
        status: 'pending' as 'passed' | 'failed' | 'pending',
        message: '',
    };

    if (test1.status === 'passed') {
        try {
            const baseUrl = request.nextUrl.origin;
            const response = await fetch(`${baseUrl}/api/perplexity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'Test de connexion' }],
                    context: 'Test automatique',
                }),
            });

            const data = await response.json();

            if (data.success) {
                test3.status = 'passed';
                test3.message = 'Route API fonctionnelle';
            } else {
                test3.status = 'failed';
                test3.message = `Erreur: ${data.error}`;
            }
        } catch (error) {
            test3.status = 'failed';
            test3.message = `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
        }
    } else {
        test3.status = 'failed';
        test3.message = 'Test ignoré (clé API non configurée)';
    }

    results.tests.push(test3);
    results.summary.total++;
    if (test3.status === 'passed') results.summary.passed++;
    else results.summary.failed++;

    // Déterminer le statut global
    const allPassed = results.summary.failed === 0;

    return NextResponse.json({
        success: allPassed,
        message: allPassed
            ? '✅ Tous les tests sont passés ! Perplexity AI est correctement configuré.'
            : '❌ Certains tests ont échoué. Consultez les détails ci-dessous.',
        ...results,
    }, {
        status: allPassed ? 200 : 500,
    });
}
