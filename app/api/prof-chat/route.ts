import { NextRequest } from 'next/server';
import type { ProfContext, ProfResourceType, ChatMessageProf } from '@/lib/prof-types';

export const maxDuration = 60;

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
⛔ JAMAIS de polynômes du second degré (ax²+bx+c) — hors programme
⛔ JAMAIS de limites
✅ Fonctions de référence (carré, inverse, racine, cube)
✅ Tableaux de signes et de variations SANS ligne f'(x)
✅ Résolution d'équations/inéquations du 1er degré uniquement
✅ Inéquations factorisables par identités remarquables (SANS Δ)`;
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

function getSystemPrompt(context: ProfContext, existingContent?: string): string {
    const base = `Tu es un assistant de mise en forme LaTeX pour un professeur de mathématiques en lycée français.

CONTEXTE :
- Classe : ${context.level_label}
- Chapitre : ${context.chapter_title}
- Type de ressource : ${context.resource_type}

⛔⛔⛔ RÈGLE N°1 — FIDÉLITÉ ABSOLUE AU CONTENU DU PROFESSEUR ⛔⛔⛔
- Le professeur te fournit le CONTENU (texte, image transcrite, fichier). TON RÔLE est de le TRANSCRIRE en LaTeX structuré.
- ⛔ Tu NE DOIS PAS inventer, reformuler, ni ajouter du contenu qui n'a pas été fourni par le professeur.
- ⛔ Tu NE DOIS PAS changer les formules, les définitions, les théorèmes, ni les exemples du professeur.
- ✅ Tu DOIS transcrire FIDÈLEMENT ce que le professeur te donne en LaTeX compilable.
- ✅ Tu peux STRUCTURER (numérotation, sections, mise en page) mais PAS modifier le fond.
- ✅ Si le professeur te demande explicitement de "générer", "créer" ou "ajouter", ALORS tu peux produire du contenu original.
- ✅ Si le professeur te demande de "corriger" ou "améliorer", tu corriges uniquement les erreurs factuelles.

⛔ RÈGLE N°2 — RESPECT STRICT DU NIVEAU ${context.level_label.toUpperCase()} ⛔
${getLevelConstraints(context)}

