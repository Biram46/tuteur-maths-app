/**
 * Test du moteur de variations v2
 * Couvre les 4 catégories de fonctions + les règles par niveau
 */
import { generateVariationTable } from './variation-engine';

const tests = [
    // ═══ [1] FONCTIONS AFFINES ═══
    { expr: '2*x + 3', desc: '[1] Affine croissante : 2x + 3', niveau: 'premiere_spe' as const },
    { expr: '-3*x + 1', desc: '[1] Affine décroissante : -3x + 1', niveau: 'seconde' as const },
    { expr: '5', desc: '[1] Affine constante : f(x) = 5', niveau: 'seconde' as const },

    // ═══ [2] FONCTIONS DE RÉFÉRENCE ═══
    { expr: 'x^2', desc: '[2] Référence x² (Seconde)', niveau: 'seconde' as const },
    { expr: 'x^3', desc: '[2] Référence x³ (Première)', niveau: 'premiere_spe' as const },
    { expr: 'sqrt(x)', desc: '[2] Référence √x', niveau: 'seconde' as const },
    { expr: '1/x', desc: '[2] Référence 1/x (Première)', niveau: 'premiere_spe' as const },
    { expr: '1/x', desc: '[2] Référence 1/x (Terminale — avec limites)', niveau: 'terminale_spe' as const },
    { expr: 'abs(x)', desc: '[2] Référence |x|', niveau: 'seconde' as const },

    // ═══ [3] POLYNÔMES DU 2ND DEGRÉ ═══
    { expr: 'x^2 - 4*x + 3', desc: '[3] x² - 4x + 3 (a>0, minimum)', niveau: 'premiere_spe' as const },
    { expr: '-x^2 + 2*x + 1', desc: '[3] -x² + 2x + 1 (a<0, maximum)', niveau: 'premiere_spe' as const },
    { expr: '2*x^2 - 8*x + 5', desc: '[3] 2x² - 8x + 5 (Terminale, avec limites)', niveau: 'terminale_spe' as const },

    // ═══ [4] CAS GÉNÉRAL ═══
    { expr: 'x^3 - 3*x', desc: '[4] x³ - 3x (2 extremums, Première)', niveau: 'premiere_spe' as const },
    { expr: '(x-1)/(x+2)', desc: '[4] (x-1)/(x+2) (rationnelle, Terminale)', niveau: 'terminale_spe' as const },
    { expr: '(x-1)/(x+2)', desc: '[4] (x-1)/(x+2) (Première — sans limites)', niveau: 'premiere_spe' as const },
    { expr: 'e^x - x', desc: '[4] e^x - x (exponentielle, Terminale)', niveau: 'terminale_spe' as const },
];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   TESTS MOTEUR TABLEAU DE VARIATIONS v2                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

for (const t of tests) {
    console.log(`\n${'━'.repeat(60)}`);
    console.log(`📌 ${t.desc} — Niveau: ${t.niveau}`);
    console.log(`   f(x) = ${t.expr}`);
    console.log('━'.repeat(60));

    const result = generateVariationTable({
        expression: t.expr,
        niveau: t.niveau,
    });

    console.log(`✅ Success: ${result.success}`);
    if (result.error) console.log(`❌ Error: ${result.error}`);
    if (result.method) console.log(`📐 Méthode: ${result.method}`);
    if (result.aiContext) console.log(`🤖 AI Context:\n${result.aiContext.split('\n').map(l => '   ' + l).join('\n')}`);
    if (result.derivativeExpr) console.log(`   f'(x) = ${result.derivativeExpr}`);
    if (result.extrema && result.extrema.length > 0) {
        console.log(`   Extrema: ${result.extrema.map(e => `${e.type}(${e.x}, ${e.y})`).join(', ')}`);
    }

    if (result.tableSpec) {
        console.log(`   xValues: [${result.tableSpec.xValues.join(', ')}]`);
        for (const row of result.tableSpec.rows) {
            console.log(`   ${row.type}: ${row.label} → [${row.values.join(', ')}]`);
        }
    }

    if (result.aaaBlock) {
        console.log(`\n   AAA Block:\n${result.aaaBlock.split('\n').map(l => '   ' + l).join('\n')}`);
    }
}

console.log(`\n${'═'.repeat(60)}`);
console.log('✅ Tous les tests exécutés.');
