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

    // 0. Convertir **$...$** (gras + math) en $$...$$ pour eviter conflit remark-math
    fixed = fixed.replace(/\*\*\$(.+?)\$\*\*/g, (_match, inner) => '$$' + inner.trim() + '$$');

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
    // ⚠️ Ne s'applique QU'aux commandes qui ne sont PAS déjà dans un bloc $...$ ou $$...$$
    // Helper: vérifie si une position est DANS un bloc math ($...$ ou $$...$$)
    const isInsideMathBlock = (str: string, pos: number): boolean => {
        let insideInline = false;
        let insideDisplay = false;
        let i = 0;
        while (i < pos) {
            // Vérifier $$ (display math) en premier
            if (str[i] === '$' && str[i + 1] === '$') {
                insideDisplay = !insideDisplay;
                i += 2;
                continue;
            }
            // Vérifier $ inline
            if (str[i] === '$') {
                insideInline = !insideInline;
            }
            i++;
        }
        // On est dans un bloc math si l'un des deux est true
        return insideInline || insideDisplay;
    };

    // Encapsuler \frac{...}{...} et \dfrac{...}{...} (uniquement si hors d'un bloc $...$)
    // Version améliorée : gère les espaces et accolades simples (pas imbriquées)
    fixed = fixed.replace(/\\d?frac\s*\{[^}]*\}\s*\{[^}]*\}/g, (match, offset) => {
        const insideMath = isInsideMathBlock(fixed, offset as number);
        if (insideMath) {
            return match;  // Déjà dans un bloc $...$, on ne touche pas
        }
        return `$${match}$`;
    });
    // Version pour expressions plus complexes avec accolades imbriquées (comme \frac{e^{x}}{x})
    // On utilise une approche par comptage d'accolades
    const wrapFractionWithNestedBraces = (str: string): string => {
        let result = str;
        let i = 0;
        while (i < result.length) {
            const match = result.substring(i).match(/\\d?frac\s*\{/);
            if (!match) break;
            const fracStart = i + match.index!;
            if (isInsideMathBlock(result, fracStart)) {
                i = fracStart + match[0].length;
                continue;
            }
            // Trouver la première paire d'accolades
            let braceCount = 0;
            let j = fracStart + match[0].length - 1; // position du { ouvrant
            let firstBraceEnd = -1;
            while (j < result.length) {
                if (result[j] === '{') braceCount++;
                else if (result[j] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        firstBraceEnd = j;
                        break;
                    }
                }
                j++;
            }
            if (firstBraceEnd === -1) { i = fracStart + 1; continue; }
            // Trouver la deuxième paire d'accolades
            const secondBraceStart = result.substring(firstBraceEnd + 1).match(/\s*\{/);
            if (!secondBraceStart) { i = fracStart + 1; continue; }
            braceCount = 0;
            j = firstBraceEnd + 1 + secondBraceStart[0].length - 1;
            let secondBraceEnd = -1;
            while (j < result.length) {
                if (result[j] === '{') braceCount++;
                else if (result[j] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        secondBraceEnd = j;
                        break;
                    }
                }
                j++;
            }
            if (secondBraceEnd === -1) { i = fracStart + 1; continue; }
            // Extraire l'expression complète
            const fullMatch = result.substring(fracStart, secondBraceEnd + 1);
            result = result.substring(0, fracStart) + `$${fullMatch}$` + result.substring(secondBraceEnd + 1);
            i = fracStart + fullMatch.length + 2; // +2 pour les $ ajoutés
        }
        return result;
    };
    // Appliquer pour toute frac non encore entourée de $
    if (/(?<!\$)\\d?frac/.test(fixed)) {
        fixed = wrapFractionWithNestedBraces(fixed);
    }
    // Encapsuler \sqrt{...} ou \sqrt[n]{...}
    fixed = fixed.replace(/\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/g, (match, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        return `$${match}$`;
    });

    // 4.5.1 Encapsuler les formules complètes avec \Delta = ... (sans $) — AVANT les lettres grecques isolées
    // IMPORTANT: Cette règle DOIT s'exécuter AVANT la règle des lettres grecques isolées
    // Sinon \Delta serait encapsulé seul en $\Delta$ et la formule serait brisée
    // Si l'IA envoie "\Delta = 25 - 24" sans $, on encapsule toute la formule
    fixed = fixed.replace(/\\Delta\s*=\s*([^$\n]+?)(?=\s*$|\n|[,.;!?:](?:\s|$)|\s+[A-Za-zÀ-ÿ])/g, (match, expr, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        // Vérifier que l'expression n'est pas vide
        if (!expr || expr.trim().length === 0) return match;
        return `$\\Delta = ${expr.trim()}$`;
    });

    // 4.5.2 Encapsuler les lettres grecques majuscules isolées (\Delta, \Sigma, \Omega, etc.)
    // NOTE: \Delta = ... est déjà traité par la règle 4.5.1 ci-dessus
    fixed = fixed.replace(/\\(Delta|Sigma|Omega|Gamma|Lambda|Theta|Pi|Phi|Psi|Xi|Upsilon)(?=[\s,;.!?)]|$)/g, (match, _greek, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        return `$${match}$`;
    });
    // Encapsuler \infty isolé
    fixed = fixed.replace(/\\infty(?=[\s,;.!?)\]\[{}]|$)/g, (match, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        return `$${match}$`;
    });

    // 4.5.3 Encapsuler les commandes vectorielles/accent et lettres grecques minuscules hors $
    // Ces commandes sont fréquemment envoyées sans délimiteurs $ par l'IA.
    // Commandes à 1 argument avec accolades : \vec{AB}, \overrightarrow{AB}, \overline{x}, \widehat{f}, \widetilde{u}, \mathbb{R}, \mathcal{F}
    fixed = fixed.replace(/\\(?:vec|overrightarrow|overline|widehat|widetilde|mathbb|mathcal)\{[^}]*\}/g, (match, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        return `$${match}$`;
    });
    // Lettres grecques minuscules isolées (suivies d'espace, ponctuation, fin de ligne)
    fixed = fixed.replace(/\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?![a-zA-Z{])/g, (match, _greek, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        return `$${match}$`;
    });

    // 4.6 Conversion du mot "delta" (sans backslash) vers $\Delta$
    // L'IA écrit parfois "delta = 12" au lieu de "$\Delta = 12$"
    // On ne convertit PAS si déjà dans un bloc $...$
    // ATTENTION: préserver l'espace avant "delta" s'il existe
    fixed = fixed.replace(/(\s?)(delta)\b(?=\s*=)/gi, (match, space, word, offset) => {
        if (isInsideMathBlock(fixed, offset as number)) return match;
        // Préserver l'espace existant (ne pas en ajouter)
        return space + '$\\Delta$';
    });

    // 4.7 Correction des patterns LaTeX malformés générés par l'IA
    // L'IA génère parfois "\Delta$ = ..." au lieu de "$\Delta = ...$"
    // On corrige en ajoutant le $ ouvrant manquant SEULEMENT s'il n'y a pas déjà un $ avant
    fixed = fixed.replace(/(?<!\$)\\Delta\$/g, '$\\Delta$');
    fixed = fixed.replace(/(?<!\$)\\Delta\s*\$\$/g, '$\\Delta$');
    // Corriger les blocs $$ vides ou aberrants
    fixed = fixed.replace(/\$\$\s*\$\$/g, '');
    // NOTE: on supprime la correction "$ " qui causait trop de bugs

    // 4.8 Correction des séparateurs de lignes dans les matrices
    // L'IA génère parfois "\ " (un seul backslash) au lieu de "\\" dans pmatrix/bmatrix/vmatrix
    // Ex : \begin{pmatrix} a \ b \end{pmatrix} → \begin{pmatrix} a \\ b \end{pmatrix}
    fixed = fixed.replace(/(\\begin\{(?:pmatrix|bmatrix|vmatrix)\})([\s\S]*?)(\\end\{(?:pmatrix|bmatrix|vmatrix)\})/g, (_m, begin, content, end) => {
        // Remplace "\ " (backslash seul + espace/newline) par "\\" seulement si ce n'est pas déjà "\\"
        const fixedContent = content.replace(/\\(?![\\\w{,;!|])\s/g, '\\\\ ');
        return begin + fixedContent + end;
    });

    // 5. Environnements LaTeX sans délimiteurs $$ → on les encadre
    // L'IA envoie parfois \begin{align}...\end{align} sans $$ autour
    // ⚠️ CRITIQUE : utilise isInsideMathBlock pour ne PAS entourer si déjà dans un $$
    // (ctxBefore.endsWith('$$') ne suffit pas si l'env est loin du $$ ouvrant)
    fixed = fixed.replace(/(\\begin\{(?:aligned?|array|cases|pmatrix|bmatrix|vmatrix|gather\*?|multline\*?|equation\*?|split|alignat\*?)\}[\s\S]*?\\end\{(?:aligned?|array|cases|pmatrix|bmatrix|vmatrix|gather\*?|multline\*?|equation\*?|split|alignat\*?)\})/g, (matchEnv, _g1, offset, str) => {
        // Vérification précise : l'environnement est-il déjà dans un bloc $$ ... $$ ?
        if (isInsideMathBlock(str, offset)) return matchEnv;
        return '\n$$\n' + matchEnv + '\n$$\n';
    });

    // 5.5 Normaliser les blocs $$ ... $$ multi-lignes
    // remark-math v6 (math flow) exige que le $$ FERMANT soit sur sa propre ligne.
    // Cas typique généré par l'IA :
    //   $$\vec{AB} = \begin{pmatrix} 3 \\ 4 \end{pmatrix}$$   ← tout sur une ligne = OK
    //   $$\vec{AB} = \begin{pmatrix} ...\n... \end{pmatrix}$$ ← closing $$ en fin de ligne = ✗
    // Fix : mettre chaque $$ ouvrant/fermant sur sa propre ligne
    fixed = fixed.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
        // Une seule ligne : remark-math gère bien $$expr$$ inline display → ne pas toucher
        if (!content.includes('\n')) return match;
        const trimmed = content.trim();
        if (!trimmed) return match;
        // Multi-lignes : normaliser en bloc math flow
        return `\n$$\n${trimmed}\n$$\n`;
    });

    // 6. Fix espace parasite juste après le $ ouvrant
    // remark-math refuse "$ expr" → on retire l'espace seulement après un $ OUVRANT
    fixed = fixed.replace(/((?:^|[\s([{,;:]))\$\s(?=[^\s$\n])/gm, '$1$');

    // 6.5 Trim des espaces intérieurs dans les blocs inline $...$
    // remark-math v6 (micromark) exige : pas d'espace après $ ouvrant NI avant $ fermant.
    // Cas typique : \( x \) → $ x $ → étape 6 retire l'espace initial → $x $
    // → cette étape retire l'espace AVANT le $ fermant pour corriger le cas résiduel.
    // ⚠️ Ne touche PAS aux blocs display math $$ ... $$
    fixed = fixed.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, (_match, inner) => {
        const trimmed = inner.trim();
        return trimmed ? `$${trimmed}$` : _match;
    });

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

