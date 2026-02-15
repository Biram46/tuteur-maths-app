/**
 * 📊 DÉTECTEUR ET GÉNÉRATEUR DE COURBES pour mimimaths@i
 * Garantit qu'AUCUN exercice de lecture graphique ne manque sa courbe
 */

export interface GraphDetectionResult {
    needsGraph: boolean;
    keywords: string[];
    suggestedGraph?: string;
    concept?: string;
}

/**
 * Liste des mots-clés qui DOIVENT déclencher un graphique
 */
const GRAPH_KEYWORDS = {
    // Lecture graphique directe
    lectureGraphique: ['lecture graphique', 'lire graphiquement', 'par lecture graphique', 'à partir du graphique', 'graphiquement'],

    // Variations
    variations: ['tableau de variations', 'sens de variation', 'variations de', 'croissante', 'décroissante', 'maximum', 'minimum', 'extremum'],

    // Signes
    signes: ['tableau de signes', 'signe de', 'positif', 'négatif', 'où la fonction est positive', 'où f(x) > 0', 'où f(x) < 0'],

    // Courbe représentative
    courbe: ['courbe représentative', 'représentation graphique', 'courbe de', 'tracé de la fonction', 'allure de la courbe'],

    // Antécédents / Images
    imageAnteced: ['image de', 'antécédent de', 'antécédents de', 'f(', 'déterminer f('],

    // Intersections
    intersections: ['point d\'intersection', 'intersection avec', 'coupe l\'axe', 'croise'],

    // Asymptotes
    asymptotes: ['asymptote', 'limite en', 'tend vers']
};

/**
 * Templates de courbes types pour chaque concept (Seconde, Première)
 * 🎨 AMÉLIORÉ : Minimum 6-8 points pour des courbes ultra-lisses
 */
const GRAPH_TEMPLATES: Record<string, string> = {
    // Fonction affine croissante (5 points pour fluidité)
    affine_croissante: '@@@ Fonction affine croissante | -4,-3 | -2,-1 | 0,1 | 2,3 | 4,5 | domain:-5,5,-4,6 @@@',

    // Fonction affine décroissante (5 points)
    affine_decroissante: '@@@ Fonction affine décroissante | -4,5 | -2,3 | 0,1 | 2,-1 | 4,-3 | domain:-5,5,-4,6 @@@',

    // Parabole (2nd degré) - 7 points pour courbe douce
    parabole_positive: '@@@ Fonction du second degré | -3,4.5 | -2,2 | -1,0.5 | 0,0 | 1,0.5 | 2,2 | 3,4.5 | domain:-4,4,-1,5 @@@',
    parabole_negative: '@@@ Fonction du second degré | -3,-4.5 | -2,-2 | -1,-0.5 | 0,0 | 1,-0.5 | 2,-2 | 3,-4.5 | domain:-4,4,-5,1 @@@',

    // Fonction homographique (1/x) - 10 points pour discontinuité claire
    homographique: '@@@ Fonction homographique | -5,-0.4 | -3,-0.67 | -2,-1 | -1,-2 | -0.5,-4 | -0.2,-10,open | 0.2,10,open | 0.5,4 | 1,2 | 2,1 | 3,0.67 | 5,0.4 | domain:-6,6,-6,6 @@@',

    // Fonction avec maximum (7 points)
    avec_maximum: '@@@ Fonction avec maximum | -4,-2 | -2,1 | -1,3 | 0,4 | 1,3 | 2,1 | 4,-2 | domain:-5,5,-3,5 @@@',

    // Fonction avec minimum (7 points)
    avec_minimum: '@@@ Fonction avec minimum | -4,5 | -2,2 | -1,0 | 0,-1 | 1,0 | 2,2 | 4,5 | domain:-5,5,-2,6 @@@',

    // Variations croissantes puis décroissantes (9 points pour fluidité maximale)
    croiss_decrois: '@@@ Fonction avec variations | -5,-1 | -3,1 | -2,2.5 | -1,3.5 | 0,4 | 1,3.5 | 2,2 | 3,0 | 5,-2 | domain:-6,6,-3,5 @@@',

    // Fonction exponentielle style (7 points)
    exponentielle: '@@@ Fonction exponentielle | -3,0.05 | -2,0.14 | -1,0.37 | 0,1 | 1,2.72 | 2,7.39 | 3,20.09 | domain:-4,4,-1,22 @@@',

    // Fonction logarithme style (8 points)
    logarithme: '@@@ Fonction logarithme | 0.05,-3,open | 0.2,-1.6 | 0.5,-0.69 | 1,0 | 2,0.69 | 3,1.1 | 4,1.39 | 5,1.61 | domain:-0.5,6,-4,2 @@@',

    // Sinus (13 points pour sinusoïde parfaite)
    sinus: '@@@ Fonction sinusoïdale | -6.28,0 | -5.5,0.7 | -4.71,1 | -3.93,0.7 | -3.14,0 | -2.36,-0.7 | -1.57,-1 | -0.79,-0.7 | 0,0 | 0.79,0.7 | 1.57,1 | 2.36,0.7 | 3.14,0 | 3.93,-0.7 | 4.71,-1 | 5.5,-0.7 | 6.28,0 | domain:-7,7,-1.5,1.5 @@@',

    // 🆕 Fonction cubique (courbe en S)
    cubique: '@@@ Fonction cubique | -3,-13.5 | -2,-4 | -1,-0.5 | 0,0 | 1,0.5 | 2,4 | 3,13.5 | domain:-4,4,-15,15 @@@',

    // 🆕 Fonction rationnelle (U)
    rationnelle_u: '@@@ Fonction rationnelle | -4,4.25 | -3,3.33 | -2,3 | -1,3 | -0.5,3.25 | -0.2,4,open | 0.2,4,open | 0.5,3.25 | 1,3 | 2,3 | 3,3.33 | 4,4.25 | domain:-5,5,2,5 @@@',
};

