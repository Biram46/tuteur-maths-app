/**
 * 🔧 CORRECTEUR AUTOMATIQUE LaTeX pour mimimaths@i
 * Version 6.0 — Corrige les délimiteurs LaTeX de l'IA pour KaTeX/ReactMarkdown
 * 
 * Problème résolu : l'IA (GPT-4o-mini, DeepSeek, etc.) envoie du LaTeX avec
 * les délimiteurs \( \) \[ \] mais ReactMarkdown + remark-math n'accepte que $ et $$.
 * Ce fixer convertit en temps réel pendant le streaming.
 */

export interface LatexFixerResult {
    content: string;
    fixes: string[];
}

export function fixLatexContent(content: string): LatexFixerResult {
    let fixed = content;
    const fixes: string[] = [];

    // 1. Unification des signes moins et espaces insécables
    fixed = fixed.replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');

    // 2. Conversion sécurisée des délimiteurs LaTeX
    // \[ ... \] -> $$ ... $$  (display math)
    // \( ... \) -> $ ... $    (inline math)
    // NOTE: En JS, dans .replace(), $$$$ produit $$ (car $$ = un $ littéral)
    fixed = fixed.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
    fixed = fixed.replace(/\\\(/g, '$').replace(/\\\)/g, '$');

    // 3. Correction des commandes LaTeX courantes (accolades forcées pour \vec et \overline)
    // Supporte \vec u -> \vec{u} et \vec CD -> \vec{CD}
    fixed = fixed.replace(/\\vec\s+?([a-zA-Z0-9]{1,2})/g, '\\vec{$1}');
    fixed = fixed.replace(/\\overrightarrow\s+?([a-zA-Z0-9]{1,2})/g, '\\overrightarrow{$1}');
    fixed = fixed.replace(/\\overline\s+?([a-zA-Z0-9]{1,2})/g, '\\overline{$1}');

    // 4. Protection contre les doubles backslashes excessifs
    // \\frac -> \frac, \\sqrt -> \sqrt, etc.
    // Liste étendue à toutes les commandes LaTeX mathématiques du niveau lycée
    fixed = fixed.replace(/\\\\(text|mathrm|vec|infty|bar|frac|sqrt|Omega|omega|Alpha|alpha|beta|Beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|pi|Pi|rho|sigma|Sigma|tau|upsilon|Upsilon|phi|Phi|chi|psi|Psi|left|right|leq|geq|neq|times|cdot|pm|mp|div|circ|cap|cup|subset|supset|subseteq|supseteq|in|notin|forall|exists|to|Rightarrow|Leftrightarrow|rightarrow|leftarrow|mapsto|equiv|approx|sim|simeq|perp|parallel|angle|triangle|int|sum|prod|lim|log|ln|sin|cos|tan|arcsin|arccos|arctan|exp|max|min|sup|inf|det|gcd|deg|ker|dim|binom|pmatrix|bmatrix|vmatrix|mathbb|mathcal|mathbf|mathrm|text|operatorname|overrightarrow|overline|underline|widehat|widetilde|hat|tilde|dot|ddot|underbrace|overbrace|sqrt|frac|dfrac|tfrac|not|neg|land|lor|lnot|iff|implies|emptyset|varnothing|nabla|partial|hbar|ell|Re|Im|wp|infty)/g, '\\$1');

    // 4.5 Auto-encapsulation des commandes LaTeX nues (sans délimiteurs $)
    // L'IA écrit souvent \Delta, \frac{a}{b}, \sqrt{x} directement dans le texte
    // sans les entourer de $ ... $. Ce step les détecte et les encadre.
    // ⚠️ Ne s'applique QU'aux commandes qui ne sont PAS déjà dans un bloc $...$
    // Stratégie: remplacer ligne par ligne pour éviter les faux positifs inter-lignes.
    fixed = fixed.split('\n').map(line => {
        // Si la ligne contient déjà des $, on ne touche pas (déjà balisée)
        if (line.includes('$')) return line;
        // Encapsuler \frac{...}{...} et \dfrac{...}{...}
        line = line.replace(/\\d?frac\{[^}]*\}\{[^}]*\}/g, m => `$${m}$`);
        // Encapsuler \sqrt{...} ou \sqrt[n]{...}
        line = line.replace(/\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/g, m => `$${m}$`);
        // Encapsuler les lettres grecques majuscules isolées (\Delta, \Sigma, \Omega, etc.)
        // suivies d'un espace ou ponctuation
        line = line.replace(/\\(Delta|Sigma|Omega|Gamma|Lambda|Theta|Pi|Phi|Psi|Xi|Upsilon)(?=[\s,;.!?)]|$)/g, m => `$${m}$`);
        // Encapsuler \infty isolé
        line = line.replace(/\\infty(?=[\s,;.!?)]|$)/g, m => `$${m}$`);
        return line;
    }).join('\n');

    // 5. \begin{aligned} et \begin{array} sans délimiteurs $$ → on les encadre
    // L'IA envoie parfois \begin{aligned}...\end{aligned} sans $$ autour
    // ⚠️ Idempotent : callback vérifie que l'environnement n'est PAS déjà dans un $$
    fixed = fixed.replace(/(\\begin\{(?:aligned|array|cases|pmatrix|bmatrix)\}[\s\S]*?\\end\{(?:aligned|array|cases|pmatrix|bmatrix)\})/g, (matchEnv, _g1, offset, str) => {
        const ctxBefore = str.substring(Math.max(0, offset - 15), offset).replace(/\s+/g, '');
        const ctxAfter = str.substring(offset + matchEnv.length, offset + matchEnv.length + 15).replace(/\s+/g, '');
        if (ctxBefore.endsWith('$$') || ctxAfter.startsWith('$$')) return matchEnv;
        return '\n$$\n' + matchEnv + '\n$$\n';
    });

    // 6. Fix espace parasite juste après le $ ouvrant
    // remark-math refuse "$ expr" → on retire l'espace seulement après un $ OUVRANT
    // Un $ ouvrant est précédé d'un espace, d'un saut de ligne ou d'un début de chaîne
    // (pas d'un caractère alphanumérique comme dans "expr$")
    // ⚠️ On utilise un simple remplacement non-destructif : on cherche UNIQUEMENT
    // un $ précédé d'un non-alphanumérique ET suivi d'un espace PUIS d'un non-espace.
    // Cela évite de couper du texte comme "100$ de budget" ou "f$ =...".
    fixed = fixed.replace(/((?:^|[\s([{,;:]))\$\s(?=[^\s$\n])/gm, '$1$');

    // 7. Harmonisation des symboles DANS les blocs $...$ (inline uniquement)
    // Utilise [^$\n]+ pour ne pas traverser les fins de ligne ni d'autres blocs
    fixed = fixed.replace(/\$([^$\n]+)\$/g, (_match, inner) => {
        const fixedInner = inner
            .replace(/<=/g, '\\leq ')
            .replace(/>=/g, '\\geq ')
            .replace(/!=/g, '\\neq ');
        return '$' + fixedInner + '$';
    });

    // 8. Espaces manquants aux frontières TEXTE ↔ BLOC MATH inline
    // L'IA génère souvent "$f(x)$est" (pas d'espace après $) ou "texte$expr$" (pas avant)
    // On ajoute les espaces manquants en entourant chaque $...$ trouvé
    // sans toucher au contenu interne du bloc.
    // ⚠️ Ne traite que les $ inline (pas $$) grâce au lookbehind/ahead (?<!\$)/(?!\$)
    // ⚠️ CONSERVATION : on ne retire JAMAIS de caractères, on en AJOUTE uniquement
    fixed = fixed.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (match, _inner, offset, str) => {
        const before = offset > 0 ? str[offset - 1] : '';
        const after = str[offset + match.length] ?? '';
        let result = match;
        // Espace avant le $ ouvrant si précédé d'une lettre/chiffre/) sans espace
        if (/[a-zA-ZÀ-ÿ0-9)]/.test(before)) result = ' ' + result;
        // Espace après le $ fermant si suivi d'une lettre/chiffre/( sans espace
        if (/[a-zA-ZÀ-ÿ0-9(]/.test(after)) result = result + ' ';
        return result;
    });

    return {
        content: fixed,
        fixes
    };
}

export function fixLatexStreaming(chunk: string, buffer: string): string {
    return chunk
        .replace(/[\u2212\u2013\u2014]/g, '-')
        .replace(/\+infy/gi, '+\\infty')
        .replace(/-infy/gi, '-\\infty');
}

export function needsLatexFix(content: string): boolean {
    return content.includes('\\(') || content.includes('\\[') || content.includes('begin{array}');
}

