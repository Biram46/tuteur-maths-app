/**
 * Test du sign-table-engine.ts directement
 * Exécuter avec: npx ts-node lib/math-engine/test-engine-direct.ts
 */

import { generateSignTable } from './sign-table-engine';

const SEPARATOR = '═'.repeat(65);
const SEP2 = '─'.repeat(65);

function displayTable(result: ReturnType<typeof generateSignTable>, funcLabel: string) {
    console.log(`\n${SEPARATOR}`);
    console.log(`  ${funcLabel}`);
    console.log(SEPARATOR);

    if (!result.success || !result.tableSpec) {
        console.log('  ❌ ERREUR:', result.error);
        return;
    }

    const { tableSpec, criticalPoints, domain, discriminantSteps } = result;

    console.log(`  Domaine : ${domain ?? 'ℝ'}`);
    console.log(`  Points critiques : [${criticalPoints.map(x => x.toString()).join(', ')}]`);

    if (discriminantSteps && discriminantSteps.length > 0) {
        console.log('\n  📐 Calcul du discriminant :');
        for (const ds of discriminantSteps) {
            console.log(`    Facteur : ${ds.factor}`);
            for (const s of ds.steps) console.log(`      ${s}`);
        }
    }

    console.log('');

    // Construire le tableau
    const xVals = tableSpec.xValues;
    const colWidth = 10;

    // En-tête x
    let headerLine = '  x'.padEnd(14) + '|';
    for (const v of xVals) {
        headerLine += ` ${v.padEnd(colWidth)}|`;
    }
    console.log(headerLine);
    console.log('  ' + SEP2.slice(2, headerLine.length - 2));

    // Lignes de signes
    for (const row of tableSpec.rows) {
        let line = `  ${row.label}`.padEnd(14) + '|';
        for (const v of row.values) {
            line += ` ${v.padEnd(colWidth)}|`;
        }
        // Dernière ligne = f(x) → séparer
        if (row === tableSpec.rows[tableSpec.rows.length - 1]) {
            console.log('  ' + SEP2.slice(2, headerLine.length - 2));
        }
        console.log(line);
    }

    console.log(SEPARATOR);
}

// ──────────────────────────────────────────────────────────────
// TEST 1 : f(x) = (3x-2)(-2x+3)
// ──────────────────────────────────────────────────────────────
console.log('\n\n📐 TEST DU MOTEUR TABLEAU DE SIGNES\n');

const f = generateSignTable({
    expression: '(3*x-2)*(-2*x+3)',
    numeratorFactors: [
        { label: '3x-2', expr: '3*x-2' },
        { label: '-2x+3', expr: '-2*x+3' },
    ],
});
displayTable(f, 'f(x) = (3x-2)(-2x+3)');
console.log('  f(x) attendu : - sur ]-∞, 2/3[, 0 en 2/3, + sur ]2/3, 3/2[, 0 en 3/2, - sur ]3/2, +∞[');

// ──────────────────────────────────────────────────────────────
// TEST 2 : g(x) = (3x-5)/(-5x+1)
// ──────────────────────────────────────────────────────────────
const g = generateSignTable({
    expression: '(3*x-5)/(-5*x+1)',
    numeratorFactors: [{ label: '3x-5', expr: '3*x-5' }],
    denominatorFactors: [{ label: '-5x+1', expr: '-5*x+1' }],
});
displayTable(g, 'g(x) = (3x-5)/(-5x+1)');
console.log('  g(x) attendu : - sur ]-∞, 1/5[, || en 1/5, + sur ]1/5, 5/3[, 0 en 5/3, - sur ]5/3, +∞[');

// ──────────────────────────────────────────────────────────────
// TEST 3 : h(x) = ln(x) - 1
// ──────────────────────────────────────────────────────────────
const h = generateSignTable({
    expression: 'ln(x) - 1',
    searchDomain: [0.001, 20],
});
displayTable(h, 'h(x) = ln(x) - 1');
console.log('  h(x) attendu : - sur ]0, e[, 0 en e≈2.7183, + sur ]e, +∞[');

// ──────────────────────────────────────────────────────────────
// TEST 4 : k(x) = (-x²-5x-6) × √x
// ──────────────────────────────────────────────────────────────
const k = generateSignTable({
    expression: '(-x^2-5*x-6)*sqrt(x)',
    numeratorFactors: [
        { label: '-x²-5x-6', expr: '-x^2-5*x-6' },
        { label: '√x', expr: 'sqrt(x)' },
    ],
    searchDomain: [0, 20],
});
displayTable(k, 'k(x) = (-x²-5x-6)·√x');
console.log('  k(x) attendu : 0 en x=0, - sur ]0, +∞[');
console.log('  Note : racines du trinôme x₁=-3, x₂=-2 sont HORS domaine x≥0');

console.log('\n\n✅ Tests terminés.\n');
