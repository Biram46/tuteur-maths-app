import { generateSignTable } from '../lib/math-engine/sign-table-engine';
const table = generateSignTable({ expression: "e^x - 1" });
console.log(JSON.stringify(table, null, 2));
