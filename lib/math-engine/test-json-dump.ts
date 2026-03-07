/**
 * Dump JSON complet — pour déboguer le rendu MathTable
 * Lance: npx ts-node --project tsconfig.test.json lib/math-engine/test-json-dump.ts
 */
import { generateSignTable } from './sign-table-engine';

const tests = [
    { label: 'f(x) = (3x-2)(-2x+3)', expr: '(3*x-2)*(-2*x+3)' },
    { label: 'g(x) = (3x-5)/(-5x+1)', expr: '(3*x-5)/(-5*x+1)' },
    { label: 'h(x) = ln(x) - 1', expr: 'ln(x) - 1', searchDomain: [0.001, 20] as [number, number] },
    { label: 'k(x) = (-x²-5x-6)√x', expr: '(-x^2-5*x-6)*sqrt(x)', searchDomain: [0, 20] as [number, number] },
];

for (const t of tests) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${t.label}`);
    console.log('═'.repeat(60));

    const r = generateSignTable({
        expression: t.expr,
        searchDomain: t.searchDomain,
    });

    if (!r.success || !r.tableSpec) {
        console.log('  ❌ ERREUR:', r.error);
        continue;
    }

    const { tableSpec } = r;
    console.log('  xValues:', JSON.stringify(tableSpec.xValues));
    console.log('  n =', tableSpec.xValues.length, '→ attendu', tableSpec.xValues.length * 2 - 1, 'valeurs par ligne');
    console.log('');
    for (const row of tableSpec.rows) {
        console.log(`  [${row.type}] ${row.label}`);
        console.log(`         values (len=${row.values.length}): ${JSON.stringify(row.values)}`);
        // Vérifier la longueur attendue
        const n = tableSpec.xValues.length;
        const expectedLen = n * 2 - 1;
        if (row.values.length !== expectedLen) {
            console.log(`  ⚠️  LONGUEUR INCORRECTE: got ${row.values.length}, expected ${expectedLen}`);
        }
    }
}

console.log('\n\n✅ Dump terminé.\n');
