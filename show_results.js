const fs = require('fs');

const content = fs.readFileSync('test_results.txt', 'utf8');
const lines = content.split('\n');

console.log('=== DÉBUT DES RÉSULTATS ===\n');
lines.forEach((line, index) => {
    console.log(line);
});
console.log('\n=== FIN DES RÉSULTATS ===');
console.log(`\nTotal: ${lines.length} lignes`);
