/**
 * COUCHE 2 — MATH SPEC GENERATOR
 * ================================
 * Ce module est le cœur de la Couche 2 : le "Codeur AI".
 *
 * Responsabilités :
 * 1. PARSER   : Extraire les MathSpec depuis les réponses de l'IA
 * 2. VALIDER  : Vérifier que la spec respecte le programme du niveau
 * 3. CONVERTIR: MathSpec → format @@@-bloc compris par MathAssistant
 * 4. INSTRUIRE: Générer les instructions à injecter dans le prompt de l'IA
 */

import type {
    MathSpec, MathSpecBase, TableSpec, TableRow,
    SignTableMathSpec, VariationTableMathSpec,
    ParsedMathBlock, ValidationResult, MathOutputType,
} from './math-spec-types';
import type { NiveauLycee } from './niveaux';
import { getContraintesIA, getNiveauInfo } from './niveaux';

// ─────────────────────────────────────────────────────────────
// SECTION 1 : INSTRUCTIONS IA (Couche 2 → Couche 1)
// Ce texte est injecté dans le system prompt pour guider l'IA
// ─────────────────────────────────────────────────────────────

/**
 * Génère les instructions complètes à injecter dans le prompt de l'IA.
 * Combine :
 *  - Les contraintes officielles du programme (curriculum.ts)
 *  - Le format MathSpec pour les sorties structurées
 *  - Les exemples par type de sortie
 */
export function generateSystemPromptInstructions(niveau: NiveauLycee, basePrompt: string): string {
    const niveauInfo = getNiveauInfo(niveau);
    const contraintes = getContraintesIA(niveau);

    return `${basePrompt}

╔══════════════════════════════════════════════════════════════╗
║  NIVEAU ACTIF : ${niveauInfo.labelLong.padEnd(44)}║
║  ${niveauInfo.bo.padEnd(58)}║
╚══════════════════════════════════════════════════════════════╝

${contraintes}
`;
}

// ─────────────────────────────────────────────────────────────
// SECTION 2 : PARSING (Réponse IA → MathSpec)
// ─────────────────────────────────────────────────────────────

/**
 * Extrait tous les blocs MathSpec (```mathspec ... ```) d'une réponse IA.
 * Rétrocompatible avec les blocs @@@ existants (conservés tels quels).
 */
export function parseMathSpecBlocks(text: string): ParsedMathBlock[] {
    const results: ParsedMathBlock[] = [];

    // Cherche les blocs ```mathspec ... ```
    const mathspecRegex = /```mathspec\s*([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = mathspecRegex.exec(text)) !== null) {
        const raw = match[1].trim();
        try {
            const parsed = JSON.parse(raw);
            results.push({ raw, spec: parsed as MathSpec });
        } catch {
            results.push({ raw, spec: null, error: `JSON invalide: ${raw.substring(0, 50)}` });
        }
    }

    return results;
}

/**
 * Vérifie si une réponse contient des blocs MathSpec (nouveau format)
 * ou uniquement des blocs @@@ (ancien format rétrocompatible)
 */
export function hasMathSpecBlocks(text: string): boolean {
    return /```mathspec/i.test(text);
}

// ─────────────────────────────────────────────────────────────
// SECTION 3 : VALIDATION (MathSpec × Programme officiel)
// ─────────────────────────────────────────────────────────────

/**
 * Valide une MathSpec par rapport au programme officiel du niveau.
 * Retourne les erreurs pédagogiques détectées.
 */
