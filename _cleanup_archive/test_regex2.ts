const input = "Résous l'inéquation -3x + 12 >= 0";

const mathMatch = input.match(/([-(]?\s*(?:[2-9]|\d+\.?\d*|x|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i);
console.log("Match:", mathMatch ? mathMatch[1] : null);
