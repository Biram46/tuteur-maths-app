const inputs = [
    "Peux-tu me faire le tableau de signes complet pour résoudre l'inéquation (x - 2)/(x + 5) <= 0",
    "Peux-tu me faire le tableau de signes complet pour résoudre l'inéquation (-x+2)/(x-1) <= 0",
    "Dresse le tableau de signes de l'expression (e^x - 1)/(x - 2)",
    "Dresse le tableau de signes de -3x + 12 >= 0",
    "Résous l'inéquation -3x + 12 >= 0"
];

const matchRegex = /([-(]*\s*(?:[2-9]|\d+\.?\d*|\bx\b|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i;

for (const input of inputs) {
    const mathMatch = input.match(matchRegex);
    console.log(input, '   =>   ', mathMatch ? mathMatch[1] : null);
}
