const extract = "Peux-tu me faire le tableau de signes complet pour résoudre l'inéquation (x - 2)/(x + 5) <= 0";
const mathMatch = extract.match(/([-(]?\s*(?:[2-9]|\d+\.?\d*|x|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i);
console.log("Match 1:", mathMatch ? mathMatch[1] : "null");

const extract2 = "Dresse le tableau de signes de l'expression (e^x - 1)/(x - 2)";
const mathMatch2 = extract2.match(/([-(]?\s*(?:[2-9]|\d+\.?\d*|x|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i);
console.log("Match 2:", mathMatch2 ? mathMatch2[1] : "null");
