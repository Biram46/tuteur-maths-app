/**
 * AUTOMATISMES — Programme Officiel (BO n°24, 12/06/2025)
 * ========================================================
 * Référentiel complet des automatismes pour les DS et EAM des Premières.
 * Utilisé pour guider la génération AI des Parties I (Automatismes).
 */

export interface AutomatismeCategory {
    id: string;
    title: string;
    items: string[];
}

export const AUTOMATISMES_BO24: AutomatismeCategory[] = [
    {
        id: 'calcul_numerique',
        title: '1. CALCUL NUMÉRIQUE ET ALGÉBRIQUE',
        items: [
            'Comparer deux nombres (différence ou quotient)',
            'Fractions : opérations et comparaisons',
            'Puissances : opérations',
            'Conversions d\'unités',
            'Calcul littéral élémentaire : expressions additives et multiplicatives',
            'Développement, factorisation, réduction',
            'Identités remarquables : (a+b)², (a-b)², (a+b)(a-b)',
            'Factorisations : ax²+bx, ax+by',
            'Équations : x²=a, ax+b=cx+d, a/x=b, inéquations du 1er degré',
            'Isoler une variable, application numérique de formules',
            'Équations produit nul',
            'Signe d\'expressions du 1er et 2nd degré',
        ],
    },
    {
        id: 'proportions',
        title: '2. PROPORTIONS ET POURCENTAGES',
        items: [
            'Calcul de proportions (décimal, fractionnaire, pourcentage)',
            'Calcul tout/partie',
        ],
    },
    {
        id: 'evolutions',
        title: '3. ÉVOLUTIONS ET VARIATIONS',
        items: [
            'Formulations additive et multiplicative',
            'Taux d\'évolution : calcul, application, expression en %',
            'Taux successifs et taux réciproque',
        ],
    },
    {
        id: 'fonctions',
        title: '4. FONCTIONS ET REPRÉSENTATIONS',
        items: [
            'Images et antécédents (graphique)',
            'Équation de courbe',
            'Fonctions linéaires et affines',
            'Résolution graphique f(x)=k, f(x)<k',
            'Tableau de variations et signe (graphique)',
            'Droites : tracer, lire, coefficient directeur',
        ],
    },
    {
        id: 'statistiques',
        title: '5. STATISTIQUES',
        items: [
            'Graphiques usuels : barres, circulaire, courbe, nuage de points',
            'Indicateurs : moyenne, médiane, quartiles',
            'Boîtes à moustaches',
            'Passage graphique/données',
        ],
    },
    {
        id: 'probabilites',
        title: '6. PROBABILITÉS',
        items: [
            'Probabilité entre 0 et 1',
            'Événement contraire',
            'Probabilité d\'un événement comme somme des issues',
            'Équiprobabilité : P(A) = Card(A)/Card(Ω)',
            'Probabilité conditionnelle (tableau croisé, arbre pondéré)',
            'Notations P(A∩B), P_A(B), P_B(A)',
        ],
    },
];

/**
 * Génère le prompt d'automatismes pour injection dans le system prompt AI
 */
export function getAutomatismesPrompt(classe: string): string {
    const isFirstYear = classe.toLowerCase().includes('premi') ||
        classe.toLowerCase().includes('1ere') ||
        classe.toLowerCase().includes('1ère');

    if (!isFirstYear) {
        return `
AUTOMATISMES (pour ${classe}) :
- Partie Automatismes SANS format QCM
- Questions de calcul rapide et raisonnement
- Pas de choix multiples pour les Secondes et Terminales
`;
    }

    const categories = AUTOMATISMES_BO24.map(cat => {
        const items = cat.items.map(item => `  - ${item}`).join('\n');
        return `${cat.title}\n${items}`;
    }).join('\n\n');

    return `
PROGRAMME OFFICIEL DES AUTOMATISMES (BO n°24, 12/06/2025)
À intégrer OBLIGATOIREMENT dans la Partie I des DS et EAM pour les Premières.
Format : QCM à 4 choix (A, B, C, D) — 1 seule bonne réponse.

${categories}

RÈGLES :
- Chaque question d'automatisme doit porter sur un de ces thèmes
- Varier les catégories (ne pas faire que du calcul)
- Les questions doivent être faisables en ~2 minutes sans calculatrice
- Inclure des pièges courants des élèves
`;
}

/**
 * Retourne une sélection aléatoire de thèmes d'automatismes (pour diversifier les DS)
 */
export function getRandomAutomatismeThemes(count: number = 6): string[] {
    const allItems = AUTOMATISMES_BO24.flatMap(cat =>
        cat.items.map(item => `[${cat.title.split('.')[0].trim()}] ${item}`)
    );

    // Shuffle et sélectionner
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}
