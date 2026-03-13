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
    fixed = fixed.replace(/\\\\(text|mathrm|vec|infty|bar|frac|sqrt|Omega|alpha|beta|gamma|delta|sigma|mu|lambda|pi|left|right|leq|geq|neq|times|cdot|pm|mp)/g, '\\$1');

    // 5. \begin{aligned} et \begin{array} sans délimiteurs $$ → on les encadre
    // L'IA envoie parfois \begin{aligned}...\end{aligned} sans $$ autour
    fixed = fixed.replace(/(?<!\$)\s*(\\begin\{(?:aligned|array|cases|pmatrix|bmatrix)\}[\s\S]*?\\end\{(?:aligned|array|cases|pmatrix|bmatrix)\})\s*(?!\$)/g, '\n$$\n$1\n$$\n');

    // 6. Fix espace parasite juste après le $ ouvrant
    // remark-math refuse "$ expr" → on retire l'espace seulement après un $ OUVRANT
    // Un $ ouvrant est précédé d'un espace, d'un saut de ligne ou d'un début de chaîne
    // (pas d'un caractère alphanumérique comme dans "expr$")
    fixed = fixed.replace(/((?:^|[\s([{,;]))\$ (?=[^\s$])/gm, '$1$');

    // 7. Harmonisation des symboles DANS les blocs $...$ (inline uniquement)
    // Utilise [^$\n]+ pour ne pas traverser les fins de ligne ni d'autres blocs
    fixed = fixed.replace(/\$([^$\n]+)\$/g, (_match, inner) => {
        const fixedInner = inner
            .replace(/<=/g, '\\leq ')
            .replace(/>=/g, '\\geq ')
            .replace(/!=/g, '\\neq ');
        return '$' + fixedInner + '$';
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

