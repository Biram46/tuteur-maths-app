/**
 * math-text-utils.ts
 * Fonctions pures de transformation de texte mathématique.
 * Extraites de useMathRouter.ts pour réduire sa taille.
 * Aucune dépendance React. Importables côté serveur et client.
 */

// ─── Constantes ────────────────────────────────────────────────────────────

export const GRAPH_COLORS = ['#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'] as const;

// ─── Conversion texte → mathématiques ──────────────────────────────────────

/**
 * Supprime les délimiteurs LaTeX et convertit les notations LaTeX courantes
 * en notation mathématique ASCII (pour les extracteurs d'expression).
 */
export function deLatexInput(s: string): string {
    return s
        // Supprimer les délimiteurs LaTeX
        .replace(/\\\[|\\\]/g, '')
        .replace(/\\\(|\\\)/g, '')
        .replace(/\$\$/g, '').replace(/\$/g, '')
        // \frac{a}{b} → (a)/(b)
        .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
        .replace(/\\dfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
        .replace(/\\tfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
        // \sqrt{a} → sqrt(a)
        .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
        .replace(/\\sqrt\s*([a-zA-Z0-9])/g, 'sqrt($1)')
        // Inégalités et symboles
        .replace(/\\ge(q)?\b/g, '>=')
        .replace(/\\le(q)?\b/g, '<=')
        .replace(/\\ne(q)?\b/g, '!=')
        .replace(/\\pi\b/g, 'pi')
        .replace(/\\infty\b/g, 'Infinity')
        .replace(/\\to\b/g, '->')
        // Vecteurs : garder le nom avant de supprimer les accolades
        .replace(/\\vec\s*\{([^{}]+)\}/g, 'vecteur $1')
        .replace(/\\overrightarrow\s*\{([^{}]+)\}/g, 'vecteur $1')
        .replace(/\\vec\s*([a-zA-Z0-9]{1,2})/g, 'vecteur $1')
        .replace(/\\overrightarrow\s*([a-zA-Z0-9]{1,2})/g, 'vecteur $1')
        // Accolades → parenthèses
        .replace(/\{/g, '(').replace(/\}/g, ')')
        // \cdot, \times → *
        .replace(/\\cdot\b/g, '*').replace(/\\times\b/g, '*')
        // \left, \right → supprimé
        .replace(/\\left\b/g, '').replace(/\\right\b/g, '')
        // Fonctions standard
        .replace(/\\(ln|log|exp|sin|cos|tan|arcsin|arccos|arctan)\b/g, '$1')
        // Commandes résiduelles → supprimées
        .replace(/\\[a-zA-Z]+/g, '')
        .trim();
}

/**
 * Nettoie une expression mathématique (LaTeX, unicode, français) vers
 * la notation mathjs pure. Utilisé dans le mode exercice multi-questions.
 */
export function cleanMathExpr(e: string): string {
    let t = e;
    t = t.replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '');
    t = t.replace(/\s*(?:>|<|>=|<=|=|≥|≤)\s*.*$/, '');
    t = t.replace(/\$/g, '').replace(/\\\\/g, '');
    t = t.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4');
    t = t.replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/');
    for (let pass = 0; pass < 3; pass++) {
        t = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    }
    t = t.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^}]*)\}/g, '$1rt($2)');
    t = t.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
    t = t.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
    t = t.replace(/\\left/g, '').replace(/\\right/g, '');
    t = t.replace(/\\infty/g, 'Infinity');
    t = t.replace(/\\pi/g, 'pi');
    t = t.replace(/\{/g, '(').replace(/\}/g, ')');
    t = t.replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)');
    t = t.replace(/\\?ln\s*\(/gi, 'log(');
    t = t.replace(/\\?log\s*\(/gi, 'log(');
    t = t.replace(/\\[a-zA-Z]+/g, '');
    t = t.replace(/(\d)([a-zA-Z])/g, '$1*$2');
    t = t.replace(/(\d)\(/g, '$1*(');
    t = t.replace(/\)(\w)/g, ')*$1');
    t = t.replace(/\)\(/g, ')*(');
    t = t.replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '');
    t = t.replace(/\s+(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\s+.*$/i, '');
    return t.replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '').trim();
}

/**
 * Nettoie une expression pour le moteur graphique D3 (mathjs).
 * Variante de cleanMathExpr orientée graphique.
 */
