const fs = require('fs');

const content = fs.readFileSync('test_results.txt', 'utf8');

// Créer un résumé simple pour la console
console.log('\n┌' + '─'.repeat(78) + '┐');
console.log('│' + ' RÉSULTAT DU TEST - TUTEUR MATHS IA '.padEnd(78) + '│');
console.log('└' + '─'.repeat(78) + '┘\n');

// Extraire les parties importantes
const lines = content.split('\n');
let inResponse = false;
let responseLines = [];
let questionLine = '';
let level = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('Niveau:')) {
        level = line;
    }
    if (line.includes('Question:')) {
        questionLine = line;
    }

    if (line.includes('✅ RÉPONSE DU TUTEUR')) {
        inResponse = true;
        continue;
    }

    if (inResponse) {
        if (line.includes('---')) {
            break;
        }
        responseLines.push(line);
    }
}

console.log(level);
console.log(questionLine);
console.log('\n' + '='.repeat(80) + '\n');
console.log('RÉPONSE DU TUTEUR IA:\n');
console.log(responseLines.join('\n'));
console.log('\n' + '='.repeat(80) + '\n');
console.log('✅ Test terminé avec succès!');
console.log('📄 Résultats complets disponibles dans: test_results.html\n');
