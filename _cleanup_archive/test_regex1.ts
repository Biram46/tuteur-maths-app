const inputs = [
    "Peux-tu me faire le tableau de signes complet pour résoudre l'inéquation (x - 2)/(x + 5) <= 0",
    "Dresse le tableau de signes de l'expression (e^x - 1)/(x - 2)",
    "Dresse le tableau de signes de (-x+2)/(x-1)",
    "tableau de signes de f(x) = x^2 - 4",
    "Résous l'inéquation -3x + 12 >= 0"
];

const r1 = /.*(?:signes?|variations?|l'expression|la fonction|l'étude)\s+(?:complet\s+)?(?:de|du|d'un|d'une|des?|pour\s+r[eé]soudre)\s+(?:l'in[eé]quation\s+|l'expression\s+|la\s+fonction\s+)?(?:(?:trin[ôo]mes?|polyn[ôo]mes?|produit|quotient|fonction|fraction(?: rationnelle)?|expression|in[eé]quation)\s*(?:suivante?|ci-dessous)?\s*:?\s*)?/i;

for (const input of inputs) {
    let extract = input.replace(r1, '');
    console.log(input, '   =>   ', extract);
}
