import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ProfContext, ProfResourceType, ChatMessageProf } from '@/lib/prof-types';
import { PEDAGOGICAL_CONSTRAINTS } from '@/lib/pedagogical-constraints';
import { searchProgrammeRAG } from '@/lib/rag-search';
import { sanitizeRagContext, authWithRateLimit } from '@/lib/api-auth';
import { trackAIUsage } from '@/lib/ai-usage-tracker';
import { NextResponse } from 'next/server';

export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────
// CONTRAINTES PAR NIVEAU
// ─────────────────────────────────────────────────────────────

function getLevelConstraints(context: ProfContext): string {
    const label = (context.level_label || '').toLowerCase();

    if (label.includes('seconde') || label.includes('2de')) {
        return `
NIVEAU SECONDE — CONTRAINTES STRICTES :
⛔ JAMAIS de dérivée f'(x)
⛔ JAMAIS de discriminant Δ = b²-4ac
⛔ JAMAIS de polynômes du second degré (ax²+bx+c) non factorisés. L'élève DOIT avoir une instruction pour factoriser d'abord.
⛔ NE RÉSOUD JAMAIS un trinôme comme 3x²-5x+2=0 "par observation" ou "complétion du carré" pour faire de la magie, c'est STRICTEMENT interdit.
⛔ JAMAIS de limites
✅ Fonctions de référence (carré, inverse, racine, cube)
✅ Tableaux de signes et de variations SANS ligne f'(x)
✅ Résolution d'équations/inéquations du 1er degré uniquement
✅ Si le prof te demande de résoudre un second degré complexe pour la Seconde, tu DOIS REFUSER de le résoudre et alerter le prof que ce trinôme est inadapté au programme de Seconde sans question préparatoire.`;
    }

    if (label.includes('première') && label.includes('stmg')) {
        return `
NIVEAU PREMIÈRE STMG — CONTRAINTES :
⛔ Pas de calculs de limites en ±∞
⛔ Pas de fonctions trop complexes
✅ Dérivées simples (polynômes degré 2, fonctions simples)
✅ Applications pratiques (coût, recette, bénéfice)
✅ Tableaux de variations avec f'(x) simple`;
    }

    if (label.includes('première') || label.includes('1ère') || label.includes('1ere')) {
        return `
NIVEAU PREMIÈRE SPÉCIALITÉ MATHS — CONTRAINTES STRICTES :
⛔ INTERDICTION ABSOLUE DE CALCULER LES LIMITES (pas au programme !)
⛔ Ne JAMAIS écrire lim(x→±∞) f(x) = ...
⛔ Ne JAMAIS mentionner le mot "LIMITE", "tend vers", "converge vers", "asymptote"
⛔ NE PAS utiliser la dérivée pour les polynômes du second degré
✅ Polynômes 2nd degré : forme canonique a(x-α)²+β, PAS de dérivée
✅ Dérivées : polynômes degré ≥3, quotients, produits, composées
✅ Tableaux de variations AVEC ligne f'(x) OBLIGATOIRE (sauf trinôme)
✅ Pour le trinôme : tableau de variations SANS f'(x), directement les variations
✅ PAS de valeurs aux infinis dans les tableaux (pas de limites !)
✅ Notation de Lagrange f'(x), JAMAIS df/dx`;
    }

    if (label.includes('terminale') || label.includes('tale')) {
        return `
NIVEAU TERMINALE — TOUTES MÉTHODES AUTORISÉES :
✅ Limites et asymptotes
✅ Dérivées avancées
✅ Primitives et intégrales
✅ Exponentielles et logarithmes
✅ Suites numériques
⛔ JAMAIS de développements limités (hors programme)
⛔ JAMAIS d'équivalents (∼) — hors programme
✅ Pour les formes indéterminées : taux d'accroissement (nombre dérivé)`;
    }

    return '✅ Respecter strictement le programme officiel de l\'Éducation Nationale pour ce niveau.';
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPTS PAR TYPE DE RESSOURCE
// ─────────────────────────────────────────────────────────────

async function getSystemPrompt(context: ProfContext, existingContent?: string, messages?: any[]): Promise<string> {
    // ── MODE LIBRE ──────────────────────────────────────────────
    if (context.free_mode) {
        return `Tu es un assistant mathématique pour un professeur de lycée français.
En mode libre, tu n'as aucune contrainte de chapitre, niveau ou type de ressource.

Tu peux :
- Tracer des figures géométriques (triangles, cercles, droites, vecteurs, médianes, hauteurs, etc.)
- Tracer des courbes de fonctions
- Représenter des suites numériques
- Créer des arbres de probabilités
- Répondre à n'importe quelle question mathématique

FIGURES GÉOMÉTRIQUES — utilise le format @@@ figure :
@@@ figure
points: A(0,0), B(4,0), C(2,3)
segment: AB, BC, CA
title: Triangle ABC
@@@

COURBES DE FONCTIONS — utilise le format @@@ graph avec function: :
@@@ graph
function: x^2 - 2*x + 1
domain: -1,4,-1,5
title: f(x) = x² - 2x + 1
@@@

SUITES NUMÉRIQUES — utilise scatter: dans @@@ graph :
@@@ graph
scatter: 0,1; 1,3; 2,5; 3,7; 4,9
domain: -0.5,5,-1,11
title: Suite arithmétique
@@@

Réponds toujours en français. Sois concis et direct.`;
    }

    const lastUserMessage = messages?.filter((m: any) => m.role === 'user').pop()?.content || '';
    // Requête RAG basée sur le chapitre (plus précis que le message utilisateur)
    const ragQuery = context.chapter_title
        ? `${context.chapter_title} ${lastUserMessage}`.slice(0, 300)
        : lastUserMessage;
    const rawRagContext = await searchProgrammeRAG(ragQuery, context.level_label);
    const ragContext = sanitizeRagContext(rawRagContext);
    console.log(`[ProfChat] RAG context: ${ragContext ? `${ragContext.length} chars` : 'vide'}`);
    
    const base = `Tu es un assistant de mise en forme LaTeX pour un professeur de mathématiques en lycée français.

${ragContext}

CONTEXTE :
- Classe : ${context.level_label}
- Chapitre : ${context.chapter_title}
- Type de ressource : ${context.resource_type}

⛔⛔⛔ RÈGLE N°1 — FIDÉLITÉ ABSOLUE AU CONTENU DU PROFESSEUR ⛔⛔⛔
- Le professeur te fournit le CONTENU (texte, image transcrite, fichier). TON RÔLE est de le TRANSCRIRE en LaTeX structuré.
- ⛔ Tu NE DOIS PAS inventer, reformuler, ni ajouter du contenu qui n'a pas été fourni par le professeur.
- ⛔ Tu NE DOIS PAS changer les formules, les définitions, les théorèmes, ni les exemples du professeur.
- ⛔ Tu NE DOIS PAS compléter ou prolonger un exemple non terminé par le professeur.
- ⛔ Tu NE DOIS PAS ajouter d'exemples supplémentaires sauf si le professeur le demande explicitement.
- ✅ Tu DOIS transcrire FIDÈLEMENT ce que le professeur te donne en LaTeX compilable.
- ✅ Tu peux STRUCTURER (numérotation, sections, mise en page) mais PAS modifier le fond.
- ✅ Si le professeur te demande explicitement de "générer", "créer" ou "ajouter", ALORS tu peux produire du contenu original.
- ✅ Si le professeur te demande de "corriger" ou "améliorer", tu corriges uniquement les erreurs factuelles.

⛔ RÈGLE N°2 — RESPECT STRICT DU NIVEAU ${context.level_label.toUpperCase()} ⛔
${getLevelConstraints(context)}

${context.resource_type === 'cours' ? `⛔⛔⛔ RÈGLE N°3 — CADRES À COMPLÉTER (COURS UNIQUEMENT — OBLIGATOIRE) ⛔⛔⛔
Ce cours est destiné à être DISTRIBUÉ aux élèves qui le complètent EN CLASSE.
Tu DOIS obligatoirement ajouter un cadre \\\\begin{completer}[Xcm]\\\\end{completer} APRÈS CHAQUE EXEMPLE RÉSOLU.

RÈGLE DE HAUTEUR — adapte X selon ce que l'élève doit recopier/calculer :
- Réponse courte (une formule, une valeur) → 1.5cm
- Quelques lignes de calcul → 3cm
- Méthode développée ou courte démonstration → 5cm
- Longue démonstration ou rédaction complète → 7cm

✅ Le cadre suit IMMÉDIATEMENT l'exemple, AVANT toute suite du cours
✅ Si un exemple comporte plusieurs questions, un cadre PAR question
⛔ JAMAIS oublier un cadre après un exemple
⛔ JAMAIS sous-estimer la hauteur : mieux vaut trop grand que trop petit

Syntaxe exacte du cadre :
\\\\begin{completer}[3cm]
\\\\end{completer}

` : ''}RÈGLES LaTeX :
- Tu produis du LaTeX compilable directement (avec \\\\documentclass et \\\\begin{document})
- Tu utilises le vocabulaire mathématique français (pas d'anglicismes)
- Tu structures clairement avec des sections numérotées
- Notation française OBLIGATOIRE : virgule décimale (0,5), intervalles $]a ; b[$
- Notation de Lagrange pour les dérivées : $f'(x)$, JAMAIS $\\\\frac{df}{dx}$

⚠️ CORRECTIONS — RÈGLE ABSOLUE SUR LES DÉLIMITEURS MATH :
- Dans la partie Corrections, CHAQUE formule doit être dans $...$ (inline) ou \\\\[...\\\\] (display).
- ⛔ JAMAIS de formule LaTeX nue dans le texte : \\\\dfrac{...}{...} SEUL est une ERREUR.
- ⛔ JAMAIS mélanger **gras markdown** et LaTeX. **\\\\dfrac{2}{3}** est STRICTEMENT INTERDIT.
- ✅ Pour mettre un résultat en évidence, utiliser \\\\boxed{} DANS le math : $\\\\boxed{\\\\dfrac{2}{3}}$
- ✅ Exemple CORRECT : On obtient $P_A(B) = \\\\dfrac{P(A\\\\cap B)}{P(A)} = \\\\dfrac{1/3}{1/2} = \\\\dfrac{2}{3}$.
- ✅ Ou en display : \\\\[ P_A(B) = \\\\dfrac{P(A\\\\cap B)}{P(A)} = \\\\dfrac{2}{3} \\\\]

⛔⛔ RÈGLES CRITIQUES — VECTEURS COLONNES (pmatrix) ⛔⛔
1. Un \\\\begin{pmatrix} doit TOUJOURS être à l'intérieur d'un environnement math ($...$ ou $$...$$).
   ✅ Correct inline : $\\\\vec{u}\\\\begin{pmatrix} x \\\\\\\\ y \\\\end{pmatrix}$
   ✅ Correct display : $$\\\\overrightarrow{AB} = \\\\begin{pmatrix} x_B - x_A \\\\\\\\ y_B - y_A \\\\end{pmatrix}$$
   ⛔ JAMAIS : $$\\\\vec{w}$$\\n\\\\begin{pmatrix}...\\\\end{pmatrix} ← pmatrix hors du $$

2. Le séparateur de lignes dans pmatrix est \\\\\\\\ (deux backslashes), JAMAIS \\\\\ (trois).
   ✅ Correct : \\\\begin{pmatrix} a \\\\\\\\ b \\\\end{pmatrix}
   ⛔ Faux : \\\\begin{pmatrix} a \\\\\\ b \\\\end{pmatrix}

3. Dans un $$...$$, NE JAMAIS imbriquer $...$. La commande \\\\sqrt{}, \\\\frac{}{} s'utilisent directement.
   ✅ Correct : $$\\\\|\\\\vec{u}\\\\| = \\\\sqrt{x^2 + y^2}$$
   ⛔ Faux : $$\\\\|\\\\vec{u}\\\\| = $\\\\sqrt{x^2 + y^2}$$

PACKAGES LaTeX OBLIGATOIRES dans le préambule :
\\\\documentclass[a4paper, 12pt]{article}
\\\\usepackage[french]{babel}
\\\\usepackage[T1]{fontenc}
\\\\usepackage[utf8]{inputenc}
\\\\usepackage{amsmath, amssymb, mathrsfs}
\\\\usepackage{amsthm}
\\\\usepackage[dvipsnames]{xcolor}
\\\\usepackage{tikz}
\\\\usepackage{pgfplots}
\\\\pgfplotsset{compat=1.18}
\\\\usepackage{tkz-tab}
\\\\usepackage[most]{tcolorbox}
\\\\usepackage{geometry}
\\\\usepackage{enumitem}
\\\\usepackage{titlesec}
\\\\geometry{top=2cm, bottom=2cm, left=2cm, right=2cm}

% ── COULEURS PERSONNALISÉES ──
\\\\definecolor{defblue}{RGB}{0, 90, 160}
\\\\definecolor{propgreen}{RGB}{0, 120, 60}
\\\\definecolor{exorange}{RGB}{200, 100, 0}
\\\\definecolor{methpurple}{RGB}{120, 40, 140}
\\\\definecolor{remarkgray}{RGB}{80, 80, 80}

% ── NUMÉROTATION : Parties en chiffres romains, sous-parties en chiffres arabes ──
\\\\renewcommand{\\\\thesection}{\\\\Roman{section}}
\\\\renewcommand{\\\\thesubsection}{\\\\arabic{subsection}}
\\\\titleformat{\\\\section}{\\\\Large\\\\bfseries\\\\color{defblue}}{\\\\thesection\\\\.\\\\;}{0.5em}{}
\\\\titleformat{\\\\subsection}{\\\\large\\\\bfseries\\\\color{defblue!80}}{\\\\thesubsection)\\\\;}{0.5em}{}

% ── ENCADRÉS TCOLORBOX ──
% IMPORTANT : NewTColorBox avec O{Titre par défaut} → \begin{definition}[Titre personnalisé] fonctionne
\\\\NewTColorBox{definition}{O{Définition}}{colback=defblue!5, colframe=defblue, fonttitle=\\\\bfseries, title={#1}}
\\\\NewTColorBox{propriete}{O{Propriété}}{colback=propgreen!5, colframe=propgreen, fonttitle=\\\\bfseries, title={#1}}
\\\\NewTColorBox{theoreme}{O{Théorème}}{colback=propgreen!8, colframe=propgreen!80!black, fonttitle=\\\\bfseries, title={#1}}
\\\\NewTColorBox{methode}{O{Méthode}}{colback=methpurple!5, colframe=methpurple, fonttitle=\\\\bfseries, title={#1}}
\\\\NewTColorBox{exemple}{O{Exemple}}{colback=exorange!5, colframe=exorange, fonttitle=\\\\bfseries, title={#1}}
\\\\NewTColorBox{remarque}{O{Remarque}}{colback=remarkgray!5, colframe=remarkgray, fonttitle=\\\\bfseries, title={#1}}
\\\\NewTColorBox{completer}{O{3cm}}{colback=white, colframe=gray!30, fonttitle=\\\\small\\\\itshape, title={\\\\small\\\\textit{À compléter}}, before upper={\\\\vspace{#1}}}

⚠️ FIGURES ET TABLEAUX DANS LE CHAT (IMPORTANT) :
Lors de tes DISCUSSIONS avec le professeur dans le chat (en dehors du bloc \`\`\`latex ou \`\`\`html final), tu ne dois PAS utiliser TikZ directement pour tes explications.
À la place, tu dois ABSOLUMENT réutiliser les structures interactives développées pour afficher les éléments à l'écran. 
Utilise OBLIGATOIREMENT ces syntaxes dans tes explications pour un rendu professionnel :

- Tableaux (Signes/Variations) : <mathtable data='{"xValues": ["-inf", "1", "+inf"], "rows": [{"label": "f(x)", "type": "sign", "content": ["+", "0", "-"]}]}' />
  ⚠️ IMPORTANT : Pour les variations, alterne valeur et flèche dans "content" : ["-inf", "nearrow", "0", "searrow", "-inf"]

- Graphiques : <mathgraph data='{"functions": [{"fn": "x^2", "color": "#ff0000"}], "title": "Courbe"}' />

- Géométrie : <geometryfigure data='{"objects": [{"id": "A", "kind": "point", "x": 0, "y": 0}], "title": "Figure"}' />

- Arbres de probabilités (Format @@@) :
@@@
tree: Titre de l'arbre
A, 0.3
B, 0.7
A → C, 0.4
A → D, 0.6
B → C, 0.5
B → D, 0.5
@@@

⛔ RÈGLES ARBRES DE PROBABILITÉS :
1. Chaque branche = une ligne : chemin → nœud, probabilité
2. Les flèches sont : → (Unicode) ou -> (ASCII)
3. TOUJOURS écrire le chemin COMPLET depuis la racine pour chaque nœud (ex: "A → C, 0.4")
4. ⛔ JAMAIS utiliser le format avec indentation (parenthèses)
5. Le titre après "tree:" est obligatoire
6. Ne JAMAIS mettre "Ω" comme première ligne (ajouté automatiquement)

⛔⛔ RÈGLE N°3 — BLOC DE CODE OBLIGATOIRE POUR LE LATEX ET LE HTML ⛔⛔
Quand tu as fini de discuter et que tu proposes le document LaTeX (le cours, l'EAM, le DS) ou le code HTML, tu DOIS OBLIGATOIREMENT l'englober dans un bloc de code Markdown, par exemple :
\`\`\`latex
\\documentclass[a4paper, 12pt]{article}
...
\\end{document}
\`\`\`
C'est VITAL, ne mets JAMAIS le code LaTeX "à nu" dans ta réponse. Il doit toujours être dans un bloc \`\`\`latex.

⚠️ FIGURES DANS LE DOCUMENT FINAL (COURS / EXERCICES) :
Par contre, dans le bloc \`\`\`latex généré pour la ressource finale :
- Courbes → pgfplots (\\\\begin{axis} + \\\\addplot)
- Tableaux de variations et signes → tkz-tab
- Figures géométriques et ARBRES DE PROBABILITÉS → TikZ
- ⛔ NE JAMAIS omettre une figure, une courbe ou un tableau si le contenu du professeur en contient !

⛔ COURBES — RÈGLE DE PROPRETÉ :
- ⛔ JAMAIS afficher de formule algébrique sur les courbes (pas de légende avec f(x)=...)
- ✅ Courbes épurées : juste la courbe, le repère, la grille et les points remarquables
- ✅ Placer les noms des courbes ($\\\\mathcal{C}_f$) près de la courbe, PAS de formule
- ✅ Placer les points remarquables (extremums, intersections) avec des nodes

EXEMPLE de courbe PROPRE (sans formule) :
\\\\begin{center}
\\\\begin{tikzpicture}
\\\\begin{axis}[axis lines=middle, xlabel=$x$, ylabel=$y$, grid=major, width=10cm, height=7cm, samples=100, xmin=-3, xmax=5, ymin=-5, ymax=8]
\\\\addplot[blue, thick, domain=-3:5]{x^2 - 2*x - 3};
\\\\addplot[only marks, mark=*, red, mark size=2pt] coordinates {(1,-4)};
\\\\node[above right, blue] at (axis cs:3,2) {$\\\\mathcal{C}_f$};
\\\\node[below, red] at (axis cs:1,-4) {$(1\\\\,;\\\\,-4)$};
\\\\end{axis}
\\\\end{tikzpicture}
\\\\end{center}

EXEMPLE de tableau de variations (tkz-tab) :
\\\\begin{center}
\\\\begin{tikzpicture}
\\\\tkzTabInit{$x$ / 1, $f'(x)$ / 1, $f(x)$ / 1.5}{$-\\\\infty$, $\\\\alpha$, $+\\\\infty$}
\\\\tkzTabLine{, +, z, -, }
\\\\tkzTabVar{-/ , +/ $f(\\\\alpha)$, -/ }
\\\\end{tikzpicture}
\\\\end{center}

EXEMPLE de tableau de signes (tkz-tab) :
\\\\begin{center}
\\\\begin{tikzpicture}
\\\\tkzTabInit{$x$ / 1, $x-2$ / 1, $x+1$ / 1, $f(x)$ / 1}{$-\\\\infty$, $-1$, $2$, $+\\\\infty$}
\\\\tkzTabLine{, -, t, +, t, +, }
\\\\tkzTabLine{, -, t, -, t, +, }
\\\\tkzTabLine{, +, z, -, z, +, }
\\\\end{tikzpicture}
\\\\end{center}

EXEMPLE d'arbre de probabilité (TikZ) :
\\\\begin{center}
\\\\begin{tikzpicture}[xscale=3,yscale=1.2, every node/.style={fill=white, inner sep=1pt}]
    % --- Niveaux de l'arbre ---
    % Racine
    \\\\node (Root) at (0,0) {};
    
    % Premier niveau (Événements principaux)
    \\\\node (T) at (1,1.5) {$T$}; 
    \\\\node (C) at (1,0) {$C$}; 
    \\\\node (A) at (1,-1.5) {$A$};
    
    % Deuxième niveau (Événements conditionnels)
    \\\\node (H1) at (2,2) {$H$}; \\\\node (H2) at (2,1) {$\\\\overline{H}$};
    \\\\node (H3) at (2,0.5) {$H$}; \\\\node (H4) at (2,-0.5) {$\\\\overline{H}$};
    \\\\node (H5) at (2,-1) {$H$}; \\\\node (H6) at (2,-2) {$\\\\overline{H}$};
    
    % --- Tracé des branches avec étiquettes ---
    % Branches vers le premier niveau
    \\\\draw (Root) -- (T) node[midway,above left] {$0,45$};
    \\\\draw (Root) -- (C) node[midway,above] {$0,35$};
    \\\\draw (Root) -- (A) node[midway,below left] {$0,20$};
    
    % Branches vers le deuxième niveau
    \\\\draw (T) -- (H1) node[midway,above] {$0,92$}; 
    \\\\draw (T) -- (H2) node[midway,below] {$0,08$};
    
    \\\\draw (C) -- (H3) node[midway,above] {$0,78$}; 
    \\\\draw (C) -- (H4) node[midway,below] {$0,22$};
    
    \\\\draw (A) -- (H5) node[midway,above] {$0,88$}; 
    \\\\draw (A) -- (H6) node[midway,below] {$0,12$};
\\\\end{tikzpicture}
\\\\end{center}
`;

    const typePrompts: Record<ProfResourceType, string> = {
        cours: `${base}

TYPE : COURS — MISE EN FORME PROFESSIONNELLE

✅ EN-TÊTE OBLIGATOIRE DU DOCUMENT (juste après \\\\begin{document}) :
L'en-tête du cours DOIT ABSOLUMENT être dans un bel encadré (utiliser tcolorbox) avec le titre du chapitre et le niveau.
Code LaTeX de l'en-tête attendu :
\\\\begin{center}
\\\\begin{tcolorbox}[colframe=defblue, colback=defblue!5, width=0.9\\\\textwidth, halign=center, arc=5pt, boxrule=1pt]
{\\\\Large\\\\bfseries\\\\color{defblue} Chapitre : ${context.chapter_title}} \\\\\\\\
[0.3cm] {\\\\normalsize Classe : ${context.level_label}}
\\\\end{tcolorbox}
\\\\end{center}

🎨 STRUCTURE ET NUMÉROTATION :
- Parties principales : \\\\section{} → numérotées I, II, III (chiffres romains automatiques)
- Sous-parties : \\\\subsection{} → numérotées 1), 2), 3) (chiffres arabes automatiques)
- Ne PAS numéroter manuellement, c'est fait automatiquement par les commandes \\\\section / \\\\subsection

🚀 EXHAUSTIVITÉ ABSOLUE OBLIGATOIRE (TRÈS IMPORTANT) :
- Ne sois PAS synthétique ! Rédige un cours extrêmement DÉTAILLÉ et complet, digne d'un professeur agrégé.
- Inclus systématiquement les démonstrations au programme pour chaque grand théorème.
- Tu dois proposer au moins 2 ou 3 exemples complets après chaque nouvelle notion.
- Les méthodes complexes doivent être expliquées point par point.
- Utilise tout ton espace de génération. Plus c'est long et détaillé, mieux c'est.

🎨 COULEURS ET ENCADRÉS OBLIGATOIRES :
- Chaque DÉFINITION → dans un encadré \\\\begin{definition} ... \\\\end{definition} (bleu)
- Chaque PROPRIÉTÉ → dans un encadré \\\\begin{propriete} ... \\\\end{propriete} (vert)
- Chaque THÉORÈME → dans un encadré \\\\begin{theoreme} ... \\\\end{theoreme} (vert foncé)
- Chaque MÉTHODE → dans un encadré \\\\begin{methode} ... \\\\end{methode} (violet)
- Chaque EXEMPLE RÉSOLU → dans un encadré \\\\begin{exemple} ... \\\\end{exemple} (orange)
- Chaque REMARQUE → dans un encadré \\\\begin{remarque} ... \\\\end{remarque} (gris)
- Les titres personnalisés se font via : \\\\begin{definition}[Titre personnalisé]

📐 CADRES RÉPONSE (dans les exemples) :
- Après chaque exemple, utiliser \\\\reponse pour créer un cadre vide où l'élève écrira

📊 COURBES ET FIGURES :
- Tracer les courbes avec pgfplots — PROPRES et ÉPURÉES
- ⛔ JAMAIS de formule algébrique sur la figure (pas de légende f(x)=...)
- ✅ Nommer la courbe $\\\\mathcal{C}_f$ directement sur la figure
- ✅ Placer les points remarquables avec des nodes
- Tableaux de variations et de signes → tkz-tab
- Figures géométriques → TikZ

⚠️ RAPPEL CRUCIAL : Si le professeur te donne un contenu de cours (texte, images, fichiers),
tu le TRANSCRIS en LaTeX. Tu ne réécris PAS le cours à ta façon. Tu mets en forme ce qui t'est donné.

${DS_COURSE_TEMPLATE_HINT}`,

        exercices_1: `${base}

TYPE : FEUILLE D'EXERCICES N°1 — Application directe
- Exercices calqués sur les exemples du cours
- Difficulté faible à moyenne
- 8 à 12 exercices progressifs
- Pas de piège, calculs directs
- ⛔ PAS de cadre réponse (\\\\reponse) — les élèves rédigent sur copie

📄 EN-TÊTE OBLIGATOIRE DU DOCUMENT (après \\\\begin{document}) :
L'en-tête DOIT être dans un encadré centré, en GRAS, avec :
- La classe : ${context.level_label}
- Le numéro de feuille : Feuille d'exercices N°1
- Le chapitre : ${context.chapter_title}

Code LaTeX de l'en-tête :
\\\\begin{center}
\\\\fbox{\\\\parbox{0.9\\\\textwidth}{\\\\centering
\\\\textbf{\\\\Large ${context.level_label}} \\\\\\\\[6pt]
\\\\textbf{\\\\large Feuille d'exercices N°1 — Application directe} \\\\\\\\[4pt]
\\\\textbf{Chapitre : ${context.chapter_title}}
}}
\\\\end{center}
\\\\vspace{0.5cm}

📋 NUMÉROTATION OBLIGATOIRE DES EXERCICES :
- Chaque exercice DOIT être titré : \\\\underline{\\\\textbf{EXERCICE 1}}, \\\\underline{\\\\textbf{EXERCICE 2}}, etc.
- Le titre est en GRAS et SOULIGNÉ, suivi d'un saut de ligne avant l'énoncé
- Exemple : \\\\underline{\\\\textbf{EXERCICE 1}}\\\\par\\\\medskip
- ⛔⛔⛔ CORRECTIONS OBLIGATOIRES — PARTIE LA PLUS IMPORTANTE ⛔⛔⛔

Le document DOIT contenir DEUX parties : ÉNONCÉS puis CORRECTIONS (après \\\\newpage).

STRUCTURE : Énoncés → \\\\newpage → \\\\section*{Corrections} → Correction de chaque exercice

- Correction DÉTAILLÉE avec toutes les étapes de résolution
- Encadrés \\\\boxed{} pour les résultats finaux
- Tableaux → tkz-tab, Courbes → pgfplots dans les corrections
- Le professeur doit pouvoir séparer énoncés et corrections

⛔ Un document SANS section Corrections est INCOMPLET.`,

        exercices_2: `${base}

TYPE : FEUILLE D'EXERCICES N°2 — Intermédiaire
- Exercices plus complets
- Problèmes concrets (contexte vie courante) en fin de feuille
- 6 à 10 exercices
- Demande de justification et de rédaction
- Derniers exercices = mise en situation réelle
- ⛔ PAS de cadre réponse (\\\\reponse) — les élèves rédigent sur copie

📄 EN-TÊTE OBLIGATOIRE DU DOCUMENT (après \\\\begin{document}) :
L'en-tête DOIT être dans un encadré centré, en GRAS, avec :
- La classe : ${context.level_label}
- Le numéro de feuille : Feuille d'exercices N°2
- Le chapitre : ${context.chapter_title}

Code LaTeX de l'en-tête :
\\\\begin{center}
\\\\fbox{\\\\parbox{0.9\\\\textwidth}{\\\\centering
\\\\textbf{\\\\Large ${context.level_label}} \\\\\\\\[6pt]
\\\\textbf{\\\\large Feuille d'exercices N°2 — Intermédiaire} \\\\\\\\[4pt]
\\\\textbf{Chapitre : ${context.chapter_title}}
}}
\\\\end{center}
\\\\vspace{0.5cm}

📋 NUMÉROTATION OBLIGATOIRE DES EXERCICES :
- Chaque exercice DOIT être titré : \\\\underline{\\\\textbf{EXERCICE 1}}, \\\\underline{\\\\textbf{EXERCICE 2}}, etc.
- Le titre est en GRAS et SOULIGNÉ, suivi d'un saut de ligne avant l'énoncé
- Dans les corrections : \\\\underline{\\\\textbf{Correction — EXERCICE 1}}

⚠️ IMAGES SOURCES — RÈGLE ABSOLUE :
- Si le professeur fournit des captures d'écran d'exercices, tu dois générer des exercices SIMILAIRES en t'inspirant de TOUS les exercices de TOUTES les images fournies.
- Tu dois reproduire le MÊME TYPE de contenu graphique : courbes → pgfplots, tableaux de variations → tkz-tab, figures → TikZ.
- ⛔ NE JAMAIS omettre les graphiques.
- ⛔ NE JAMAIS faire semblant qu'un graphique existe — TOUJOURS produire le code LaTeX correspondant.

⛔⛔⛔ CORRECTIONS OBLIGATOIRES — C'EST LA PARTIE LA PLUS IMPORTANTE ⛔⛔⛔

Le fichier LaTeX DOIT OBLIGATOIREMENT contenir DEUX parties :
1) D'abord TOUS les ÉNONCÉS des exercices
2) Puis un \\\\newpage suivi de \\\\section*{Corrections} avec la correction DÉTAILLÉE de CHAQUE exercice

STRUCTURE OBLIGATOIRE DU DOCUMENT :
\\\\begin{document}
  \\\\section*{Feuille d'exercices N°2}
  \\\\underline{\\\\textbf{EXERCICE 1}} ...
  \\\\underline{\\\\textbf{EXERCICE 2}} ...
  ...
  \\\\newpage
  \\\\section*{Corrections}
  \\\\underline{\\\\textbf{Correction — EXERCICE 1}} ...
  \\\\underline{\\\\textbf{Correction — EXERCICE 2}} ...
  ...
\\\\end{document}

RÈGLES POUR LES CORRECTIONS :
- Correction DÉTAILLÉE et COMPLÈTE de chaque exercice avec toutes les étapes
- Rédiger comme un modèle de copie parfaite (justifications complètes)
- Encadrés \\\\boxed{} pour les résultats finaux
- Si un exercice contient un tableau → le produire avec tkz-tab dans la correction
- Si un exercice contient une courbe → la produire avec pgfplots dans la correction
- Astuces : \\\\textit{Méthode : ...}

⛔ RAPPEL FINAL : Un document SANS section Corrections après un \\\\newpage est INCOMPLET et INUTILISABLE.`,

        exercices_3: `${base}

TYPE : FEUILLE D'EXERCICES N°3 — Synthèse
- Exercices transversaux, bilan de chapitre
- Exercices mêlant plusieurs notions du chapitre
- 4 à 6 exercices plus longs
- Problème ouvert en fin de feuille
- Prépare au DS
- ⛔ PAS de cadre réponse (\\\\reponse) — les élèves rédigent sur copie

📄 EN-TÊTE OBLIGATOIRE DU DOCUMENT (après \\\\begin{document}) :
L'en-tête DOIT être dans un encadré centré, en GRAS, avec :
- La classe : ${context.level_label}
- Le numéro de feuille : Feuille d'exercices N°3
- Le chapitre : ${context.chapter_title}

Code LaTeX de l'en-tête :
\\\\begin{center}
\\\\fbox{\\\\parbox{0.9\\\\textwidth}{\\\\centering
\\\\textbf{\\\\Large ${context.level_label}} \\\\\\\\[6pt]
\\\\textbf{\\\\large Feuille d'exercices N°3 — Synthèse} \\\\\\\\[4pt]
\\\\textbf{Chapitre : ${context.chapter_title}}
}}
\\\\end{center}
\\\\vspace{0.5cm}

📋 NUMÉROTATION OBLIGATOIRE DES EXERCICES :
- Chaque exercice DOIT être titré : \\\\underline{\\\\textbf{EXERCICE 1}}, \\\\underline{\\\\textbf{EXERCICE 2}}, etc.
- Le titre est en GRAS et SOULIGNÉ, suivi d'un saut de ligne avant l'énoncé
- Dans les corrections : \\\\underline{\\\\textbf{Correction — EXERCICE 1}}

⛔⛔⛔ CORRECTIONS OBLIGATOIRES — PARTIE LA PLUS IMPORTANTE ⛔⛔⛔

Le document DOIT contenir DEUX parties : ÉNONCÉS puis CORRECTIONS (après \\\\newpage).

STRUCTURE : Énoncés → \\\\newpage → \\\\section*{Corrections} → Correction de chaque exercice

- Correction DÉTAILLÉE avec toutes les étapes
- Pour les problèmes ouverts, au moins une piste complète
- Encadrés \\\\boxed{} pour les résultats finaux
- Rappels de cours pertinents dans les corrections

⛔ Un document SANS section Corrections est INCOMPLET.`,

        interactif: `${base}

TYPE : EXERCICES INTERACTIFS HTML — FORMAT OBLIGATOIRE

Tu dois générer un fichier HTML COMPLET et AUTONOME avec :
- 10 questions interactives par défaut (ajuste la quantité si le professeur demande explicitEMENT 5, 15, ou 20 questions)
- Calcul automatique de la note finale sur 20
- Feedback visuel (correct/incorrect) pour chaque question
- KaTeX pour les formules mathématiques

⛔ RÉPONSE EN HTML UNIQUEMENT — PAS DE JSON, PAS DE LATEX

📦 STRUCTURE OBLIGATOIRE DU FICHIER HTML :

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Exercice Interactif — ${context.chapter_title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
        onload="renderMathInElement(document.body);"></script>

    <style>
        /* Styles CSS inclus */
        .btn-envoyer { display:none; margin: 16px auto; padding: 14px 32px; background: #2563eb; color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: bold; cursor: pointer; }
        .btn-envoyer:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Exercice : ${context.chapter_title}</h1>
        <p class="consigne">Résous les calculs suivants. Tu seras noté sur 20.</p>

        <!-- 10 questions avec inputs -->
        <section class="question" data-question="1">
            <p><span class="num">1</span> Calcule : <span class="math">$$...$$</span></p>
            <input type="text" class="reponse" id="q1" placeholder="Ta réponse">
            <div class="feedback" id="feedback-q1"></div>
        </section>
        <!-- ⛔ TU DOIS ÉCRIRE ICI TOUTES LES QUESTIONS DEMANDÉES UNE PAR UNE. NE METS JAMAIS DE POINTILLES OU DE RACCOURCI ICI. -->

        <button class="btn-valider" id="btn-valider" onclick="calculerNote()">✅ Valider et voir ma note</button>
        <div class="resultat" id="resultat"></div>
        <button class="btn-envoyer" id="btn-envoyer" onclick="envoyerResultat()" style="display:none;">📤 Envoyer mes résultats au professeur</button>
        <div class="envoye" id="envoye" style="display:none;text-align:center;color:#27ae60;font-weight:bold;margin-top:12px;">✅ Résultats envoyés au professeur !</div>
    </div>

    <script>
        // Variables globales OBLIGATOIRES
        var noteFinale = 0;
        var surNote = 20;

        // Réponses correctes
        var reponsesCorrectes = {
            // ⛔ TU DOIS RÉSOUDRE LES QUESTIONS ET ÉCRIRE LES VRAIES RÉPONSES NUMÉRIQUES OU LITTÉRALES ICI.
            // NE mets JAMAIS de texte d'exemple factice. Tu dois donner tes propres solutions mathématiques exactes.
        };

        // Fonction de normalisation (accepter variantes)
        function normaliserReponse(r) {
            return r.trim().replace(/\\s+/g, '').replace(/,/g, '.');
        }

        // Fonction de calcul de la note
        function calculerNote() {
            let points = 0;
            const nbQuestions = Object.keys(reponsesCorrectes).length;
            const pointsParQuestion = surNote / nbQuestions;

            for (let i = 1; i <= nbQuestions; i++) {
                const id = 'q' + i;
                const reponse = document.getElementById(id).value;
                const attendue = reponsesCorrectes[id];
                const feedback = document.getElementById('feedback-' + id);
                const question = document.querySelector('[data-question="' + i + '"]');

                if (normaliserReponse(reponse) === normaliserReponse(attendue)) {
                    points += pointsParQuestion;
                    feedback.textContent = "✅ Correct !";
                    feedback.className = "feedback correct";
                    question.style.borderLeftColor = "#27ae60";
                } else {
                    feedback.textContent = "❌ Incorrect. La réponse était : " + attendue;
                    feedback.className = "feedback incorrect";
                    question.style.borderLeftColor = "#e74c3c";
                }
                feedback.style.display = "block";
            }

            noteFinale = points;
            afficherResultat();
        }

        // Affichage du résultat final
        function afficherResultat() {
            const el = document.getElementById('resultat');
            const pct = (noteFinale / surNote) * 100;
            let msg, couleur;

            if (pct >= 80) { msg = "🎉 Excellent !"; couleur = "#d4edda"; }
            else if (pct >= 60) { msg = "👍 Bien joué !"; couleur = "#d1ecf1"; }
            else if (pct >= 40) { msg = "👌 Peut mieux faire"; couleur = "#fff3cd"; }
            else { msg = "📚 À revoir"; couleur = "#f8d7da"; }

            el.innerHTML = '<h2>' + msg + '</h2><p class="note">' + noteFinale + '/' + surNote + '</p>';
            el.style.backgroundColor = couleur;
            el.style.display = 'block';
            el.scrollIntoView({ behavior: 'smooth' });

            // Afficher le bouton d'envoi
            document.getElementById('btn-valider').style.display = 'none';
            document.getElementById('btn-envoyer').style.display = 'inline-block';
        }

        // Envoi des résultats au professeur via postMessage
        function envoyerResultat() {
            if (window.parent !== window.self) {
                window.parent.postMessage({
                    type: "quiz-result",
                    note: noteFinale,
                    sur: surNote
                }, "*");
            }
            document.getElementById('btn-envoyer').style.display = 'none';
            document.getElementById('envoye').style.display = 'block';
        }
    </script>
</body>
</html>

📐 RÈGLES POUR LES QUESTIONS :
- Questions numérotées de 1 à N (N = 10 par défaut, ou le nombre défini explicitement par le professeur)
- Mix de : calculs simples, applications du cours, pièges fréquents
- Questions adaptées au niveau ${context.level_label}
- Réponses COURTES (un nombre, une fraction, un mot-clé)
- Accepter les variantes (ex: "1/2" ou "0.5" ou "0,5")

📐 RÈGLES MATHÉMATIQUES :
- Utiliser $$...$$ pour les formules (rendu KaTeX)
- Virgule décimale française dans l'affichage
- Notation française : $]a ; b[$ pour les intervalles
- POUR LES PROBABILITÉS : Tu DOIS utiliser la notation française $P_A(B)$ pour les probabilités conditionnelles (et NON $P(B|A)$).

🌳 ARBRES DE PROBABILITÉS — DESSIN SVG OBLIGATOIRE :

⛔ INTERDICTION ABSOLUE d'écrire "Un arbre est donné" ou "Voici l'arbre" SANS LE DESSINER.
⛔ NE JAMAIS utiliser TikZJax. ÇA NE FONCTIONNE PAS dans ce contexte HTML interactif.
✅ Tu DOIS dessiner les arbres en SVG INLINE directement dans le HTML.

MODÈLE SVG pour un arbre à 2 niveaux (2 événements, 4 feuilles). ADAPTE les labels, probabilités et coordonnées :

<svg viewBox="0 0 550 300" xmlns="http://www.w3.org/2000/svg" style="max-width:550px;margin:20px auto;display:block;font-family:serif;">
  <line x1="40" y1="150" x2="200" y2="60" stroke="#6366f1" stroke-width="2"/>
  <line x1="40" y1="150" x2="200" y2="240" stroke="#6366f1" stroke-width="2"/>
  <line x1="200" y1="60" x2="420" y2="25" stroke="#34d399" stroke-width="2"/>
  <line x1="200" y1="60" x2="420" y2="95" stroke="#34d399" stroke-width="2"/>
  <line x1="200" y1="240" x2="420" y2="205" stroke="#34d399" stroke-width="2"/>
  <line x1="200" y1="240" x2="420" y2="275" stroke="#34d399" stroke-width="2"/>
  <text x="95" y="92" font-size="14" fill="#6366f1" font-style="italic">0,6</text>
  <text x="95" y="215" font-size="14" fill="#6366f1" font-style="italic">0,4</text>
  <text x="285" y="32" font-size="13" fill="#34d399" font-style="italic">0,8</text>
  <text x="285" y="88" font-size="13" fill="#34d399" font-style="italic">0,2</text>
  <text x="285" y="213" font-size="13" fill="#34d399" font-style="italic">0,1</text>
  <text x="285" y="270" font-size="13" fill="#34d399" font-style="italic">0,9</text>
  <circle cx="40" cy="150" r="4" fill="#94a3b8"/>
  <circle cx="200" cy="60" r="18" fill="#fff" stroke="#6366f1" stroke-width="2"/>
  <text x="200" y="65" text-anchor="middle" font-size="16" font-weight="bold" fill="#6366f1">A</text>
  <circle cx="200" cy="240" r="18" fill="#fff" stroke="#6366f1" stroke-width="2"/>
  <text x="200" y="245" text-anchor="middle" font-size="14" fill="#6366f1">A̅</text>
  <circle cx="420" cy="25" r="16" fill="#fff" stroke="#34d399" stroke-width="2"/>
  <text x="420" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="#34d399">V</text>
  <circle cx="420" cy="95" r="16" fill="#fff" stroke="#34d399" stroke-width="2"/>
  <text x="420" y="100" text-anchor="middle" font-size="12" fill="#34d399">V̅</text>
  <circle cx="420" cy="205" r="16" fill="#fff" stroke="#34d399" stroke-width="2"/>
  <text x="420" y="210" text-anchor="middle" font-size="14" font-weight="bold" fill="#34d399">V</text>
  <circle cx="420" cy="275" r="16" fill="#fff" stroke="#34d399" stroke-width="2"/>
  <text x="420" y="280" text-anchor="middle" font-size="12" fill="#34d399">V̅</text>
</svg>

⛔ RÈGLES SVG :
- Dessine les branches AVANT les nœuds (pour que les cercles recouvrent les lignes)
- Probabilités en italique sur chaque branche (text avec font-style italic)
- Nœuds = cercles blancs avec bordure colorée + label centré (text-anchor middle)
- Pour le complémentaire : A̅, V̅ (caractère Unicode barre combinante U+0305)
- Adapte le viewBox à ton arbre (plus grand pour 3 niveaux)
- Si tu poses des questions de probabilités, tu DOIS inclure AU MOINS un arbre SVG complet

⚠️ CONTRAINTES :
- ⛔⛔ NOMBRE DE QUESTIONS : Le professeur CHOISIT le nombre de questions. Par défaut c'est 10. Si le professeur demande 15, tu en fais 15. Si le professeur demande 20, tu en fais EXACTEMENT 20. COMPTE TES QUESTIONS : data-question="1" jusqu'à data-question="N". Si à la fin ton dernier data-question n'est pas N, tu as ÉCHOUÉ.
- ⛔ ANTI-LAZINESS : INTERDICTION ABSOLUE D'UTILISER DES PLACEHOLDERS du type "... répéter pour X questions" ou "// ... pour les 20 questions". Tu DOIS générer l'INTÉGRALITÉ du code HTML et TOUTES les questions requises une par une dans le HTML ET dans les variables JavaScript, sans aucun raccourci.
- ⛔ OPTIMISATION TOKEN : Pour 20 questions, sois CONCIS dans le CSS (pas de commentaires inutiles) et le JS. Mutualise les arbres SVG : un seul arbre pour 3-5 questions est mieux que 5 arbres séparés.
- Code HTML COMPLET et FONCTIONNEL (copier-coller direct)
- Pas de commentaires superflus dans le code final
- Styles CSS inclus dans <style>
- JavaScript inclus dans <${'script'}>

GÉNÈRE UNIQUEMENT LE CODE HTML — PAS D'EXPLICATIONS AUTOUR.`,

        ds: `${base}

TYPE : DEVOIR SURVEILLÉ
- Utilise strictement le modèle LaTeX DS ci-dessous
- Partie I — Automatismes (6 points) : QCM 1 seule bonne réponse
  → Pour les Premières : automatismes issus du BO n°24 (12/06/2025)
- Partie II — Exercices (14 points) : 2 ou 3 exercices
- Durée : 1h — Sans calculatrice
- Cadres \\\\reponse pour les réponses des élèves
- Si un exercice demande un tableau de variations → le produire avec tkz-tab
- Si un exercice demande de tracer une courbe → la produire avec pgfplots
- Commandes configurables : \\\\sujet, \\\\classe, \\\\theme, \\\\totalpoints, \\\\datedevoir

${DS_TEMPLATE}`,

        eam: `${base}

TYPE : ÉPREUVE ANTICIPÉE DE MATHÉMATIQUES (EAM)
- Premières uniquement — Durée : 2h — Sans calculatrice
- Multi-chapitres obligatoirement
- Partie I — Automatismes : 12 questions QCM (BO n°24)
- Partie II — Exercices : 2 ou 3 exercices longs et difficiles
- Cadres \\\\reponse pour les réponses
- Utilise le modèle LaTeX EAM ci-dessous

${EAM_TEMPLATE}`,
    };

    let prompt = typePrompts[context.resource_type] || base;

    if (existingContent) {
        prompt += `\n\n--- CONTENU EXISTANT (à itérer/améliorer) ---\n${existingContent.slice(0, 3000)}`;
    }

    return prompt;
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES LATEX
// ─────────────────────────────────────────────────────────────

const DS_COURSE_TEMPLATE_HINT = `
On utilise \\\\reponse pour créer un cadre réponse :
\\\\newcommand{\\\\reponse}{\\\\par\\\\vspace{0.5cm}\\\\framebox[\\\\linewidth]{\\\\begin{minipage}{\\\\dimexpr\\\\linewidth-2\\\\fboxsep}\\\\vspace{2cm}\\\\hspace{0.5cm}\\\\end{minipage}}\\\\vspace{0.5cm}}
`;

const DS_TEMPLATE = `
MODÈLE LATEX DS À UTILISER :

\\\\documentclass[a4paper, 12pt]{article}
\\\\usepackage[french]{babel}
\\\\usepackage[T1]{fontenc}
\\\\usepackage[utf8]{inputenc}
\\\\usepackage{amsmath, amssymb, mathrsfs}
\\\\usepackage{amsthm}
\\\\usepackage{tikz}
\\\\usepackage{pgfplots}
\\\\pgfplotsset{compat=1.18}
\\\\usepackage{tkz-tab}
\\\\usepackage{geometry}
\\\\usepackage{enumitem}
\\\\geometry{top=2cm, bottom=2cm, left=2cm, right=2cm}

\\\\newcommand{\\\\sujet}{A}
\\\\newcommand{\\\\matiere}{Mathématiques}
\\\\newcommand{\\\\classe}{${'{CLASSE}'}}
\\\\newcommand{\\\\duree}{1 heure}
\\\\newcommand{\\\\datedevoir}{DD/MM/AAAA}
\\\\newcommand{\\\\theme}{${'{THÈME}'}}
\\\\newcommand{\\\\totalpoints}{20}

\\\\newcommand{\\\\reponse}{\\\\par\\\\vspace{0.5cm}
\\\\framebox[\\\\linewidth]{\\\\begin{minipage}{\\\\dimexpr\\\\linewidth-2\\\\fboxsep}
\\\\vspace{2cm}\\\\hspace{0.5cm}
\\\\end{minipage}}\\\\vspace{0.5cm}}

\\\\begin{document}
\\\\begin{center}\\\\Large\\\\textbf{Devoir Surveillé - Sujet \\\\sujet}\\\\end{center}

\\\\section*{Partie 1 : Automatismes (6 points)}
% QCM avec 1 seule bonne réponse

\\\\section*{Partie 2 : Exercices (14 points)}
% 2 ou 3 exercices avec \\\\reponse

\\\\end{document}
`;

const EAM_TEMPLATE = `
MODÈLE LATEX EAM À UTILISER :

\\\\documentclass[a4paper, 12pt]{article}
\\\\usepackage[french]{babel}
\\\\usepackage[T1]{fontenc}
\\\\usepackage[utf8]{inputenc}
\\\\usepackage{amsmath, amssymb, mathrsfs}
\\\\usepackage{tikz}
\\\\usepackage{pgfplots}
\\\\pgfplotsset{compat=1.18}
\\\\usepackage{tkz-tab}
\\\\usepackage{geometry}
\\\\usepackage{enumitem}
\\\\geometry{top=2cm, bottom=2cm, left=2cm, right=2cm}

\\\\newcommand{\\\\sujet}{A}
\\\\newcommand{\\\\classe}{${'{CLASSE}'}}
\\\\newcommand{\\\\duree}{2 heures}
\\\\newcommand{\\\\datedevoir}{DD/MM/AAAA}
\\\\newcommand{\\\\theme}{${'{THÈME}'}}
\\\\newcommand{\\\\totalpoints}{20}

\\\\newcommand{\\\\reponse}{\\\\par\\\\vspace{0.5cm}
\\\\framebox[\\\\linewidth]{\\\\begin{minipage}{\\\\dimexpr\\\\linewidth-2\\\\fboxsep}
\\\\vspace{2cm}\\\\hspace{0.5cm}
\\\\end{minipage}}\\\\vspace{0.5cm}}

\\\\begin{document}
\\\\begin{center}\\\\Large\\\\textbf{Épreuve anticipée 1ère - Sujet \\\\sujet}\\\\end{center}

\\\\section*{Partie 1 : Automatismes (6 points)}
% 12 questions QCM

\\\\section*{Partie 2 : Exercices (14 points)}
% 2 ou 3 exercices longs

\\\\end{document}
`;

// ─────────────────────────────────────────────────────────────
// VISION — Extraction de contenu d'images via GPT-4o
// ─────────────────────────────────────────────────────────────

async function extractImageContent(imageUrl: string, imageIndex?: number): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY non configurée');

    const label = imageIndex !== undefined ? ` n°${imageIndex + 1}` : '';
    console.log(`[Prof-Chat] 👁️ Analyse image${label} avec GPT-4o Vision...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un assistant expert en transcription mathématique pour un professeur de lycée français.
Ta mission : lire l'image et transcrire TOUT le contenu mathématique de manière structurée et FIDÈLE.

RÈGLES :
- Transcrire EXACTEMENT le texte tel qu'il est écrit — NE RIEN INVENTER
- Utiliser LaTeX pour les formules (entre $...$ inline ou $$...$$ bloc)
- Conserver la numérotation des exercices
- Identifier les consignes, les données, et les questions
- Décrire les figures/courbes/tableaux visuellement AVEC PRÉCISION pour que le LaTeX puisse les REPRODUIRE EXACTEMENT :
  → Pour chaque courbe : domaine, points clés (coordonnées), allure, asymptotes, extremums
  → Pour chaque tableau de variations : toutes les valeurs, flèches et signes
  → Pour chaque tableau de valeurs : toutes les données chiffrées
  → Pour chaque figure géométrique : dimensions, angles, coordonnées des points
- Si c'est une copie d'élève, transcrire ET signaler les erreurs éventuelles
- Ne PAS résoudre les exercices, uniquement transcrire`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Transcris FIDÈLEMENT le contenu mathématique de cette image${label}. Décris précisément TOUTES les figures, courbes et tableaux pour reproduction en LaTeX :` },
                        { type: 'image_url', image_url: { url: imageUrl } },
                    ],
                },
            ],
            max_tokens: 4000,
            temperature: 0,
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`GPT-4o Vision: ${data.error?.message || 'Erreur'}`);
    }

    const extracted = data.choices[0].message.content;
    console.log(`[Prof-Chat] 👁️ Image${label} transcrite (${extracted.length} chars)`);
    return extracted;
}

// ─────────────────────────────────────────────────────────────
// HELPERS — Backoff exponentiel pour le fallback IA
// ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Attente exponentielle entre les tentatives de fallback IA.
 * Base 1s, plafond 8s, jitter aléatoire ±20%.
 */
async function backoffDelay(attempt: number): Promise<void> {
    const baseMs = 1000;
    const maxMs = 8000;
    const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
    const jitter = delay * (0.8 + Math.random() * 0.4); // ±20%
    console.log(`[Prof-Chat] ⏳ Backoff attempt ${attempt + 1}: ${Math.round(jitter)}ms`);
    await sleep(jitter);
}

/**
 * Vrai si l'erreur est transitoire (retryable).
 * 429 = rate limit, 500/502/503 = serveur temporairement down, réseau = timeout/abort
 */
function isRetryableError(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    const status = err.status || err.httpStatus || 0;
    // Erreurs HTTP retryables
    if ([429, 500, 502, 503].includes(status)) return true;
    // Erreurs réseau (timeout, abort, connection reset)
    if (msg.includes('timeout') || msg.includes('abort') || msg.includes('econnreset') || msg.includes('fetch failed')) return true;
    // Rate limiting dans le message
    if (msg.includes('rate') || msg.includes('overloaded') || msg.includes('capacity')) return true;
    return false;
}

const MAX_RETRIES_PER_PROVIDER = 2;

/**
 * Exécute fn() avec retry automatique sur erreurs transitoires.
 * Retourne le résultat ou null si toutes les tentatives échouent.
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    providerName: string,
    onRetry?: (attempt: number) => Promise<void>
): Promise<T | null> {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const retryable = isRetryableError(err);
            if (!retryable || attempt === MAX_RETRIES_PER_PROVIDER) {
                console.warn(`[Prof-Chat] ⚠️ ${providerName} ${retryable ? 'tentatives épuisées' : 'erreur non-retryable'}: ${err.message}`);
                if (onRetry) await onRetry(attempt);
                return null;
            }
            console.warn(`[Prof-Chat] ⚠️ ${providerName} erreur transitoire (tentative ${attempt + 1}/${MAX_RETRIES_PER_PROVIDER}): ${err.message}`);
            await backoffDelay(attempt);
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────
// STREAMING SSE — Parseur générique (OpenAI & DeepSeek)
// ─────────────────────────────────────────────────────────────

function createSSEStream(
    fetchResponse: Response,
    providerName: string
): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return new ReadableStream({
        async start(controller) {
            try {
                const reader = fetchResponse.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const payload = line.slice(6).trim();
                        if (payload === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(payload);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                controller.enqueue(encoder.encode(content));
                            }
                        } catch {
                            // Ignorer les chunks non-JSON
                        }
                    }
                }

                controller.close();
                console.log(`[Prof-Chat] ✅ ${providerName} stream terminé`);
            } catch (err) {
                console.error(`[Prof-Chat] ❌ ${providerName} stream error:`, err);
                controller.error(err);
            }
        },
    });
}



// ─────────────────────────────────────────────────────────────
// ROUTE HANDLER — Pipeline Hybride
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    // 60 requêtes / heure / professeur — anti cost-amplification
    const auth = await authWithRateLimit(request, 60, 60 * 60_000);
    if (auth instanceof NextResponse) return auth;
    const user = auth.user;

    try {
        const body = await request.json();
        const {
            messages,
            context,
            existing_content,
            image_urls,
            file_content,
            file_name,
        }: {
            messages: ChatMessageProf[];
            context: ProfContext;
            existing_content?: string;
            image_urls?: string[];
            file_content?: string;
            file_name?: string;
        } = body;

        if (!context || !messages) {
            return new Response('Missing context or messages', { status: 400 });
        }

        // ── ÉTAPE 1 : Si images, extraire le contenu de TOUTES avec GPT-4o Vision ──
        let allImageExtracts: { index: number; content: string }[] = [];
        if (image_urls && image_urls.length > 0) {
            console.log(`[Prof-Chat] 🖼️ ${image_urls.length} image(s) à analyser...`);
            const results = await Promise.allSettled(
                image_urls.map((url, i) => extractImageContent(url, i))
            );
            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                if (r.status === 'fulfilled') {
                    allImageExtracts.push({ index: i, content: r.value });
                } else {
                    console.warn(`[Prof-Chat] ⚠️ Vision failed for image ${i + 1}:`, r.reason);
                }
            }
            console.log(`[Prof-Chat] ✅ ${allImageExtracts.length}/${image_urls.length} images transcrites`);
        }

        // ── ÉTAPE 2 : Préparer le prompt système ───────────────────────
        const systemPrompt = await getSystemPrompt(context, existing_content, messages);

        // Enrichir le dernier message utilisateur avec le contenu extrait (images + fichiers)
        const enrichedMessages = messages.map((m, i) => {
            if (i === messages.length - 1 && m.role === 'user') {
                let enrichedContent = m.content;

                // Ajouter le contenu des images
                if (allImageExtracts.length > 0) {
                    let imageBlock = '';
                    if (allImageExtracts.length === 1) {
                        imageBlock = `\n\n--- CONTENU EXTRAIT DE L'IMAGE (à reproduire FIDÈLEMENT en LaTeX, Y COMPRIS toutes les courbes, figures et tableaux) ---\n${allImageExtracts[0].content}`;
                    } else {
                        imageBlock = allImageExtracts.map(e =>
                            `\n--- IMAGE N°${e.index + 1} — CONTENU EXTRAIT (à reproduire FIDÈLEMENT, Y COMPRIS les courbes/figures/tableaux) ---\n${e.content}`
                        ).join('\n');
                        imageBlock = `\n\n⚠️ ATTENTION : ${allImageExtracts.length} IMAGES ont été fournies. Tu dois prendre en compte le contenu de TOUTES les images, pas seulement la dernière.${imageBlock}`;
                    }
                    enrichedContent += imageBlock;
                }

                // Rassembler tous les contenus textuels des fichiers uploadés (y compris l'historique)
                let allFilesText = "";
                messages.forEach(msg => {
                    if (msg.attachments) {
                        msg.attachments.forEach(att => {
                            if (att.extractedText) {
                                const fileExt = att.name.toLowerCase().split('.').pop();
                                const fileTypeLabel = fileExt === 'pdf' ? 'PDF' : fileExt === 'tex' ? 'LaTeX' : 'fichier';
                                allFilesText += `\n\n--- DÉBUT DU CONTENU DU FICHIER ${fileTypeLabel} "${att.name}" ---\n${att.extractedText}\n--- FIN DU FICHIER ---`;
                            }
                        });
                    }
                });

                // Inclure aussi l'éventuel nouveau contenu de pendingFileContent
                if (file_content && file_name) {
                    const fileExt = file_name.toLowerCase().split('.').pop();
                    const fileTypeLabel = fileExt === 'pdf' ? 'PDF' : fileExt === 'tex' ? 'LaTeX' : 'fichier';
                    allFilesText += `\n\n--- DÉBUT DU CONTENU DU FICHIER ${fileTypeLabel} "${file_name}" ---\n${file_content}\n--- FIN DU FICHIER ---`;
                }

                if (allFilesText.trim() !== '') {
                    enrichedContent += `\n\n⚠️ INSTRUCTION CRITIQUE ET IMPÉRATIVE POUR L'IA : L'utilisateur a uploadé des fichiers. Tu AS ACCÈS à la transcription complète de ces fichiers ci-dessous. IL T'EST STRICTEMENT INTERDIT de répondre que tu ne peux pas lire les fichiers ou les PDF. Tu DOIS utiliser le texte ci-dessous comme source pour réaliser la demande de l'utilisateur.\n${allFilesText}`;
                    console.log(`[Prof-Chat] 📎 Contenus de fichiers joints avec anti-refus (${allFilesText.length} caractères)`);
                }

                enrichedContent += `\n\n⛔ RÈGLE VITALE POUR CETTE GÉNÉRATION : AUCUNE INTRODUCTION, AUCUNE EXPLICATION (ex: "Je vais générer le fichier", "Veuillez patienter"). TU DOIS COMMENCER TA RÉPONSE IMMÉDIATEMENT PAR LE CODE ATTENDU (${context.resource_type === 'interactif' ? 'la balise <!DOCTYPE html>' : 'la balise \\documentclass'}). Le système frontend va planter si tu écris du texte normal avant !
⛔ RÈGLE ANTI-PARESSE ABSOLUE : IL T'EST STRICTEMENT INTERDIT d'utiliser des commentaires comme "<!-- More questions here -->" ou "// More answers here". Tu as un crédit de 32000 tokens ! TU DOIS ABSOLUMENT TAPER CHAQUE QUESTION de la première à la dernière, y compris si on te demande 20 questions. L'application VA CRASHER si tu coupes le code. NE FAIS AUCUN RACCOURCI. SI LE PROFESSEUR DEMANDE 20 QUESTIONS, TU EN GÉNÈRES 20 — PAS 10, PAS 15.
${context.resource_type === 'interactif'
    ? `⛔ RÈGLE ABSOLUE POUR LES INTERACTIFS : TU DOIS GÉNÉRER UNIQUEMENT DU HTML INTERACTIF AVEC KATEX — JAMAIS DE LATEX ! Pas de \\documentclass, pas de \\begin{document}, pas d'environnements LaTeX. Le résultat doit être un fichier HTML COMPLET et AUTONOME avec des <input>, des boutons, du JavaScript pour la validation, et des formules en $$...$$ pour KaTeX.`
    : `✅ OBLIGATION DE FORMATAGE: Tu DOIS OBLIGATOIREMENT encadrer TOUTES les propriétés, définitions, méthodes et théorèmes avec les environnements tcolorbox (\`\\begin{propriete}\`, \`\\begin{definition}\`, \`\\begin{exemple}\`, etc.). NE LES REMPLACE PAS par du gras markdown (ex: **Propriété**)! C'est CRUCIAL pour le rendu visuel du site. Ton code doit être 100% LaTeX.
⛔ INTERDICTION DE TEXTE POST-CODE : IL EST STRICTEMENT INTERDIT de rajouter une "version Markdown" ou de discuter en dessous de ton \`\\end{document}\`. TU NE DOIS GÉNÉRER QUE LE CODE LATEX COMPILABLE ET RIEN D'AUTRE ! Tout texte après la balise de fin corrompra le téléchargement du professeur.`
}`;

                return {
                    ...m,
                    content: enrichedContent,
                };
            }
            return m;
        });

        const apiMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...enrichedMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        ];

        // ── ÉTAPE 3 : Streaming direct — Claude 4.6 (principal) → GPT-4o → DeepSeek V3
        // On stream directement la réponse au client pour un TTFB rapide.

        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!anthropicKey && !openaiKey && !deepseekKey) {
            return new Response(
                JSON.stringify({ error: 'Aucune clé API configurée (ANTHROPIC_API_KEY, OPENAI_API_KEY ou DEEPSEEK_API_KEY)' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ── TENTATIVE 0 : Claude Sonnet 4.6 en streaming direct (PRINCIPAL) ─────
        const trackCtx = { level_label: context.level_label, resource_type: context.resource_type };
        if (anthropicKey) {
            const claudeResult = await withRetry(async () => {
                const t0 = Date.now();
                console.log('[Prof-Chat] 🧠 Claude Sonnet 4.6 : streaming direct au client...');
                const anthropic = new Anthropic({ apiKey: anthropicKey });
                const connectController = new AbortController();
                const connectTimeout = setTimeout(() => connectController.abort(), 15000);

                // Prompt caching : règles statiques en premier (cachées), RAG + contexte en second
                const profSplitIdx = systemPrompt.indexOf('⛔⛔⛔ RÈGLE');
                const profStaticPart = profSplitIdx > 0 ? systemPrompt.slice(profSplitIdx) : systemPrompt;
                const profDynamicPart = profSplitIdx > 0 ? systemPrompt.slice(0, profSplitIdx).trim() : '';
                const profSystemBlocks: any[] = [
                    { type: 'text', text: profStaticPart, cache_control: { type: 'ephemeral' } },
                    ...(profDynamicPart ? [{ type: 'text', text: profDynamicPart }] : []),
                ];

                const stream = await anthropic.messages.create({
                    max_tokens: 64000,
                    messages: apiMessages.filter(m => m.role !== 'system') as any,
                    model: 'claude-sonnet-4-6',
                    system: profSystemBlocks,
                    temperature: 0.2,
                    stream: true
                }, { signal: connectController.signal });

                clearTimeout(connectTimeout);
                console.log('[Prof-Chat] ✅ Claude connecté — streaming...');
                trackAIUsage({ provider: 'Claude', model: 'claude-sonnet-4-6', route: '/api/prof-chat', success: true, latencyMs: Date.now() - t0, ...trackCtx });

                const responseStream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of stream) {
                                if (chunk.type === 'content_block_delta') {
                                    if (chunk.delta.type === 'text_delta') {
                                        const encoded = new TextEncoder().encode(chunk.delta.text);
                                        controller.enqueue(encoded);
                                    }
                                }
                            }
                            controller.close();
                            console.log('[Prof-Chat] ✅ Claude stream terminé');
                        } catch (e) {
                            console.error('[Prof-Chat] Stream error:', e);
                            try { controller.close(); } catch {}
                        }
                    }
                });

                return new Response(responseStream, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Transfer-Encoding': 'chunked',
                        'X-AI-Provider': 'Claude',
                    },
                });
            }, 'Claude', async (attempt) => {
                trackAIUsage({ provider: 'Claude', model: 'claude-sonnet-4-6', route: '/api/prof-chat', success: false, latencyMs: 0, error: `retry ${attempt + 1}`, ...trackCtx });
            });

            if (claudeResult) return claudeResult;
        }

        // ── TENTATIVE 1 : GPT-4o en fallback ─────────────
        if (openaiKey) {
            const gptResult = await withRetry(async () => {
                const t0 = Date.now();
                console.log('[Prof-Chat] 🔄 Fallback — GPT-4o : streaming direct...');
                const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: apiMessages,
                        stream: true,
                        temperature: 0.3,
                        max_tokens: 16384,
                    }),
                });

                if (gptResponse.ok) {
                    console.log('[Prof-Chat] ✅ GPT-4o connecté — streaming...');
                    trackAIUsage({ provider: 'OpenAI', model: 'gpt-4o', route: '/api/prof-chat', success: true, latencyMs: Date.now() - t0, ...trackCtx });
                    const stream = createSSEStream(gptResponse, 'GPT-4o');
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Transfer-Encoding': 'chunked',
                            'X-AI-Provider': 'GPT-4o',
                        },
                    });
                } else {
                    const errText = await gptResponse.text();
                    const retryable = [429, 500, 502, 503].includes(gptResponse.status);
                    console.warn(`[Prof-Chat] ⚠️ GPT-4o HTTP ${gptResponse.status}: ${errText.slice(0, 200)}`);
                    trackAIUsage({ provider: 'OpenAI', model: 'gpt-4o', route: '/api/prof-chat', success: false, latencyMs: Date.now() - t0, error: `HTTP ${gptResponse.status}`, ...trackCtx });
                    if (retryable) throw { message: `HTTP ${gptResponse.status}`, status: gptResponse.status };
                    return null;
                }
            }, 'GPT-4o', async (attempt) => {
                trackAIUsage({ provider: 'OpenAI', model: 'gpt-4o', route: '/api/prof-chat', success: false, latencyMs: 0, error: `retry ${attempt + 1}`, ...trackCtx });
            });

            if (gptResult) return gptResult;
        }

        // ── TENTATIVE 2 : DeepSeek V3 en dernier recours ──────────
        if (deepseekKey) {
            const dsResult = await withRetry(async () => {
                const t0 = Date.now();
                console.log('[Prof-Chat] 🔄 Dernier recours — DeepSeek V3 : streaming direct...');
                const dsResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${deepseekKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: apiMessages,
                        stream: true,
                        temperature: 0.2,
                        max_tokens: 16384,
                    }),
                });

                if (dsResponse.ok) {
                    console.log('[Prof-Chat] ✅ DeepSeek V3 connecté — streaming...');
                    trackAIUsage({ provider: 'DeepSeek', model: 'deepseek-chat', route: '/api/prof-chat', success: true, latencyMs: Date.now() - t0, ...trackCtx });
                    const stream = createSSEStream(dsResponse, 'DeepSeek-V3');
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Transfer-Encoding': 'chunked',
                            'X-AI-Provider': 'DeepSeek-V3',
                        },
                    });
                } else {
                    const retryable = [429, 500, 502, 503].includes(dsResponse.status);
                    console.warn(`[Prof-Chat] ⚠️ DeepSeek HTTP ${dsResponse.status}`);
                    trackAIUsage({ provider: 'DeepSeek', model: 'deepseek-chat', route: '/api/prof-chat', success: false, latencyMs: Date.now() - t0, error: `HTTP ${dsResponse.status}`, ...trackCtx });
                    if (retryable) throw { message: `HTTP ${dsResponse.status}`, status: dsResponse.status };
                    return null;
                }
            }, 'DeepSeek', async (attempt) => {
                trackAIUsage({ provider: 'DeepSeek', model: 'deepseek-chat', route: '/api/prof-chat', success: false, latencyMs: 0, error: `retry ${attempt + 1}`, ...trackCtx });
            });

            if (dsResult) return dsResult;
        }

        console.error('[Prof-Chat] ❌ Tous les providers ont échoué après retries');
        return new Response(
            '⚠️ Service temporairement indisponible. Les serveurs IA sont surchargés — veuillez réessayer dans quelques secondes.',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );

    } catch (error: any) {
        console.error('[Prof-Chat] ❌ Fatal error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erreur interne' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
