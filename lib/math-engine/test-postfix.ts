/**
 * Test post-fix : sanitizeExpression + tryFactorizeCommonFactor
 */
import { sanitizeExpression } from './expression-parser';
import { generateSignTable } from './sign-table-engine';

console.log('═══ TEST sanitizeExpression ═══\n');
const sanitizeTests = [
    ['xe^x-x', 'x*e^(x)-x'],
    ['2x+1', '2*x+1'],
    ['3x^2', '3*x^2'],
    ['(3x+2)(7x-1)', '(3*x+2)*(7*x-1)'],
    ['x*e^x', 'x*e^(x)'],
    ['sqrt(x)', 'sqrt(x)'],         // ne pas casser sqrt
    ['ln(x)', 'log(x)'],            // ln → log
    ['e^(2x)', 'e^(2*x)'],
    ['x(x+1)', 'x*(x+1)'],
    ['(x+1)(x-1)', '(x+1)*(x-1)'],
];

for (const [input, expected] of sanitizeTests) {
    const result = sanitizeExpression(input);
    const ok = result === expected;
    console.log(`  ${ok ? '✅' : '❌'} "${input}" → "${result}"${ok ? '' : ` (expected: "${expected}")`}`);
}

console.log('\n═══ TEST SIGN-TABLE (expressions à factoriser) ═══\n');
const engineTests = [
    { expr: 'x*e^x - x', desc: 'xe^x - x → x(e^x - 1)', expectFactors: 2 },
    { expr: 'xe^x-x', desc: 'xe^x-x sans * → même résultat', expectFactors: 2 },
    { expr: 'x^2+3*x', desc: 'x²+3x → x(x+3)', expectFactors: 2 },
    { expr: 'e^x - 1', desc: 'e^x - 1 (pas de facteur x)', expectFactors: 1 },
    { expr: '(3x+2)(7x-1)/(2x-1)', desc: 'expression rationnelle', expectFactors: 3 },
];

for (const t of engineTests) {
    console.log(`\n--- ${t.desc} ---`);
    console.log(`Expression: "${t.expr}"`);

    const result = generateSignTable({ expression: t.expr, niveau: 'Premiere' });

    console.log(`Success: ${result.success}`);
    if (result.error) console.log(`Error: ${result.error}`);

    if (result.tableSpec) {
        const numFactors = result.tableSpec.rows.filter(r => r.label !== 'f(x)').length;
        const ok = numFactors === t.expectFactors;
        console.log(`${ok ? '✅' : '⚠️'} Factors: ${numFactors} (expected ${t.expectFactors})`);
        console.log(`xValues: [${result.tableSpec.xValues.join(', ')}]`);
        for (const row of result.tableSpec.rows) {
            console.log(`  ${row.label}: [${row.values.join(', ')}]`);
        }
    }
}
