/**
 * 🔍 Script de Vérification Post-Tests
 * 
 * À exécuter APRÈS avoir effectué les tests manuels
 * pour analyser les réponses de l'IA
 */

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 ANALYSEUR DE RÉSULTATS - mimimaths@i');
console.log('═══════════════════════════════════════════════════════════\n');

/**
 * Fonction pour analyser une réponse de l'IA
 */
function analyzeResponse(response) {
    const analysis = {
        hasGraphTag: false,
        graphTagCount: 0,
        graphPoints: [],
        hasLatexTable: false,
        latexTableCount: 0,
        hasInfinitySymbol: false,
        hasArrowSymbols: false,
        hasSignSymbols: false,
        isComplete: false,
        issues: []
    };

    // 1. Vérifier tags @@@
    const graphTagMatches = response.match(/@@@[^@]+@@@/g);
    if (graphTagMatches) {
        analysis.hasGraphTag = true;
        analysis.graphTagCount = graphTagMatches.length;

        // Compter les points dans chaque tag
        graphTagMatches.forEach((tag, index) => {
            const points = tag.split('|').filter(p => p.includes(',')).length - 1; // -1 pour domain
            analysis.graphPoints.push({
                tag: index + 1,
                points: points,
                sufficient: points >= 6
            });
        });
    }

    // 2. Vérifier tableaux LaTeX
    const latexMatches = response.match(/\\begin\{array\}/g);
    if (latexMatches) {
        analysis.hasLatexTable = true;
        analysis.latexTableCount = latexMatches.length;
    }

    // 3. Vérifier symboles LaTeX corrects
    analysis.hasInfinitySymbol = response.includes('\\infty');
    analysis.hasArrowSymbols = response.includes('\\nearrow') || response.includes('\\searrow');
    analysis.hasSignSymbols = /[\+\-]\s*&/.test(response); // Signes dans tableaux

    // 4. Vérifier squelettes vides (problème)
    const hasEmptySkeleton = response.includes('...') ||
        response.includes('à compléter') ||
        response.includes('complète') ||
        response.includes('remplis');

    if (hasEmptySkeleton) {
        analysis.issues.push('❌ Contient des squelettes vides ou demandes de complétion');
    }

    // 5. Vérifier symboles interdits
    if (response.includes('+infy') || response.includes('-infy') || response.includes('inf') && !response.includes('\\infty')) {
        analysis.issues.push('❌ Symboles infini incorrects (devrait être \\infty)');
    }

    if (response.includes('<=') || response.includes('>=')) {
        analysis.issues.push('❌ Symboles comparaison incorrects (devrait être \\leq, \\geq)');
    }

    // 6. Score de complétude
    let score = 0;
    if (analysis.hasGraphTag) score += 30;
    if (analysis.hasLatexTable) score += 30;
    if (analysis.hasInfinitySymbol) score += 10;
    if (analysis.hasArrowSymbols || analysis.hasSignSymbols) score += 10;
    if (analysis.graphPoints.every(p => p.sufficient)) score += 10;
    if (analysis.issues.length === 0) score += 10;

    analysis.score = score;
    analysis.isComplete = score >= 70;

    return analysis;
}

/**
 * Afficher les résultats
 */
function displayResults(testName, analysis) {
    console.log(`\n📝 ${testName}`);
    console.log('─'.repeat(60));

    console.log(`✓ Tags @@@ : ${analysis.hasGraphTag ? '✅' : '❌'} (${analysis.graphTagCount})`);

    if (analysis.graphPoints.length > 0) {
        analysis.graphPoints.forEach(gp => {
            console.log(`  │ Tag ${gp.tag}: ${gp.points} points ${gp.sufficient ? '✅' : '⚠️'}`);
        });
    }

    console.log(`✓ Tableaux LaTeX : ${analysis.hasLatexTable ? '✅' : '❌'} (${analysis.latexTableCount})`);
    console.log(`✓ Symboles \\infty : ${analysis.hasInfinitySymbol ? '✅' : '❌'}`);
    console.log(`✓ Flèches/Signes : ${(analysis.hasArrowSymbols || analysis.hasSignSymbols) ? '✅' : '❌'}`);

    if (analysis.issues.length > 0) {
        console.log('\n⚠️  Problèmes détectés:');
        analysis.issues.forEach(issue => console.log(`  ${issue}`));
    }

    console.log(`\n🎯 Score : ${analysis.score}/100 ${analysis.isComplete ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
}

/**
 * Exemple d'utilisation
 */
console.log('💡 UTILISATION:');
console.log('─'.repeat(60));
console.log('1. Copiez-collez une réponse de l\'IA dans la variable "response"');
console.log('2. Exécutez : node verification_tests.js');
console.log('3. Analysez les résultats\n');

// EXEMPLE - Remplacer par vos vraies réponses
const exampleResponse = `
Voici le graphique demandé :

@@@ Fonction du second degré | -1,8 | 0,3 | 1,0 | 2,-1 | 3,0 | 4,3 | 5,8 | domain:-2,6,-2,9 @@@

Et le tableau de variations :

$$
\\begin{array}{|c|ccccc|}
\\hline
x & -\\infty & & 2 & & +\\infty \\\\
\\hline
f(x) & -\\infty & \\nearrow & 3 & \\searrow & -\\infty \\\\
\\hline
\\end{array}
$$
`;

console.log('📊 EXEMPLE D\'ANALYSE:');
const result = analyzeResponse(exampleResponse);
displayResults('Test Exemple', result);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Remplacez "exampleResponse" par vos vraies réponses');
console.log('═══════════════════════════════════════════════════════════\n');

// Export pour utilisation dans d'autres scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeResponse, displayResults };
}
