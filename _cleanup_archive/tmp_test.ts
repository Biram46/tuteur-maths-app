import { generateVariationTable } from './lib/math-engine/variation-engine';
import * as fs from 'fs';

const res = generateVariationTable({
    expression: 'x^3 - 3*x + 2',
    niveau: 'terminale_spe',
    searchDomain: [-3, 3]
});
fs.writeFileSync('tmp_res.json', JSON.stringify(res, null, 2), 'utf8');
