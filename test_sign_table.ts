import { generateSignTable } from './lib/math-router/sign-table-engine';

const expr = "(2*x + 1)/(x - 3)";
const result = generateSignTable(expr);
console.log(result.aaaBlock);