export function cleanExprForGraph(e: string): string {
    let c = e
        .replace(/\$/g, '')
        .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
        .replace(/^\s*y\s*=\s*/i, '')
        .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
        .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
        .replace(/\\sqrt\s+(\w+)/g, 'sqrt($1)')
        .replace(/\\left\s*[([]/g, '(').replace(/\\right\s*[)\]]/g, ')')
        .replace(/\\cdot/g, '*').replace(/\\times/g, '*')
        .replace(/\\text\s*\{([^}]*)\}/g, '$1')
        .replace(/\\[,;:!]\s*/g, ' ')
        .replace(/\\quad/g, ' ').replace(/\\qquad/g, ' ')
        .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
        .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/')
        .replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2')
        .replace(/([xX])\s*([a-zA-Z(])/g, '$1*$2')
        .replace(/\)\s*([a-zA-Z(])/g, ')*$1')
        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?\(([^)]+)\)/gi, 'sqrt($1)')
        .replace(/\bracine\s*(?:carr[eé]e?\s*)?(?:de\s+)?(\w+)/gi, 'sqrt($1)')
        .replace(/\|([^|]+)\|/g, 'abs($1)')
        .replace(/\bln\s*\(/g, 'log(')
        .replace(/\bexp\s*\(/g, 'e^(')
        .replace(/\s+$/g, '').replace(/[.!?]+$/g, '')
        .trim();
    return c;
}

// ─── Formatage pour l'affichage ────────────────────────────────────────────

/**
 * Convertit une expression mathjs en notation lisible pour l'affichage
 * (√, ln, ², ×, π...).
 */
export function prettifyMath(expr: string): string {
    return expr
        .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
        .replace(/\bsqrt\b/g, '√')
        .replace(/\blog\(/g, 'ln(')
        .replace(/\^2(?![0-9])/g, '²')
        .replace(/\^3(?![0-9])/g, '³')
        .replace(/\^4(?![0-9])/g, '⁴')
        .replace(/\*/g, '×')
        .replace(/\bpi\b/g, 'π')
        .replace(/([^\s])([+\-])/g, '$1 $2')
        .replace(/([+\-])([^\s])/g, '$1 $2')
        .replace(/\s+/g, ' ').trim();
}

/**
 * Version plus simple de prettifyMath pour les exercices multi-questions.
 */
export function prettifyExpr(ex: string): string {
    return ex
        .replace(/\bsqrt\(([^)]+)\)/g, '√($1)')
        .replace(/\blog\(/g, 'ln(')
        .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
        .replace(/\*/g, '×').replace(/\bpi\b/g, 'π');
}

// ─── Nettoyage du texte IA ─────────────────────────────────────────────────

/**
 * Supprime la notation de Leibniz (d/dx) qui est hors programme lycée
 * et la remplace par la notation de Lagrange (f'(x)).
 * SÉCURISÉE : ne touche pas au LaTeX normal (\frac{a}{b}, etc.).
 */
export function stripDdx(t: string): string {
    return t
        .replace(/\bd\(([^)]+)\)\/dx\b/gi, "($1)'")
        .replace(/\bdf\/dx\b/gi, "f'(x)")
        .replace(/\bd\/dx\b/gi, '')
        .replace(/\bd[²2]f?\/dx[²2]/gi, "f''(x)");
}

/**
 * Convertit les tableaux Markdown (| x | ... |) générés par l'IA en blocs
 * @@@table si aucun bloc @@@ n'existe déjà dans le contenu.
 * Garde-fou contre le non-déterminisme de l'IA.
 */
export function patchMarkdownTables(content: string): string {
    if (content.includes('@@@')) return content;
    const mdTableRegex = /(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)+)/g;
    const matches = content.match(mdTableRegex);
    if (!matches) return content;
    let patched = content;
    for (const match of matches) {
        try {
            const lines = match.trim().split('\n').filter((l: string) => l.trim());
            if (lines.length < 3) continue;
            const headers = lines[0].split('|').map((h: string) => h.trim()).filter((h: string) => h.length > 0);
            const dataLines = lines.slice(2);
            if (!headers[0]) continue;
            if (headers[0].toLowerCase() === 'x') {
                const xValues = headers.slice(1).map((v: string) =>
                    v.replace(/-\s*\\?inft?y?|-?\s*infini?/gi, '-inf')
                     .replace(/\+?\s*\\?inft?y?|\+?\s*infini?/gi, '+inf')
                ).join(', ');
                let tableBlock = `table |\nx: ${xValues} |\n`;
                for (const dl of dataLines) {
                    const protectedDl = dl.replace(/\|\|/g, '___DOUBLE_BAR___');
                    const cells = protectedDl.split('|')
                        .map((c: string) => c.trim().replace(/___DOUBLE_BAR___/g, '||'))
                        .filter((c: string) => c.length > 0);
                    if (cells.length < 2) continue;
                    const label = cells[0];
                    const values = cells.slice(1).map((v: string) =>
                        v.replace(/-\s*\\?inft?y?|-?\s*infini?/gi, '-inf')
                         .replace(/\+?\s*\\?inft?y?|\+?\s*infini?/gi, '+inf')
                         .replace(/↗|\\nearrow\b|\bcroissante?\b|\bmonte\b/gi, 'nearrow')
                         .replace(/↘|\\searrow\b|\bd[eé]croissante?\b|\bdescend\b/gi, 'searrow')
                    ).join(', ');
                    const isVariation = /nearrow|searrow/.test(values)
                        || /(croissante|décroissante|variation)/i.test(label)
                        || /^f\s*\(\s*x\s*\)$/i.test(label);
                    tableBlock += `${isVariation ? 'var' : 'sign'}: ${label} : ${values} |\n`;
                }
                patched = patched.replace(match, `@@@\n${tableBlock}@@@`);
            }
        } catch (e) {
            console.warn('[patchMarkdownTables]', e);
        }
    }
    return patched;
}
