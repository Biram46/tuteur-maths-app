import { generateVariationTable } from './lib/math-engine/variation-engine';
const res = generateVariationTable({ expression: 'x*log(x)', niveau: 'terminale_spe' });
console.log(JSON.stringify(res, null, 2));
