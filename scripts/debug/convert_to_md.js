const fs = require('fs');

const content = fs.readFileSync('test_results.txt', 'utf8');

// Créer un fichier Markdown propre et lisible
const mdContent = `# 📊 Résultats du Test - Tuteur Maths IA

**Date du test:** ${new Date().toLocaleString('fr-FR')}

---

${content}

---

## 📝 Notes

- ✅ Le test s'est exécuté avec succès
- 🤖 Modèle utilisé: Perplexity Sonar
- 📚 Le tuteur IA respecte les conventions françaises et la pédagogie active
- 🎯 Les réponses sont adaptées au niveau de l'élève

## 📂 Fichiers générés

- \`test_results.txt\` - Résultats bruts
- \`test_results.html\` - Visualisation interactive (avec rendu LaTeX)
- \`test_results_readable.md\` - Ce fichier (version Markdown)
`;

fs.writeFileSync('test_results_readable.md', mdContent, 'utf8');
console.log('✅ Fichier Markdown créé: test_results_readable.md');
