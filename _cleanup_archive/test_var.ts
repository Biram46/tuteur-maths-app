import { generateVariationTable } from './lib/math-engine/variation-engine';
const res = generateVariationTable({ expression: '(e^x)/x', niveau: 'terminale_spe' });
console.log(JSON.stringify(res, null, 2));
