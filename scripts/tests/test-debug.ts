const { generateSignTable } = require('./lib/math-engine/sign-table-engine');

const r = generateSignTable({ expression: '(2x+1)(x-3)/(x+2)', niveau: 'premiere' });
const lines = (r.aaaBlock || '').split('\n');
lines.forEach((l: string, i: number) => console.log('L' + i + ':' + l));
