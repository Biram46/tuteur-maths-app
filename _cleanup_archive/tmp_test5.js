const extract = "-2x^2 + 8x - 5 sur l'intervalle [-4; 6].";
const mathMatch = extract.match(/([-(]*\s*(?:[2-9]|\d+\.?\d*|\bx\b|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i);

console.log("mathMatch:", mathMatch ? mathMatch[1] : null);
