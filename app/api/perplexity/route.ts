
import { NextRequest, NextResponse } from 'next/server';
import { fixLatexContent } from '@/lib/latex-fixer';
import { injectMissingGraphs } from '@/lib/graph-enhancer';
import { PEDAGOGICAL_CONSTRAINTS } from '@/lib/pedagogical-constraints';

/**
 * Route API Hybride en Streaming pour mimimaths@i
 * Avec POST-TRAITEMENT INTELLIGENT (LaTeX + Graphiques)
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();
        console.log('📬 API RECEIVED:', { messagesCount: messages.length, context });
        const perplexityKey = process.env.PERPLEXITY_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.DEEP_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!perplexityKey || (!deepseekKey && !openaiKey)) {
            return NextResponse.json({ error: 'Configurations API manquantes' }, { status: 500 });
        }

        const userQuestion = messages[messages.length - 1].content;

        // 1. RECHERCHE RAPIDE avec SOURCES OFFICIELLES PRIORITAIRES (Perplexity)
        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: "Tu es un documentaliste spécialisé dans les ressources de l'Éducation Nationale française."
                    },
                    { role: 'user', content: `Programme officiel lycée sur : ${userQuestion} (${context})` }
                ],
                temperature: 0.1,
            }),
        });

        const searchData = await searchResponse.json();
        if (!searchResponse.ok) {
            console.error('❌ Perplexity Error:', searchData);
            throw new Error(`Perplexity API error: ${searchResponse.status}`);
        }
        const curriculumContext = searchData.choices[0].message.content;
        console.log('✅ Perplexity Search Success');

        // 2. RÉPONSE (Moteur de raisonnement)
        const reasoningPrompt = "Tu es mimimaths@i, tuteur expert en mathématiques (programme français).\n" +
            "CONSIGNE TERMINOLOGIQUE (IMPÉRATIF) :\n" +
            "- N'utilise JAMAIS 'queue' ou 'tête' pour les vecteurs. Utilise exclusivement 'origine' et 'extrémité'.\n" +
            "CONSIGNE MATHÉMATIQUE (IMPÉRATIF) :\n" +
            "- PROBABILITÉS (RÈGLE ABSOLUE) : Le mot 'probabilité' ne doit JAMAIS être suivi d'un pourcentage. Dis 'La probabilité de E est 0,15' et JAMAIS 'La probabilité de E est 15 %'.\n" +
            "- INTERPRÉTATION : Utilise les % UNIQUEMENT dans des phrases d'interprétation qui ne contiennent pas le mot 'probabilité' (ex: 'Ainsi, 15 % des pannes entraînent une casse').\n" +
            "- NOTATION : Utilise EXCLUSIVEMENT la notation $P_A(B)$ pour les probabilités conditionnelles (pas de $P(B|A)$).\n" +
            "- JUSTIFICATION : Pour la formule des probabilités totales, mentionne TOUJOURS que les événements forment une 'partition de l'univers $\\Omega$'.\n" +
            "- VECTEURS : Absolutely TOUS les vecteurs doivent porter une flèche LaTeX : utilise `\\vec{u}`, `\\vec{AB}`, `\\vec{v}`, etc.\n" +
            "- NE LAISSE JAMAIS un nom de vecteur sans sa flèche (ex : n'écris jamais 'AB' ou 'u' seul si tu parles d'un vecteur).\n" +
            "- RÈGLE DE LANGUE (IMPÉRATIF) : Tu dois t'exprimer EXCLUSIVEMENT en français. Pas de mots anglais, pas d'expressions anglo-saxonnes même pour les variables.\n" +
            "- Intervalle ouvert : $]a, b[$ (et non $(a, b)$).\n" +
            "- DÉCIMALES (IMPÉRATIF) : Utilise EXCLUSIVEMENT la virgule comme séparateur décimal, que ce soit dans le texte ou dans les formules LaTeX (ex: $0,75$ et non $0.75$).\n" +
            "- LE POINT EST INTERDIT pour les décimales, sauf à l'intérieur des blocs techniques @@@.\n" +
            "CONSIGNE FIGURES ET ARBRES @@@ (IMPÉRATIF) :\n" +
            "- Tout contenu spécial (graphique, arbre, géométrie) DOIT impérativement être encadré par trois arobases @@@.\n" +
            "  * CORRECT : @@@ tree:Titre | ... @@@\n" +
            "  * INCORRECT : tree:Titre | ... (sans les @@@)\n" +
            "- FORMAT ARBRE DE PROBABILITÉS : @@@ tree:Titre | Chemin, Probabilité | ... @@@\n" +
            "  * RÈGLE ARBRE (IMPÉRATIF) : Pour TOUT exercice de probabilités, tu DOIS générer cet arbre EN PREMIER dans un bloc @@@.\n" +
            "  * ÉVÉNEMENT CONTRAIRE : Utilise EXCLUSIVEMENT `\\bar{A}` ou `\\overline{A}` pour l'événement contraire (JAMAIS de `A^c` ou `A^\\complement`).\n" +
            "  * STRUCTURE : Commence par le premier niveau, puis les niveaux suivants avec `->`.\n" +
            "  * EXEMPLE COMPLET : @@@ tree:Expérience | Probabilités :root | A, 0.6 | \\bar{A}, 0.4 | A -> G, 0.3 | A -> \\bar{G}, 0.7 | \\bar{A} -> G, 0.8 | \\bar{A} -> \\bar{G}, 0.2 @@@\n" +
            "  * OPTIONS : Utilise `Label :root` pour changer le label du nœud initial (ex: `Ω :root` ou `Départ :root`). 0.5 ou 0,5 sont acceptés.\n" +
            "  * RÈGLE DÉCIMALE : Dans les blocs @@@, utilise de préférence le POINT (ex: 0.5) pour la robustesse. Pas de fractions ni de % dans le bloc @@@.\n" +
            "- RÈGLE COURBE LISSE : Pour une fonction, fournis au moins 8-10 points.\n" +
            "- VECTEURS (MODE ANALYTIQUE/GÉOMÉTRIQUE) :\n" +
            "  1. ANALYTIQUE (avec coordonnées) : @@@ Somme | vector:u,0,0,x1,y1 | ... @@@\n" +
            "  2. GÉOMÉTRIQUE (sans axes) : @@@ Somme | geometry | point:A,0,0 | vector:u,A,B | ... @@@\n" +
            "CONSIGNE TABLEAUX (IMPÉRATIF) :\n" +
            "- Pour TOUT tableau, tu DOIS fournir DEUX versions :\n" +
            "  1. UNE VERSION VISUELLE (@@@ table) : Pour l'affichage immédiat.\n" +
            "  2. UNE VERSION LATEX (tkz-tab) : Pour l'export, SANS TEXTE EXPLICATIF ENTRE LES BRACES.\n" +
            "\n" +
            "MODÈLE VISUEL @@@ table :\n" +
            "@@@ table:Signe de f | x: -inf, 1, 3, +inf | sign: f(x) : +, 0, -, 0, + @@@\n" +
            "\n" +
            "MODÈLE LATEX PRO (tkz-tab) - EXEMPLE RÉEL : \n" +
            "```latex\n" +
            "\\begin{tikzpicture}\n" +
            "\\tkzTabInit[lgt=3,espcl=2]{$x$ / 1, $f(x)$ / 1}{$-\\infty$, $1$, $3$, $+\\infty$}\n" +
            "\\tkzTabLine{, +, 0, -, 0, +}\n" +
            "\\end{tikzpicture}\n" +
            "```\n" +
            "\n" +
            "RÈGLES DE RIGUEUR (TKZ-TAB) :\n" +
            "- Le code LaTeX DOIT impérativement être dans un bloc ```latex ... ```.\n" +
            "- NE RAJOUTE JAMAIS de texte d'explication à l'intérieur des accolades { } de \\tkzTabInit.\n" +
            "- Utilise EXCLUSIVEMENT des dollars $ ... $ pour les symboles mathématiques dans le tableau.\n" +
            "- Pour les variations, utilise le format : \\tkzTabVar{ - / $-\\infty$, + / $2$, - / $-\\infty$ }.\n" +
            "- Pour les valeurs interdites dans \\tkzTabLine, utilise 'd' (double barre) au lieu de 'z' si nécessaire.\n" +
            "\n" +
            "CONSTRAINTES PÉDAGOGIQUES À RESPECTER IMPÉRATIVEMENT :\n" +
            "- Justifier l'étude du signe du discriminant $\\Delta$ pour les polynômes du second degré.\n" +
            "- Toujours citer le théorème utilisé (Théorème des valeurs intermédiaires, etc.).\n" +
            "- DÉCIMALES : Utilise EXCLUSIVEMENT la virgule comme séparateur (ex: 0,5).\n" +
            "- VECTEURS : Flèche impérative $\\vec{u}$.\n" +
            "- PROBABILITÉS : Valeurs entre 0 et 1 (pas de %). Pas de $P(B|A)$, utilise $P_A(B)$.\n" +
            "- INTERVALLES : Style français $]a, b[$.\n" +
            "- Partition de l'univers $\\Omega$ pour les probabilités totales.\n" +
            "\n" +
            "RÉFÉRENCES INSTITUTIONNELLES (À RESPECTER) :\n" +
            "- Tableaux de signes/variations : Culture Math (ENS) https://culturemath.ens.fr/thematiques/aide/tableaux-de-signes-ou-de-variations-en-tex\n" +
            "- Fonctions et courbes : Académie Lyon https://maths.enseigne.ac-lyon.fr/spip/IMG/pdf/09_fonction.pdf\n" +
            "\n" +
            "LISIBILITÉ :\n" +
            "- Français impeccable, pas de citations [1][2], listes à puces pour les calculs.\n" +
            "Sois pédagogue, décompose les étapes, mais donne TOUJOURS le résultat visuel final (graphique/tableau).\n" +
            "CONSTRAINTES PÉDAGOGIQUES À RESPECTER IMPÉRATIVEMENT :\n" + PEDAGOGICAL_CONSTRAINTS + "\n" +
            "Contexte académique : " + curriculumContext;

        if (openaiKey) {
            console.log('🚀 Tentative OpenAI o3-mini (STREAMING)...');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'o3-mini',
                    messages: [{ role: 'system', content: reasoningPrompt }, ...messages],
                    stream: true
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Erreur OpenAI');
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } else {
            console.log('🚀 Tentative DeepSeek (STREAMING)...');
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${deepseekKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'deepseek-reasoner',
                    messages: [{ role: 'system', content: reasoningPrompt }, ...messages],
                    stream: true
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Erreur DeepSeek');
            }

            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }
    } catch (error: any) {
        console.error('Erreur Route API:', error);
        return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
    }
}