/**
 * Détecte si un exercice/question nécessite un graphique
 */
export function detectGraphNeed(text: string, previousGraphCount: number = 0): GraphDetectionResult {
    const lowerText = text.toLowerCase();
    const detectedKeywords: string[] = [];
    let concept = '';

    // 1. Parcourt tous les types de mots-clés
    for (const [category, keywords] of Object.entries(GRAPH_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                detectedKeywords.push(keyword);
                if (!concept) concept = category;
            }
        }
    }

    // 2. Si des mots-clés sont détectés, une courbe est nécessaire
    const needsGraph = detectedKeywords.length > 0;

    // 3. Suggère un template approprié
    let suggestedGraph: string | undefined;

    if (needsGraph) {
        // Logique de sélection du template
        if (concept === 'lectureGraphique' || concept === 'imageAnteced') {
            // Pour les lectures graphiques basiques, utilise une courbe variée
            suggestedGraph = GRAPH_TEMPLATES.croiss_decrois;
        } else if (concept === 'variations') {
            if (lowerText.includes('maximum')) {
                suggestedGraph = GRAPH_TEMPLATES.avec_maximum;
            } else if (lowerText.includes('minimum')) {
                suggestedGraph = GRAPH_TEMPLATES.avec_minimum;
            } else {
                suggestedGraph = GRAPH_TEMPLATES.croiss_decrois;
            }
        } else if (concept === 'signes') {
            suggestedGraph = GRAPH_TEMPLATES.parabole_positive;
        } else if (lowerText.includes('affine')) {
            suggestedGraph = lowerText.includes('crois')
                ? GRAPH_TEMPLATES.affine_croissante
                : GRAPH_TEMPLATES.affine_decroissante;
        } else if (lowerText.includes('second degré') || lowerText.includes('parabole')) {
            suggestedGraph = GRAPH_TEMPLATES.parabole_positive;
        } else if (lowerText.includes('homographique') || lowerText.includes('1/x')) {
            suggestedGraph = GRAPH_TEMPLATES.homographique;
        } else {
            // Template par défaut : fonction générique avec variations
            suggestedGraph = GRAPH_TEMPLATES.croiss_decrois;
        }
    }

    return {
        needsGraph,
        keywords: detectedKeywords,
        suggestedGraph,
        concept
    };
}

