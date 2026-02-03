/**
 * Client IA pour l'application de tutorat mathématique
 * Fournit des fonctions utilitaires pour interagir avec l'API IA
 */

export interface AiResponse {
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
 * Envoie l'historique de conversation à l'IA
 * @param messages - Historique des messages
 * @param context - Contexte optionnel
 */
export async function chatWithRobot(
    messages: ChatMessage[],
    context?: string
): Promise<AiResponse> {
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
            throw new Error(data.error || 'Erreur lors de la communication avec l\'IA');
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
 * Envoie une question à l'IA (Version simple)
 * @param message - La question ou le message à envoyer
 * @param context - Contexte optionnel (niveau, chapitre, etc.)
 * @returns La réponse de l'IA
 */
export async function askAi(
    message: string,
    context?: string
): Promise<AiResponse> {
    // Wrapper pour utiliser la nouvelle API avec un seul message
    return chatWithRobot([{ role: 'user', content: message }], context);
}

/**
 * Demande une explication d'un concept mathématique
 * @param concept - Le concept à expliquer
 * @param level - Le niveau scolaire (optionnel)
 * @returns L'explication de l'IA
 */
export async function explainConcept(
    concept: string,
    level?: string
): Promise<AiResponse> {
    const message = `Explique-moi le concept suivant en mathématiques : ${concept}`;
    const context = level ? `Niveau scolaire: ${level}` : undefined;

    return askAi(message, context);
}

/**
 * Demande de l'aide pour résoudre un exercice
 * @param exercise - Description de l'exercice
 * @param studentAnswer - Réponse de l'élève (optionnel)
 * @returns L'aide de l'IA
 */
export async function getExerciseHelp(
    exercise: string,
    studentAnswer?: string
): Promise<AiResponse> {
    let message = `Aide-moi à résoudre cet exercice de mathématiques : ${exercise}`;

    if (studentAnswer) {
        message += `\n\nVoici ma tentative de réponse : ${studentAnswer}`;
    }

    return askAi(message, 'Exercice de mathématiques');
}

/**
 * Génère des exercices similaires
 * @param topic - Le sujet mathématique
 * @param difficulty - Niveau de difficulté (facile, moyen, difficile)
 * @param count - Nombre d'exercices à générer
 * @returns Des exercices générés par l'IA
 */
export async function generateExercises(
    topic: string,
    difficulty: 'facile' | 'moyen' | 'difficile' = 'moyen',
    count: number = 3
): Promise<AiResponse> {
    const message = `Génère ${count} exercices de mathématiques de niveau ${difficulty} sur le sujet : ${topic}. 
  Pour chaque exercice, fournis l'énoncé et la solution détaillée.`;

    return askAi(message, `Génération d'exercices - ${topic}`);
}
