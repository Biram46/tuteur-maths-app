/**
 * 🔧 CORRECTEUR AUTOMATIQUE LaTeX pour mimimaths@i
 * Version 5.0 - Ultra Simplifiée pour éviter les bugs
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

    // 2. Conversion sécurisée des délimiteurs
    // \[ ... \] -> $$ ... $$
    // \( ... \) -> $ ... $
    fixed = fixed.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
    fixed = fixed.replace(/\\\(/g, '$').replace(/\\\)/g, '$');

    // 3. Correction des commandes LaTeX courantes (accolades forcées pour \vec et \overline)
    // Supporte \vec u -> \vec{u} et \vec CD -> \vec{CD}
    fixed = fixed.replace(/\\vec\s+?([a-zA-Z0-9]{1,2})/g, '\\vec{$1}');
    fixed = fixed.replace(/\\overrightarrow\s+?([a-zA-Z0-9]{1,2})/g, '\\overrightarrow{$1}');
    fixed = fixed.replace(/\\overline\s+?([a-zA-Z0-9]{1,2})/g, '\\overline{$1}');

    // 4. Protection contre les doubles backslashes excessifs
    fixed = fixed.replace(/\\\\(text|mathrm|vec|infty|bar|frac|sqrt|Omega|alpha|beta|gamma|delta|sigma|mu|lambda|pi)/g, '\\$1');

    // 5. Harmonisation des symboles de comparaison
    fixed = fixed.replace(/<=/g, '\\leq ').replace(/>=/g, '\\geq ').replace(/!=/g, '\\neq ');

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
