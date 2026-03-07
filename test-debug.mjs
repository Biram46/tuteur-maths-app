import { generateSignTable } from './lib/math-engine/sign-table-engine.ts';

const result = generateSignTable({
    expression: '(2*x+1)*(x-3)/(x+2)',
    niveau: 'Seconde',
});

console.log('=== SIGN TABLE DEBUG ===');
console.log('Success:', result.success);
console.log('Error:', result.error);
console.log('Critical Points:', JSON.stringify(result.criticalPoints));
console.log('Domain:', result.domain);
console.log('');

if (result.tableSpec) {
    console.log('xValues:', JSON.stringify(result.tableSpec.xValues));
    console.log('N =', result.tableSpec.xValues.length);
    console.log('Expected content length (2N-3) =', 2 * result.tableSpec.xValues.length - 3);
    console.log('');

    for (const row of result.tableSpec.rows) {
        console.log(`Row "${row.label}" [${row.type}] (${row.values.length} values):`);
        console.log('  ', JSON.stringify(row.values));
    }
}

console.log('');
console.log('=== AAA BLOCK ===');
console.log(result.aaaBlock);