/**
 * Analyse une série d'exercices et identifie ceux sans courbe
 */
export function analyzeExercisesForGraphs(content: string): {
    exercisesNeedingGraphs: number[];
    totalExercises: number;
    fixes: string[];
} {
    const fixes: string[] = [];
    const exercisesNeedingGraphs: number[] = [];

    // Détecte les exercices (Exercice 1, Exercice 2, etc.)
    const exerciseRegex = /(?:exercice|question)\s+(\d+)|(\d+)\)\s+/gi;
    const exercises = content.split(exerciseRegex).filter(Boolean);

    if (exercises.length <= 1) {
        // Pas de structure multi-exercices, analyse globale
        const detection = detectGraphNeed(content);
        if (detection.needsGraph && !content.includes('@@@')) {
            fixes.push(`Graphique manquant détecté (concepts: ${detection.keywords.join(', ')})`);
            exercisesNeedingGraphs.push(1);
        }
        return { exercisesNeedingGraphs, totalExercises: 1, fixes };
    }

    // Analyse chaque exercice
    exercises.forEach((exercise, index) => {
        const detection = detectGraphNeed(exercise);
        const hasGraph = exercise.includes('@@@') || exercise.includes('[FIGURE');

        if (detection.needsGraph && !hasGraph) {
            exercisesNeedingGraphs.push(index + 1);
            fixes.push(`Exercice ${index + 1}: graphique manquant (mots-clés: ${detection.keywords.slice(0, 2).join(', ')})`);
        }
    });

    return {
        exercisesNeedingGraphs,
        totalExercises: exercises.length,
        fixes
    };
}

/**
 * Injecte automatiquement des courbes manquantes
 */
export function injectMissingGraphs(content: string): {
    content: string;
    injections: number;
    message: string;
} {
    let enhanced = content;
    let injections = 0;
    const analysis = analyzeExercisesForGraphs(content);

    if (analysis.exercisesNeedingGraphs.length === 0) {
        return { content, injections: 0, message: 'Aucun graphique manquant détecté' };
    }

    // Stratégie : Détecte les sections sans graphique et en ajoute
    // On recherche les mots-clés et insère le graphique juste après le paragraphe concerné

    const lines = enhanced.split('\n');
    const newLines: string[] = [];
    let inGraphContext = false;
    let graphInjected = false;

    lines.forEach((line, index) => {
        newLines.push(line);

        const detection = detectGraphNeed(line);

        // Si la ligne nécessite un graphique et n'en a pas
        // DÉSACTIVÉ : L'injection de templates génériques cause des erreurs mathématiques.
        // On préfère que l'IA génère ses propres points précis.
        /*
        if (detection.needsGraph && !graphInjected) {
            // ...
        }
        */

        // Reset après un certain nombre de lignes
        if (line.trim() === '' || line.match(/^#{1,3}\s/)) {
            graphInjected = false;
        }
    });

    enhanced = newLines.join('\n');

    return {
        content: enhanced,
        injections,
        message: `${injections} graphique(s) injecté(s) automatiquement`
    };
}

/**
 * Crée un graphique personnalisé à partir de points textuels
 * Exemple: "fonction croissante de -2 à 3, puis décroissante"
 */
export function generateGraphFromDescription(description: string): string {
    const lower = description.toLowerCase();

    // Détection de patterns
    if (lower.includes('croissante') && lower.includes('décroissante')) {
        return GRAPH_TEMPLATES.croiss_decrois;
    } else if (lower.includes('maximum')) {
        return GRAPH_TEMPLATES.avec_maximum;
    } else if (lower.includes('minimum')) {
        return GRAPH_TEMPLATES.avec_minimum;
    } else if (lower.includes('parabole')) {
        return GRAPH_TEMPLATES.parabole_positive;
    } else if (lower.includes('affine')) {
        return GRAPH_TEMPLATES.affine_croissante;
    } else {
        return GRAPH_TEMPLATES.croiss_decrois;
    }
}
