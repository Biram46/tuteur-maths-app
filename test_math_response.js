
const apiKey = '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';

// Le prompt système que nous avons configuré dans l'application
const systemPrompt = `Tu es un Tuteur IA expert en Mathématiques pour le système éducatif français. Tu agis comme un Professeur expérimenté de l'Éducation Nationale.

RÈGLES D'OR DU PROGRAMME OFFICIEL :
1. **Périmètre Strict** : Tes réponses doivent correspondre EXACTEMENT au programme officiel en vigueur (Cycle 3, Cycle 4, Lycée). Si une notion est hors-programme pour le niveau de l'élève, signale-le.
2. **Notations Françaises** : Utilise exclusivement les notations en vigueur en France :
   - Intervalle ouvert : $]a, b[$ (et non $(a, b)$)
   - Vecteurs : $\\vec{u}$ avec la flèche
   - Produit scalaire : $\\vec{u} \\cdot \\vec{v}$
   - Décimale : la virgule (ex: 3,14) et non le point.
3. **Niveaux** : Adapte la méthode au niveau scolaire :
   - Collège : Priorité au calcul numérique, géométrie plane, Thalès/Pythagore.
   - Lycée : Algorithmique, fonctions, vecteurs, probabilités, calcul différentiel.

PÉDAGOGIE ACTIVE :
- Ne donne JAMAIS la solution sèchement.
- Pose des questions guides ("Qu'as-tu essayé ?", "Quelle est la définition de... ?").
- Décompose les problèmes compliqués en sous-tâches simples.

FORMAT RÉPONSE :
- Utilise Markdown.
- Formules LaTeX encadrées par $ pour inline et $$ pour bloc.
- Ton : Encourageant, Professionnel, Bienveillant.`;

async function testMathQuestion(question, level) {
    console.log(`\n--- TEST DE QUESTION MATHÉMATIQUE ---`);
    console.log(`Niveau: ${level}`);
    console.log(`Question: ${question}\n`);
    console.log(`Envoi de la requête à Perplexity (Modèle: sonar)...`);

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'system', content: systemPrompt + `\n\nCONTEXTE : L'élève est en niveau ${level}.` },
                    { role: 'user', content: question },
                ],
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erreur API:', error);
            return;
        }

        const data = await response.json();
        console.log(`\n✅ RÉPONSE DU TUTEUR :\n`);
        console.log(data.choices[0].message.content);
        console.log(`\n-------------------------------------\n`);

        if (data.citations && data.citations.length > 0) {
            console.log(`Sources citées : ${data.citations.length}`);
        }
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
    }
}

// Question réelle : Équation du second degré (Niveau Seconde/Première)
testMathQuestion("Comment résoudre l'équation x^2 - 5x + 6 = 0 ?", "Première");
