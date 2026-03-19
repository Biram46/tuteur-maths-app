import type { NiveauLycee } from '@/lib/niveaux';

/**
 * Détecte le niveau scolaire mentionné dans un message utilisateur.
 * Retourne null si aucun niveau n'est détecté.
 */
export function detectNiveauFromMessage(msg: string): NiveauLycee | null {
    const low = msg.toLowerCase();
    if (/terminale\s*(maths?\s*)?expert/i.test(low)) return 'terminale_expert';
    if (/terminale\s*(maths?\s*)?comp/i.test(low)) return 'terminale_comp';
    if (/terminale\s*(techno|sti|stl|stmg|st2s)/i.test(low)) return 'terminale_techno';
    if (/terminale|tle|term/i.test(low)) return 'terminale_spe';
    if (/premi[eè]re\s*(techno|sti|stl|stmg|st2s)/i.test(low)) return 'premiere_techno';
    if (/premi[eè]re\s*(sp[eé]|maths)/i.test(low)) return 'premiere_spe';
    if (/premi[eè]re|1[eè]?re/i.test(low)) return 'premiere_commune';
    if (/seconde\s*sthr/i.test(low)) return 'seconde_sthr';
    if (/seconde|2nde|2de/i.test(low)) return 'seconde';
    return null;
}

/**
 * Résout le niveau effectif :
 * 1. Sélecteur UI (priorité maximale)
 * 2. Détection automatique dans le message
 * 3. Défaut : première spé
 *
 * onDetected est appelé si le niveau est auto-détecté, pour persister le choix.
 */
export function resolveNiveau(
    userMessage: string,
    selectedNiveau: NiveauLycee | null,
    onDetected?: (n: NiveauLycee) => void
): NiveauLycee {
    if (selectedNiveau) return selectedNiveau;
    const detected = detectNiveauFromMessage(userMessage);
    if (detected) {
        onDetected?.(detected);
        return detected;
    }
    return 'terminale_spe';
}