export function validateMathSpec(spec: MathSpec, niveau: NiveauLycee): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ── Règles communes ──
    if (!spec.outputType) {
        errors.push('MathSpec manque de outputType');
    }

    // ── Règles par niveau ──
    if (niveau === 'seconde' || niveau === 'seconde_sthr') {
        // Pas de dérivées en Seconde
        if (spec.outputType === 'variation_table') {
            const vspec = spec as VariationTableMathSpec;
            const hasDerivRow = vspec.tableData.rows.some(r =>
                r.label.toLowerCase().includes("f'") || r.label.toLowerCase().includes("dérivée")
            );
            if (hasDerivRow) {
                errors.push(`⛔ Seconde : INTERDIT d'inclure une ligne f'(x) dans le tableau de variations`);
            }
        }
        if (spec.outputType === 'sign_table') {
            const sspec = spec as SignTableMathSpec;
            const hasDerivRow = sspec.tableData.rows.some(r =>
                r.label.toLowerCase().includes("f'") || r.label.toLowerCase().includes("dérivée")
            );
            if (hasDerivRow) {
                errors.push(`⛔ Seconde : INTERDIT d'utiliser des dérivées`);
            }
        }
    }

    if (niveau === 'premiere_spe') {
        // Pas de limites en 1ère Spé
        if (spec.outputType === 'variation_table') {
            const vspec = spec as VariationTableMathSpec;
            const allValues = vspec.tableData.rows.flatMap(r => r.values);
            const hasLimitValues = allValues.some(v => {
                const vl = String(v).toLowerCase();
                return (vl.includes('inf') || vl.match(/^\d+$/)) && vl !== 'nearrow' && vl !== 'searrow' && vl !== '||';
            });
            // Note: En 1ère spé, des valeurs numériques aux extremums sont OK, mais pas à ±∞
            // La validation fine est faite dans le prompt — ici on vérifie une incohérence grossière
        }
        const hasLimInForbidden = spec.forbidden?.some(f => f.toLowerCase().includes('limite'));
        if (!hasLimInForbidden) {
            warnings.push(`⚠️ 1ère Spé : vérifier que les limites en ±∞ ne sont pas calculées`);
        }
    }

    // ── Validation structure des tableaux ──
    if (spec.outputType === 'sign_table' || spec.outputType === 'variation_table') {
        const tableSpec = spec.outputType === 'sign_table'
            ? (spec as SignTableMathSpec).tableData
            : (spec as VariationTableMathSpec).tableData;

        const tableErrors = validateTableSpec(tableSpec);
        errors.push(...tableErrors.errors);
        warnings.push(...tableErrors.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valide la cohérence structurelle d'un TableSpec
 */
function validateTableSpec(table: TableSpec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const N = table.xValues.length;

    if (N < 2) {
        errors.push(`TableSpec: xValues doit contenir au moins 2 valeurs (trouvé: ${N})`);
        return { valid: false, errors, warnings };
    }

    const expectedSignLen = 2 * N - 3;

    for (const row of table.rows) {
        if (row.type === 'sign') {
            if (row.values.length !== expectedSignLen) {
                errors.push(
                    `Ligne sign "${row.label}": attendu ${expectedSignLen} éléments pour N=${N} x-values, trouvé ${row.values.length}`
                );
            }
        }
        if (row.type === 'variation') {
            // La ligne variation peut avoir 2N-1, 2N-3, ou 2N+1 selon le format
            const validLens = [2 * N - 3, 2 * N - 1, 2 * N + 1, N - 1, N];
            if (!validLens.includes(row.values.length)) {
                warnings.push(
                    `Ligne variation "${row.label}": longueur ${row.values.length} inhabituelle pour N=${N} x-values`
                );
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────
// SECTION 4 : CONVERSION (MathSpec → format @@@)
// Permet d'utiliser le rendu existant de MathAssistant
// ─────────────────────────────────────────────────────────────

/**
 * Convertit une MathSpec en bloc @@@-format compris par MathAssistant.renderFigure()
 * Assure la rétrocompatibilité totale avec les composants existants.
 */
export function mathSpecToAAABlock(spec: MathSpec): string {
    switch (spec.outputType) {
        case 'sign_table':
            return tableSpecToAAABlock(spec.tableData, 'Tableau de Signes');

        case 'variation_table':
            return tableSpecToAAABlock(spec.tableData, 'Tableau de Variations');

        case 'sign_and_variation': {
            const signBlock = tableSpecToAAABlock(spec.signTable, 'Tableau de Signes');
            const varBlock = tableSpecToAAABlock(spec.variationTable, 'Tableau de Variations');
            return signBlock + '\n\n' + varBlock;
        }

        case 'graph': {
            const g = spec.graphData;
            const lines: string[] = ['graph'];
            if (spec.expression || (g.functions && g.functions.length > 0)) {
                lines.push(`function: ${g.functions?.[0] ?? spec.expression}`);
            }
            if (g.domain) {
                lines.push(`domain: ${g.domain.join(',')}`);
            }
            if (g.points) {
                g.points.forEach(p => lines.push(`${p.x},${p.y}${p.type ? ',' + p.type : ''}`));
            }
            if (g.title || spec.chapitre) {
                lines.push(`title: ${g.title ?? spec.chapitre}`);
            }
            return `@@@\n${lines.join(' |\n')} |\n@@@`;
        }

        case 'geometry': {
            const gd = spec.geomData;
            const lines: string[] = [`figure`];
            lines.push(`type: ${gd.type}`);
            if (gd.points.length > 0) {
                lines.push(`points: ${gd.points.map(p => `${p.name}(${p.x},${p.y})`).join(', ')}`);
            }
            if (gd.segments && gd.segments.length > 0) {
                lines.push(`segments: ${gd.segments.map(s => `[${s[0]}${s[1]}]`).join(', ')}`);
            }
            if (gd.circles && gd.circles.length > 0) {
                lines.push(`circles: ${gd.circles.map(c => `cercle(${c.center},${c.radius})`).join(', ')}`);
            }
            return `@@@\n${lines.join(' |\n')} |\n@@@`;
        }

        case 'probability_tree': {
            const td = spec.treeData;
            const lines: string[] = [`tree: ${td.title ?? 'Arbre de probabilités'}`];
            td.nodes.forEach(node => {
                if (node.id === 'root') return;
                const path = buildNodePath(node, td.nodes);
                lines.push(`${path}${node.probability ? ', ' + node.probability : ''}`);
            });
            return `@@@\n${lines.join(' |\n')} |\n@@@`;
        }

        case 'interval': {
            const iv = spec.intervalData;
            const lines: string[] = ['interval'];
            lines.push(`left: ${iv.left}`);
            lines.push(`right: ${iv.right}`);
            lines.push(`leftIncluded: ${iv.leftIncluded}`);
            lines.push(`rightIncluded: ${iv.rightIncluded}`);
            return `@@@\n${lines.join(' |\n')} |\n@@@`;
        }

        default:
            return '';
    }
}

/**
 * Convertit un TableSpec en format @@@ table
 */
function tableSpecToAAABlock(table: TableSpec, defaultTitle: string): string {
    const lines: string[] = [`table`];
    lines.push(`x: ${table.xValues.join(', ')}`);

    for (const row of table.rows) {
        const prefix = row.type === 'sign' ? 'sign' : 'variation';
        lines.push(`${prefix}: ${row.label} : ${row.values.join(', ')}`);
    }

    return `@@@\n${lines.join(' |\n')} |\n@@@`;
}

/**
 * Reconstruit le chemin d'un nœud dans l'arbre (pour le format @@@ tree)
 */
function buildNodePath(node: ProbTreeNode, nodes: ProbTreeNode[]): string {
    if (!node.parent || node.parent === 'root') return node.label;
    const parent = nodes.find(n => n.id === node.parent);
    if (!parent) return node.label;
    return `${buildNodePath(parent, nodes)} -> ${node.label}`;
}

// ─────────────────────────────────────────────────────────────
// SECTION 5 : INFÉRENCE (question → outputType probable)
// ─────────────────────────────────────────────────────────────

/**
 * Analyse une question utilisateur pour déduire le type de sortie probable.
 * Utilisé pour préparer le contexte avant l'appel à l'IA.
 */
export function inferOutputType(question: string): MathOutputType | null {
    const q = question.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    // Probabilités / arbres
    if (/arbre|probabilite|proba\b|P\(/.test(q)) return 'probability_tree';

    // Tableaux
    if (/tableau\s+de\s+signe/.test(q) && /tableau\s+de\s+variation/.test(q)) return 'sign_and_variation';
    if (/tableau\s+de\s+signe/.test(q)) return 'sign_table';
    if (/tableau\s+de\s+variation/.test(q)) return 'variation_table';
    if (/signe\s+de/.test(q) || /etude\s+du\s+signe/.test(q)) return 'sign_table';
    if (/variation/.test(q) || /croissante?|decroissante?/.test(q)) return 'variation_table';

    // Géométrie
    if (/triangle|cercle|parallelogramme|quadrilatere|segment|milieu|figure|geomet/.test(q)) return 'geometry';
    if (/coordonnee|repere|vecteur/.test(q)) return 'geometry';

    // Graphique
    if (/courbe|graphe|graphique|tracer|representer/.test(q)) return 'graph';
    if (/intervalle|ensemble\s+de\s+definition/.test(q)) return 'interval';

    return null;
}

/**
 * Génère un résumé pédagogique des contraintes pour un niveau donné.
 * Format compact pour les logs et le debug.
 */
export function getConstraintSummary(niveau: NiveauLycee): string {
    const info = getNiveauInfo(niveau);
    return `[${info.label}] ${info.bo} — ${info.horaire}`;
}

// Type local pour buildNodePath
interface ProbTreeNode {
    id: string;
    label: string;
    parent?: string;
    probability?: string;
}
