const text = `Résous l'équation du second degré : $3x^2 - 5x + 2 = 0$`;
const m3 = text.match(/([\w²³⁴][\w\s²³⁴^+\-*/(),.]*=[\w\s²³⁴^+\-*/(),.]+)/);
let rawEq = m3 ? m3[1].trim() : '';
console.log('[' + rawEq + ']');
