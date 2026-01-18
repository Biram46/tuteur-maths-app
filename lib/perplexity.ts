/**
 * Client Perplexity pour l'application de tutorat mathématique
 * Fournit des fonctions utilitaires pour interagir avec l'API Perplexity
 */

export interface PerplexityResponse {
    success: boolean;
    response: string;
    citations?: string[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    error?: string;
}

/**
 * Structure d'un message pour le chat
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    citations?: string[];
}

/**
 * Envoie l'historique de conversation à Perplexity AI
 * @param messages - Historique des messages
 * @param context - Contexte optionnel
 */
export async function chatWithRobot(
    messages: ChatMessage[],
    context?: string
): Promise<PerplexityResponse> {
    try {
        const response = await fetch('/api/perplexity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                context,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la communication avec Perplexity');
        }

        return data;
    } catch (error) {
        console.error('Erreur chatWithRobot:', error);
        return {
            success: false,
            response: '',
            error: error instanceof Error ? error.message : 'Erreur inconnue',
        };
    }
}

/**
 * Envoie une question à Perplexity AI (Version simple)
 * @param message - La question ou le message à envoyer
 * @param context - Contexte optionnel (niveau, chapitre, etc.)
 * @returns La réponse de Perplexity
 */
export async function askPerplexity(
    message: string,
    context?: string
): Promise<PerplexityResponse> {
    // Wrapper pour utiliser la nouvelle API avec un seul message
    return chatWithRobot([{ role: 'user', content: message }], context);
}

/**
 * Demande une explication d'un concept mathématique
 * @param concept - Le concept à expliquer
 * @param level - Le niveau scolaire (optionnel)
 * @returns L'explication de Perplexity
 */
export async function explainConcept(
    concept: string,
    level?: string
): Promise<PerplexityResponse> {
    const message = `Explique-moi le concept suivant en mathématiques : ${concept}`;
    const context = level ? `Niveau scolaire: ${level}` : undefined;

    return askPerplexity(message, context);
}

/**
 * Demande de l'aide pour résoudre un exercice
 * @param exercise - Description de l'exercice
 * @param studentAnswer - Réponse de l'élève (optionnel)
 * @returns L'aide de Perplexity
 */
export async function getExerciseHelp(
    exercise: string,
    studentAnswer?: string
): Promise<PerplexityResponse> {
    let message = `Aide-moi à résoudre cet exercice de mathématiques : ${exercise}`;

    if (studentAnswer) {
        message += `\n\nVoici ma tentative de réponse : ${studentAnswer}`;
    }

    return askPerplexity(message, 'Exercice de mathématiques');
}

/**
 * Génère des exercices similaires
 * @param topic - Le sujet mathématique
 * @param difficulty - Niveau de difficulté (facile, moyen, difficile)
 * @param count - Nombre d'exercices à générer
 * @returns Des exercices générés par Perplexity
 */
export async function generateExercises(
    topic: string,
    difficulty: 'facile' | 'moyen' | 'difficile' = 'moyen',
    count: number = 3
): Promise<PerplexityResponse> {
    const message = `Génère ${count} exercices de mathématiques de niveau ${difficulty} sur le sujet : ${topic}. 
  Pour chaque exercice, fournis l'énoncé et la solution détaillée.`;

    return askPerplexity(message, `Génération d'exercices - ${topic}`);
}
