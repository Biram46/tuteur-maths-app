/**
 * Tracking léger de l'usage des API IA.
 *
 * En Edge Runtime, on ne peut pas écrire sur disque — on loggue en console
 * dans un format structuré (JSON) pour que les outils de monitoring (Vercel Logs,
 * Datadog, etc.) puissent agréger les métriques.
 *
 * Pour un tracking persistant, connecter un webhook ou une BDD externe via
 * la fonction `flush()` personnalisée.
 */

export interface AIUsageEvent {
    provider: string;
    model: string;
    route: string;
    success: boolean;
    latencyMs: number;
    tokensEstimate?: number;
    error?: string;
    level_label?: string;
    resource_type?: string;
    timestamp: string;
}

/**
 * Enregistre un événement d'usage IA.
 * En production, remplacer le console.log par un envoi vers votre système de monitoring.
 */
export function trackAIUsage(event: Omit<AIUsageEvent, 'timestamp'>): void {
    const fullEvent: AIUsageEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };

    // Format structuré pour les agrégateurs de logs
    console.log(`[AI-USAGE] ${JSON.stringify(fullEvent)}`);
}

/**
 * Mesure le temps d'exécution d'un appel IA et enregistre le résultat.
 */
export async function trackAIRequest<T>(
    provider: string,
    model: string,
    route: string,
    fn: () => Promise<T>,
    context?: { level_label?: string; resource_type?: string }
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        trackAIUsage({
            provider,
            model,
            route,
            success: true,
            latencyMs: Date.now() - start,
            level_label: context?.level_label,
            resource_type: context?.resource_type,
        });
        return result;
    } catch (error: any) {
        trackAIUsage({
            provider,
            model,
            route,
            success: false,
            latencyMs: Date.now() - start,
            error: error.message?.slice(0, 200),
            level_label: context?.level_label,
            resource_type: context?.resource_type,
        });
        throw error;
    }
}
