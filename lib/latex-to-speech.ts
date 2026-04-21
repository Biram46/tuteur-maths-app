/**
 * Convertit un texte Markdown + LaTeX en français parlé pour la synthèse vocale.
 * Supprime les balises Markdown, convertit les formules en expressions orales françaises.
 */

export function latexToSpeech(input: string): string {
    let text = input;

    // ── 1. Supprimer les blocs @@@ (tableaux, figures, graphes) ──────────────
    text = text.replace(/^@@@[\s\S]*?^@@@/gm, '');
    text = text.replace(/@@@[^\n]*/g, '');

    // ── 2. Supprimer les blocs $$ (display math) → traiter le contenu ────────
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => ' ' + convertMath(inner.trim()) + ' ');

    // ── 3. Supprimer les blocs $ (inline math) → traiter le contenu ──────────
    text = text.replace(/\$([^$\n]+)\$/g, (_m, inner) => ' ' + convertMath(inner.trim()) + ' ');

    // ── 4. Supprimer le Markdown ─────────────────────────────────────────────
    text = text
        .replace(/#{1,6}\s+/g, '')           // titres
        .replace(/\*\*([^*]+)\*\*/g, '$1')   // gras
        .replace(/\*\*/g, '')               // ** résiduels non appariés
        .replace(/\*([^*]+)\*/g, '$1')       // italique
        .replace(/(?<![a-z0-9])\*(?![a-z0-9*])/gi, '') // * isolés résiduels
        .replace(/`[^`]+`/g, '')             // code inline
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // liens
        .replace(/^[-*+]\s+/gm, '')          // listes
        .replace(/^\d+\.\s+/gm, '')          // listes numérotées
        .replace(/^>\s+/gm, '')              // citations
        .replace(/---+/g, '')                // séparateurs
        .replace(/\|[^\n]+\|/g, '')          // tableaux markdown
        .replace(/⛔|✅|⚠️|❌|👉/g, '');    // emojis techniques

    // ── 5. Nettoyage final ───────────────────────────────────────────────────
    text = text
        .replace(/\{([^}]*)\}/g, '$1') // accolades résiduelles (ex : S = {-2 ; 1/2})
        .replace(/[{}]/g, '')          // accolades orphelines
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

    return text;
}

/**
 * Convertit une expression LaTeX en français parlé.
 */
function convertMath(expr: string): string {
    let s = expr.trim();

    // Fractions
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_m, num, den) =>
        convertMath(num) + ' sur ' + convertMath(den));
    s = s.replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, (_m, num, den) =>
        convertMath(num) + ' sur ' + convertMath(den));

    // Racines
    s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, (_m, n, inner) =>
        'racine ' + convertMath(n) + ' ième de ' + convertMath(inner));
    s = s.replace(/\\sqrt\{([^}]+)\}/g, (_m, inner) =>
        'racine carrée de ' + convertMath(inner));
    s = s.replace(/\\sqrt\s+(\S+)/g, (_m, inner) =>
        'racine carrée de ' + convertMath(inner));

    // Puissances courantes
    s = s.replace(/\^2/g, ' au carré');
    s = s.replace(/\^3/g, ' au cube');
    s = s.replace(/\^\{([^}]+)\}/g, (_m, exp) => ' puissance ' + convertMath(exp));
    s = s.replace(/\^(\S)/g, (_m, exp) => ' puissance ' + exp);

    // Indices
    s = s.replace(/_\{([^}]+)\}/g, (_m, idx) => ' indice ' + convertMath(idx));
    s = s.replace(/_(\S)/g, (_m, idx) => ' indice ' + idx);

    // Dérivées f'(x), f''(x)
    s = s.replace(/f''\s*\(([^)]+)\)/g, 'f seconde de $1');
    s = s.replace(/f'\s*\(([^)]+)\)/g, 'f prime de $1');

    // Limites
    s = s.replace(/\\lim_\{([^}]+)\}/g, (_m, sub) => 'limite quand ' + convertSub(sub));
    s = s.replace(/\\lim/g, 'limite');

    // Intégrales
    s = s.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, (_m, a, b) =>
        'intégrale de ' + convertMath(a) + ' à ' + convertMath(b) + ' de');
    s = s.replace(/\\int/g, 'intégrale de');

    // Sommes et produits
    s = s.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, 'somme de');
    s = s.replace(/\\sum/g, 'somme');
    s = s.replace(/\\prod/g, 'produit');

    // Ensembles
    s = s.replace(/\\mathbb\{R\}/g, 'l\'ensemble des réels');
    s = s.replace(/\\mathbb\{N\}/g, 'l\'ensemble des entiers naturels');
    s = s.replace(/\\mathbb\{Z\}/g, 'l\'ensemble des entiers relatifs');
    s = s.replace(/\\mathbb\{Q\}/g, 'l\'ensemble des rationnels');
    s = s.replace(/\\mathbb\{C\}/g, 'l\'ensemble des complexes');
    s = s.replace(/\\emptyset|\\varnothing/g, 'l\'ensemble vide');

    // Intervalles français ] [ → lire naturellement
    s = s.replace(/\]\s*-\\infty\s*;/g, 'moins l\'infini jusqu\'à');
    s = s.replace(/;\s*\+?\\infty\s*\[/g, 'jusqu\'à plus l\'infini');
    s = s.replace(/;\s*-?\\infty\s*\[/g, 'jusqu\'à moins l\'infini');
    s = s.replace(/\]\s*([^;]+)\s*;/g, (_m, a) => 'ouvert en ' + convertMath(a) + ' jusqu\'à');
    s = s.replace(/;\s*([^\[]+)\s*\[/g, (_m, b) => convertMath(b) + ' ouvert');
    s = s.replace(/\[\s*([^;]+)\s*;/g, (_m, a) => 'fermé en ' + convertMath(a) + ' jusqu\'à');
    s = s.replace(/;\s*([^\]]+)\s*\]/g, (_m, b) => convertMath(b) + ' fermé');

    // Flèches et relations
    s = s.replace(/\\Leftrightarrow|\\iff/g, 'si et seulement si');
    s = s.replace(/\\Rightarrow|\\implies/g, 'implique');
    s = s.replace(/\\rightarrow|\\to/g, 'tend vers');
    s = s.replace(/\\leftarrow/g, 'vient de');
    s = s.replace(/\\approx/g, 'environ');
    s = s.replace(/\\neq/g, 'différent de');
    s = s.replace(/\\leq|\\le/g, 'inférieur ou égal à');
    s = s.replace(/\\geq|\\ge/g, 'supérieur ou égal à');
    s = s.replace(/\\equiv/g, 'équivalent à');
    s = s.replace(/\\sim/g, 'semblable à');
    s = s.replace(/\\subset/g, 'inclus dans');
    s = s.replace(/\\in\b/g, 'appartient à');
    s = s.replace(/\\notin/g, 'n\'appartient pas à');
    s = s.replace(/\\cup/g, 'union');
    s = s.replace(/\\cap/g, 'intersection');

    // Opérateurs
    s = s.replace(/\\times/g, 'fois');
    s = s.replace(/\\cdot/g, 'fois');
    s = s.replace(/\\div/g, 'divisé par');
    s = s.replace(/\\pm/g, 'plus ou moins');
    s = s.replace(/\\mp/g, 'moins ou plus');

    // Lettres grecques
    s = s.replace(/\\Delta/g, 'delta');
    s = s.replace(/\\delta/g, 'delta');
    s = s.replace(/\\alpha/g, 'alpha');
    s = s.replace(/\\beta/g, 'bêta');
    s = s.replace(/\\gamma/g, 'gamma');
    s = s.replace(/\\Gamma/g, 'gamma');
    s = s.replace(/\\lambda/g, 'lambda');
    s = s.replace(/\\Lambda/g, 'lambda');
    s = s.replace(/\\mu/g, 'mu');
    s = s.replace(/\\nu/g, 'nu');
    s = s.replace(/\\pi/g, 'pi');
    s = s.replace(/\\Pi/g, 'pi');
    s = s.replace(/\\sigma/g, 'sigma');
    s = s.replace(/\\Sigma/g, 'sigma');
    s = s.replace(/\\theta/g, 'thêta');
    s = s.replace(/\\Theta/g, 'thêta');
    s = s.replace(/\\omega/g, 'oméga');
    s = s.replace(/\\Omega/g, 'oméga');
    s = s.replace(/\\phi/g, 'phi');
    s = s.replace(/\\Phi/g, 'phi');
    s = s.replace(/\\epsilon|\\varepsilon/g, 'epsilon');
    s = s.replace(/\\rho/g, 'rho');
    s = s.replace(/\\tau/g, 'tau');
    s = s.replace(/\\chi/g, 'chi');
    s = s.replace(/\\psi/g, 'psi');
    s = s.replace(/\\Psi/g, 'psi');
    s = s.replace(/\\xi/g, 'xi');
    s = s.replace(/\\eta/g, 'êta');
    s = s.replace(/\\kappa/g, 'kappa');

    // Constantes et fonctions
    s = s.replace(/\\infty/g, 'l\'infini');
    s = s.replace(/\+\\infty|\+infty/g, 'plus l\'infini');
    s = s.replace(/-\\infty|-infty/g, 'moins l\'infini');
    s = s.replace(/\\log/g, 'logarithme');
    s = s.replace(/\\ln/g, 'logarithme népérien');
    s = s.replace(/\\exp/g, 'exponentielle');
    s = s.replace(/\\sin/g, 'sinus');
    s = s.replace(/\\cos/g, 'cosinus');
    s = s.replace(/\\tan/g, 'tangente');
    s = s.replace(/\\arcsin/g, 'arc sinus');
    s = s.replace(/\\arccos/g, 'arc cosinus');
    s = s.replace(/\\arctan/g, 'arc tangente');
    s = s.replace(/\\max/g, 'maximum');
    s = s.replace(/\\min/g, 'minimum');
    s = s.replace(/\\gcd/g, 'pgcd');

    // Vecteurs et accents
    s = s.replace(/\\overrightarrow\{([^}]+)\}/g, 'vecteur $1');
    s = s.replace(/\\vec\{([^}]+)\}/g, 'vecteur $1');
    s = s.replace(/\\overline\{([^}]+)\}/g, '$1 barre');
    s = s.replace(/\\hat\{([^}]+)\}/g, '$1 chapeau');
    s = s.replace(/\\mathcal\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
    s = s.replace(/\\text\{([^}]+)\}/g, '$1');

    // Accolades et parenthèses LaTeX
    s = s.replace(/\\left\s*[\(\[]/g, '');
    s = s.replace(/\\right\s*[\)\]]/g, '');
    s = s.replace(/\\left\s*\{/g, '');
    s = s.replace(/\\right\s*\}/g, '');
    s = s.replace(/\\left\s*\|/g, 'valeur absolue de');
    s = s.replace(/\\right\s*\|/g, '');
    s = s.replace(/\{|\}/g, '');

    // Backslashes restants
    s = s.replace(/\\\\/g, '');
    s = s.replace(/\\/g, '');

    // Multiplication implicite : 2x → deux x, 3x → trois x
    s = s.replace(/(\d)\s*\*/g, '$1 fois ');
    s = s.replace(/\*/g, ' fois ');

    // Nettoyage
    s = s.replace(/\s{2,}/g, ' ').trim();

    return s;
}

function convertSub(sub: string): string {
    return sub
        .replace(/x\\to\s*([+-]?\\infty|\d+)/g, (_m, v) => 'x tend vers ' + convertMath(v))
        .replace(/x\\rightarrow\s*([+-]?\\infty|\d+)/g, (_m, v) => 'x tend vers ' + convertMath(v))
        .replace(/\\infty/g, 'l\'infini')
        .replace(/\+\\infty/g, 'plus l\'infini')
        .replace(/-\\infty/g, 'moins l\'infini');
}