RÈGLES LaTeX :
- Tu produis du LaTeX compilable directement (avec \\\\documentclass et \\\\begin{document})
- Tu utilises le vocabulaire mathématique français (pas d'anglicismes)
- Tu structures clairement avec des sections numérotées
- Notation française OBLIGATOIRE : virgule décimale (0,5), intervalles $]a ; b[$
- Notation de Lagrange pour les dérivées : $f'(x)$, JAMAIS $\\\\frac{df}{dx}$

PACKAGES LaTeX OBLIGATOIRES dans le préambule :
\\\\documentclass[a4paper, 12pt]{article}
\\\\usepackage[french]{babel}
\\\\usepackage[T1]{fontenc}
\\\\usepackage[utf8]{inputenc}
\\\\usepackage{amsmath, amssymb}
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
\\\\newtcolorbox{definition}[1][]{colback=defblue!5, colframe=defblue, fonttitle=\\\\bfseries, title=Définition, #1}
\\\\newtcolorbox{propriete}[1][]{colback=propgreen!5, colframe=propgreen, fonttitle=\\\\bfseries, title=Propriété, #1}
\\\\newtcolorbox{theoreme}[1][]{colback=propgreen!8, colframe=propgreen!80!black, fonttitle=\\\\bfseries, title=Théorème, #1}
\\\\newtcolorbox{methode}[1][]{colback=methpurple!5, colframe=methpurple, fonttitle=\\\\bfseries, title=Méthode, #1}
\\\\newtcolorbox{exemple}[1][]{colback=exorange!5, colframe=exorange, fonttitle=\\\\bfseries, title=Exemple, #1}
\\\\newtcolorbox{remarque}[1][]{colback=remarkgray!5, colframe=remarkgray, fonttitle=\\\\bfseries, title=Remarque, #1}

⚠️ FIGURES, COURBES ET TABLEAUX — OBLIGATOIRES :
- Si le contenu contient une courbe de fonction → la tracer avec pgfplots (\\\\begin{axis} + \\\\addplot)
- Si le contenu contient un tableau de variations → le créer avec tkz-tab
- Si le contenu contient un tableau de signes → le créer avec tkz-tab
- Si le contenu contient une figure géométrique → la créer avec TikZ
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
`;

    const typePrompts: Record<ProfResourceType, string> = {
        cours: `${base}

TYPE : COURS — MISE EN FORME PROFESSIONNELLE

🎨 STRUCTURE ET NUMÉROTATION :
- Parties principales : \\\\section{} → numérotées I, II, III (chiffres romains automatiques)
- Sous-parties : \\\\subsection{} → numérotées 1), 2), 3) (chiffres arabes automatiques)
- Ne PAS numéroter manuellement, c'est fait automatiquement par les commandes \\\\section / \\\\subsection

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

TYPE : EXERCICES INTERACTIFS
- Génère exactement 20 questions sous forme de JSON structuré
- Format : [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..." }, ...]
- Les questions doivent couvrir tout le chapitre
- Mix de calcul mental, logique et application
- Inclure des pièges fréquents des élèves
- Réponse en JSON uniquement (pas de LaTeX pour ce type)`,

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
\\\\usepackage{amsmath, amssymb}
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
\\\\usepackage{amsmath, amssymb}
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
    try {
        const body = await request.json();
        const {
            messages,
            context,
            existing_content,
            image_urls,
        }: {
            messages: ChatMessageProf[];
            context: ProfContext;
            existing_content?: string;
            image_urls?: string[];
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
        const systemPrompt = getSystemPrompt(context, existing_content);

        // Enrichir le dernier message utilisateur avec le contenu extrait de TOUTES les images
        const enrichedMessages = messages.map((m, i) => {
            if (i === messages.length - 1 && m.role === 'user' && allImageExtracts.length > 0) {
                let imageBlock = '';
                if (allImageExtracts.length === 1) {
                    imageBlock = `\n\n--- CONTENU EXTRAIT DE L'IMAGE (à reproduire FIDÈLEMENT en LaTeX, Y COMPRIS toutes les courbes, figures et tableaux) ---\n${allImageExtracts[0].content}`;
                } else {
                    imageBlock = allImageExtracts.map(e =>
                        `\n--- IMAGE N°${e.index + 1} — CONTENU EXTRAIT (à reproduire FIDÈLEMENT, Y COMPRIS les courbes/figures/tableaux) ---\n${e.content}`
                    ).join('\n');
                    imageBlock = `\n\n⚠️ ATTENTION : ${allImageExtracts.length} IMAGES ont été fournies. Tu dois prendre en compte le contenu de TOUTES les images, pas seulement la dernière.${imageBlock}`;
                }
                return {
                    ...m,
                    content: `${m.content}${imageBlock}`,
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

        // ── ÉTAPE 3 : Streaming direct — DeepSeek-R1 (principal) ou GPT-4o (fallback)
        // Le pipeline 2 passes causait des 504 sur Vercel (timeout).
        // On stream directement la réponse au client pour un TTFB rapide.

        const deepseekKey = process.env.DEEPSEEK_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!deepseekKey && !openaiKey) {
            return new Response(
                JSON.stringify({ error: 'Aucune clé API configurée (DEEPSEEK_API_KEY ou OPENAI_API_KEY)' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ── TENTATIVE 1 : DeepSeek V3 en streaming direct ──────────
        // Note: On utilise deepseek-chat (V3) au lieu de deepseek-reasoner (R1)
        // car R1 a une phase de raisonnement silencieuse (~60s) qui cause des timeouts.
        // V3 stream le contenu immédiatement.
        if (deepseekKey) {
            try {
                console.log('[Prof-Chat] 🧠 DeepSeek V3 : streaming direct au client...');

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
                        max_tokens: 32000,
                    }),
                });

                if (dsResponse.ok) {
                    console.log('[Prof-Chat] ✅ DeepSeek V3 connecté — streaming...');
                    const stream = createSSEStream(dsResponse, 'DeepSeek-V3');
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Transfer-Encoding': 'chunked',
                            'X-AI-Provider': 'DeepSeek-V3',
                        },
                    });
                } else {
                    const errText = await dsResponse.text();
                    console.warn(`[Prof-Chat] ⚠️ DeepSeek HTTP ${dsResponse.status}: ${errText.slice(0, 200)}`);
                }
            } catch (err: any) {
                console.warn(`[Prof-Chat] ⚠️ DeepSeek error: ${err.message}`);
            }
        }

        // ── TENTATIVE 2 : GPT-4o en fallback streaming ─────────────
        if (openaiKey) {
            try {
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
                        temperature: 0.4,
                        max_tokens: 16384,
                    }),
                });

                if (gptResponse.ok) {
                    console.log('[Prof-Chat] ✅ GPT-4o connecté — streaming...');
                    const stream = createSSEStream(gptResponse, 'GPT-4o');
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Transfer-Encoding': 'chunked',
                            'X-AI-Provider': 'GPT-4o',
                        },
                    });
                }
            } catch (err: any) {
                console.warn(`[Prof-Chat] ⚠️ GPT-4o fallback error: ${err.message}`);
            }
        }

        return new Response(
            JSON.stringify({ error: 'Toutes les IA sont indisponibles' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Prof-Chat] ❌ Fatal error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erreur interne' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
