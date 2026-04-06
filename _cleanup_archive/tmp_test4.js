const extract = "variations de f(x) = -2x^2 + 8x - 5 sur l'intervalle [-4; 6].";
const mathMatch = extract.match(/([-(]*\s*(?:[2-9]|\d+\.?\d*|\bx\b|e\^|exp\s*\(|ln\s*\(|log\s*\(|sqrt\s*\()[^a-zA-ZÀ-ÿ]{0,3}[\w^*/+().,-]*(?:(?:\s*[*+\-/^]\s*|\s*\(\s*)[\w^*()+.,/-]*)*(?:\([^)]+\))*[^,;]*)/i);
const deMatch = "Étudie le signe de la dérivée et donne avec le tableau de variations de f(x) = -2x^2 + 8x - 5 sur l'intervalle [-4; 6].".match(/(?:de|du)\s+(?:[fghk]\s*\(\s*x\s*\)\s*=?\s*)(.+)/i);

console.log("mathMatch:", mathMatch ? mathMatch[1] : null);
if (mathMatch) {
    let finalE = mathMatch[1].trim();
    console.log("finalE from mathMatch:", finalE);
}
console.log("deMatch:", deMatch ? deMatch[1].trim() : null);

