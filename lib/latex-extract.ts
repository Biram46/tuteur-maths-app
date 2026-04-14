/**
 * Nettoyage du contenu LaTeX généré par l'IA.
 *
 * Problème fréquent : l'IA peut produire des préambules LaTeX dupliqués
 * (le même \documentclass... répété plusieurs fois) quand le output est long.
 * Ce module extrait le bloc LaTeX le plus complet et supprime les doublons.
 */

/**
 * Extrait le meilleur bloc LaTeX à partir du contenu brut de l'IA.
 *
 * Stratégie :
 * 1. Chercher tous les blocs ```latex...``` et prendre le plus long
 * 2. Sinon, chercher le dernier bloc \documentclass...\end{document}
 * 3. Sinon, nettoyer le contenu brut en supprimant les préambules dupliqués
 */
export function extractBestLatex(raw: string): string | null {
    if (!raw) return null;

    const candidates: string[] = [];

    // ── Source 1 : Blocs ```latex...``` ──
    const codeBlockRegex = /```latex\s*\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(raw)) !== null) {
        candidates.push(match[1].trim());
    }

    // ── Source 2 : Blocs \documentclass...\end{document} ──
    const docRegex = /\\documentclass[\s\S]*?\\end\{document\}/g;
    while ((match = docRegex.exec(raw)) !== null) {
        candidates.push(match[0].trim());
    }

    // Garder le candidat le plus long (= le plus complet)
    if (candidates.length > 0) {
        return candidates.reduce((best, block) =>
            block.length > best.length ? block : best, '');
    }

    // ── Fallback : Nettoyer le contenu brut ──
    if (raw.includes('\\documentclass')) {
        return deduplicateLatex(raw);
    }

    return null;
}

/**
 * Supprime les préambules LaTeX dupliqués d'un contenu brut.
 * Garde uniquement la dernière occurrence du préambule + le contenu qui suit.
 */
function deduplicateLatex(raw: string): string {
    // Trouver toutes les positions où \documentclass commence
    const positions: number[] = [];
    const regex = /\\documentclass/g;
    let m;
    while ((m = regex.exec(raw)) !== null) {
        positions.push(m.index);
    }

    if (positions.length <= 1) {
        // Pas de duplication, retourner tel quel (nettoyé)
        return cleanLatexText(raw);
    }

    // Prendre le contenu à partir de la DERNIÈRE occurrence de \documentclass
    // C'est généralement la plus complète car l'IA a eu le temps de produire plus
    // de contenu avant de recommencer
    const lastPos = positions[positions.length - 1];
    let result = raw.substring(lastPos);

    // Supprimer tout texte avant \documentclass sur la même ligne
    const lineStart = result.indexOf('\\documentclass');
    if (lineStart > 0) {
        result = result.substring(lineStart);
    }

    return cleanLatexText(result);
}

/**
 * Nettoie le texte autour du LaTeX :
 * - Supprime les phrases d'introduction de l'IA
 * - Supprime le texte après \end{document}
 * - Supprime les blocs ```latex...``` imbriqués résiduels
 */
function cleanLatexText(text: string): string {
    let cleaned = text;

    // Supprimer les introductions communes de l'IA avant \documentclass
    cleaned = cleaned.replace(
        /[\s\S]*?(?=\\documentclass)/,
        (before) => {
            // Si le texte avant est court (< 200 chars) et contient des phrases d'intro, le supprimer
            if (before.length < 200 && /voici|je vais|voilà|ici le|ci-dessous|complet/i.test(before)) {
                return '';
            }
            return before;
        }
    );

    // Supprimer tout après \end{document} s'il existe
    const endDocIdx = cleaned.lastIndexOf('\\end{document}');
    if (endDocIdx !== -1) {
        cleaned = cleaned.substring(0, endDocIdx + '\\end{document}'.length);
    }

    // Supprimer les backticks et marqueurs de bloc code résiduels
    cleaned = cleaned.replace(/```latex\s*\n?/g, '');
    cleaned = cleaned.replace(/```\s*$/g, '');

    return cleaned.trim();
}

/**
 * Extrait le meilleur bloc HTML depuis le contenu brut de l'IA.
 */
export function extractBestHtml(raw: string): string | null {
    if (!raw) return null;

    // Chercher un bloc ```html...```
    const htmlBlockMatch = raw.match(/```html?\s*\n([\s\S]*?)```/i);
    if (htmlBlockMatch) {
        return htmlBlockMatch[1].trim();
    }

    // Chercher un document HTML complet
    const doctypeMatch = raw.match(/(<!DOCTYPE html[\s\S]*)/i);
    if (doctypeMatch) {
        let html = doctypeMatch[1];
        const htmlEndMatch = html.match(/([\s\S]*<\/html>)/i);
        if (htmlEndMatch) {
            return htmlEndMatch[1].trim();
        }
        return html.trim();
    }

    return null;
}
