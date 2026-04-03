let expr = "-2x^2 + 8x - 5 sur l'intervalle [-4; 6].";
expr = expr
    .replace(/\$/g, '')
    .replace(/[fghk]\s*\(x\)\s*=?\s*/gi, '')
    .replace(/\s*(?:>|<|>=|<=|=|≥|≤)\s*.*$/, '')
    .replace(/·/g, '*').replace(/×/g, '*').replace(/−/g, '-')
    // Retirer les domaines de définition
    .replace(/\s+sur\s+ℝ\s*\.?\s*$/i, '')
    .replace(/\s+sur\s+[Rr]\s*\.?\s*$/i, '')
    .replace(/\s+sur\s+(?:l(?:'|’|e\s+|a\s+|les\s+)?intervalles?\s*)?(?:ℝ|[Rr]|[\[\]I]).*$/i, '')
    .replace(/\s+pour\s+tout\s+x\s*\.?\s*$/i, '')
    .replace(/\s+∀\s*x\s*\.?\s*$/i, '')
    // Stopper brut à n'importe quel point d'interrogation ou d'exclamation
    .split(/[?!]/)[0]
    // Retirer le texte français résiduel
    .replace(/,\s*(?:et|on|sa|où|avec|pour|dont|dans|sur|qui|elle|il|ses|son|la|le|les|nous|c'est|cette)\b.*$/i, '')
    .replace(/;\s*(?!\s*[+-])[a-zA-ZÀ-ÿ].*$/i, '')
    // Retirer instructions en langage naturel
    .replace(/\.\s+[A-ZÀ-Ÿa-zà-ÿ].+$/s, '')
    .replace(/\s+(?:et|puis)\s+(?:trace|dedui|dresse|calcule|donne|determi|represent).+$/i, '')
    .replace(/\s+$/g, '').replace(/[.!?,;]+$/g, '');

console.log("EXPR =", expr);
