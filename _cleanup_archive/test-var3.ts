import { generateVariationTable } from './lib/math-engine/variation-engine';
import * as fs from 'fs';

const tests = [
    { expr: 'e^x / x', niveau: 'terminale_spe' as const },
    { expr: 'ln(x)', niveau: 'terminale_spe' as const }
];

let out = '';
for (const t of tests) {
    out += `\n--- ${t.expr} ---\n`;
    try {
        const result = generateVariationTable({
            expression: t.expr,
            niveau: t.niveau,
        });
        if (result.aaaBlock) {
            out += result.aaaBlock + '\n';
        } else {
            out += result.error + '\n';
        }
    } catch (e) {
        out += 'EXCEPTION ' + e + '\n';
    }
}
fs.writeFileSync('out7.txt', out, {encoding: 'utf8'});
