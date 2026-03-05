/**
 * NIVEAUX LYCÉE — Référentiel léger
 * ===================================
 * Extrait de l'ancien curriculum.ts (supprimé).
 * Contient uniquement le type NiveauLycee, les métadonnées d'affichage
 * et les contraintes IA par niveau.
 */

// ─────────────────────────────────────────────────────────────
// TYPE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export type NiveauLycee =
    | 'seconde'
    | 'premiere_commune'
    | 'premiere_spe'
    | 'terminale_spe'
    | 'terminale_comp'
    | 'terminale_expert'
    | 'seconde_sthr'
    | 'premiere_techno'
    | 'terminale_techno';

/**
 * Type de domaine mathématique (utilisé dans MathSpec).
 * Conservé ici pour rétrocompatibilité.
 */
export type DomaineMaths =
    | 'nombres_calculs'
    | 'algebre'
    | 'geometrie'
    | 'fonctions'
    | 'analyse'
    | 'probabilites_statistiques'
    | 'suites'
    | 'algorithmique'
    | 'nombres_complexes'
    | 'arithmetique';

// ─────────────────────────────────────────────────────────────
// MÉTADONNÉES D'AFFICHAGE (pour LevelSelector et liens BO)
// ─────────────────────────────────────────────────────────────

export interface NiveauInfo {
    id: NiveauLycee;
    label: string;
    labelLong: string;
    bo: string;
    pdfUrl: string;
    horaire: string;
}

const NIVEAUX: Record<NiveauLycee, NiveauInfo> = {
    seconde: {
        id: 'seconde',
        label: 'Seconde',
        labelLong: 'Seconde Générale et Technologique',
        bo: 'BO Spécial n°1 du 22 janvier 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24553/download',
        horaire: '4h/semaine',
    },
    premiere_commune: {
        id: 'premiere_commune',
        label: '1ère Commune',
        labelLong: 'Première Générale — Enseignement Commun Mathématiques',
        bo: 'BO n°27 du 7 juillet 2022',
        pdfUrl: 'https://eduscol.education.fr/document/41635/download',
        horaire: '1h30/semaine',
    },
    premiere_spe: {
        id: 'premiere_spe',
        label: '1ère Spé',
        labelLong: 'Première Générale — Spécialité Mathématiques',
        bo: 'BO Spécial n°1 du 22 janvier 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24565/download',
        horaire: '4h/semaine',
    },
    terminale_spe: {
        id: 'terminale_spe',
        label: 'Tle Spé',
        labelLong: 'Terminale Générale — Spécialité Mathématiques',
        bo: 'BO Spécial n°8 du 25 juillet 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24568/download',
        horaire: '6h/semaine',
    },
    terminale_comp: {
        id: 'terminale_comp',
        label: 'Tle Comp.',
        labelLong: 'Terminale — Option Mathématiques Complémentaires',
        bo: 'BO Spécial n°8 du 25 juillet 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24571/download',
        horaire: '3h/semaine',
    },
    terminale_expert: {
        id: 'terminale_expert',
        label: 'Tle Expert',
        labelLong: 'Terminale — Option Mathématiques Expertes',
        bo: 'BO Spécial n°8 du 25 juillet 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24574/download',
        horaire: '3h/semaine',
    },
    seconde_sthr: {
        id: 'seconde_sthr',
        label: '2de STHR',
        labelLong: 'Seconde STHR — Hôtellerie-Restauration',
        bo: 'BO Spécial n°1 du 22 janvier 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24556/download',
        horaire: '3h/semaine',
    },
    premiere_techno: {
        id: 'premiere_techno',
        label: '1ère Techno',
        labelLong: 'Première Technologique — Enseignement Commun',
        bo: 'BO Spécial n°1 du 22 janvier 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24559/download',
        horaire: '3h/semaine',
    },
    terminale_techno: {
        id: 'terminale_techno',
        label: 'Tle Techno',
        labelLong: 'Terminale Technologique — Enseignement Commun',
        bo: 'BO Spécial n°8 du 25 juillet 2019',
        pdfUrl: 'https://eduscol.education.fr/document/24562/download',
        horaire: '3h/semaine',
    },
};

// ─────────────────────────────────────────────────────────────
// CONTRAINTES IA PAR NIVEAU (injectées dans le system prompt)
// ─────────────────────────────────────────────────────────────

const CONTRAINTES_IA: Record<NiveauLycee, string> = {
    seconde: `
NIVEAU : SECONDE GÉNÉRALE ET TECHNOLOGIQUE
⛔ INTERDICTIONS ABSOLUES :
- JAMAIS de dérivée f'(x) ou nombre dérivé
- JAMAIS de polynômes du second degré (ax²+bx+c) — hors au programme
- JAMAIS de taux de variation (f(a+h)-f(a))/h
- JAMAIS de limites
- JAMAIS de logarithme ou exponentielle
- Pas de trigonométrie avancée (cosinus, sinus au-delà du cercle trigonométrique)

✅ MÉTHODES AUTORISÉES :
- Fonctions de référence : f(x)=x², f(x)=1/x, f(x)=√x, fonctions affines
- Tableaux de variations SANS ligne f'(x)
- Résolution d'équations et inéquations du 1er degré
- Théorèmes de Thalès et Pythagore
- Vecteurs : définition, coordonnées, translation

📐 FORMAT TABLEAU en Seconde :
@@@ table |
x: -inf, a, b, +inf |
variation: f(x) : farrow, valeur, searrow, valeur |
@@@
→ PAS de ligne sign: f'(x) en Seconde !
`,
    premiere_commune: `
NIVEAU : PREMIÈRE GÉNÉRALE — ENSEIGNEMENT COMMUN
⛔ INTERDICTIONS :
- Pas de calculs de limites en ±∞
- Pas de logarithme neperien ln
- Pas de trigonométrie avancée
- Pas de nombres complexes
✅ MÉTHODES AUTORISÉES :
- Dérivées simples des polynômes et fonctions élémentaires
- Fonction exp(x) et ses propriétés
- Suites arithmétiques et géométriques
- Probabilités conditionnelles — notation française P_A(B)
- Taux de variation, pourcentages
`,
    premiere_spe: `
NIVEAU : PREMIÈRE GÉNÉRALE — SPÉCIALITÉ MATHÉMATIQUES
⛔ INTERDICTIONS ABSOLUES :
- ⛔ NE PAS calculer de limites en ±∞ — PAS AU PROGRAMME
- ⛔ NE JAMAIS écrire "lim(x→±∞)", "tend vers", "asymptote"
- ⛔ Pour les polynômes du second degré ax²+bx+c → PAS de dérivée, utiliser la forme canonique
- ⛔ Pas de nombres complexes
- ⛔ Pas d'intégrales

✅ MÉTHODES AUTORISÉES :
- Dérivées pour polynômes deg≥3, quotients, produits (PAS pour deg 2)
- Tableau de variations AVEC ligne f'(x) (sauf polynômes deg 2)
- Polynômes deg 2 : forme canonique OBLIGATOIRE → f(x) = a(x-α)²+β
- Probabilités conditionnelles P_A(B) (notation française)
- Vecteurs, produit scalaire

⚠️ FORMAT TABLEAU VARIATIONS en 1ère Spé (avec valeur interdite) :
- La ligne variation ne contient QUE les flèches et || — PAS de valeurs numériques en ±∞
- CORRECT : variation: f(x) : nearrow, ||, nearrow
- INTERDIT : variation: f(x) : +inf, nearrow, ||, searrow, -inf
`,
    terminale_spe: `
NIVEAU : TERMINALE GÉNÉRALE — SPÉCIALITÉ MATHÉMATIQUES
✅ TOUTES LES MÉTHODES AUTORISÉES (programme complet) :
- Dérivées avancées (logarithme, exponentielle, composées)
- Primitives et intégrales définies
- Limites et asymptotes
- Nombres complexes (module, argument, forme exponentielle)
- Géométrie dans l'espace (vecteurs normaux, plans)
- Lois de probabilités (binomiale, normale, exponentielle)

⛔ MÉTHODES INTERDITES MÊME EN TERMINALE :
- ⛔ Développements limités ou équivalents (~)
- ⛔ Formule de Taylor-Young
- ⛔ Pour les limites de type (e^x-1)/x → utiliser UNIQUEMENT le taux d'accroissement (nombre dérivé)
  CORRECT : "c'est le nombre dérivé de exp en 0 donc = 1"
  INTERDIT : "e^x - 1 ~ x donc ..."

⚠️ TABLEAUX : Toutes les lignes sign: et variation: sont autorisées.
Valeurs en ±∞ autorisées dans la ligne variation: en Terminale.
`,
    terminale_comp: `
NIVEAU : TERMINALE — OPTION MATHÉMATIQUES COMPLÉMENTAIRES
Contenu de consolidation sans approfondissement des spécialités.
✅ Méthodes proches du niveau Première Spé + quelques éléments de Terminale.
⛔ Pas de nombres complexes avancés, pas d'arithmétique poussée.
`,
    terminale_expert: `
NIVEAU : TERMINALE — OPTION MATHÉMATIQUES EXPERTES
Niveau le plus avancé du lycée — approfondissement des spécialités.
✅ Toutes les méthodes de Terminale Spé PLUS :
- Nombres complexes avancés (racines n-ièmes, transformations)
- Arithmétique avancée (Fermat, Euler, congruences)
- Théorie des graphes et algorithmes
⛔ Mêmes interdictions qu'en Terminale Spé (pas de DL, pas d'équivalents).
`,
    seconde_sthr: `
NIVEAU : SECONDE STHR (Hôtellerie-Restauration)
Programme orienté applications concrètes du domaine hôtelier et touristique.
✅ Contextes privilégiés : coûts, recettes, bénéfices, taux de remplissage, statistiques touristiques.
⛔ Mêmes interdictions qu'en Seconde générale + pas de géométrie abstraite.
Tout exemple doit être contextualisé dans le domaine hôtelier/restauration/tourisme.
`,
    premiere_techno: `
NIVEAU : PREMIÈRE TECHNOLOGIQUE (STI2D, STL, STHR, ST2S, STAV...)
Programme adapté aux séries technologiques — applications concrètes prioritaires.
✅ Méthodes autorisées :
- Fonctions affines et polynômes simples
- Dérivation simple (introduction, pas de règles composition complexes)
- Trigonométrie (sinus, cosinus, valeurs remarquables)
- Géométrie dans l'espace (initiations)
⛔ Pas de logarithme neperien ln, pas de limites formelles, pas de complexes.
`,
    terminale_techno: `
NIVEAU : TERMINALE TECHNOLOGIQUE (STI2D, STL, STHR, ST2S...)
Programme orienté applications — niveau moins avancé que la Terminale Spé.
✅ Méthodes autorisées :
- Dérivées (polynômes, exp, ln)
- Intégrales simples
- Fonction ln et exp (propriétés de base)
- Limites en cas simples
- Équations différentielles y' = ay (basique)
⛔ Pas de nombres complexes, pas d'arithmétique avancée, pas de statistique inférentielle.
Adapter les exemples au contexte des séries technologiques (sciences industrielles, chimie, etc.)
`,
};

// ─────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────

/** Retourne les infos d'affichage d'un niveau */
export function getNiveauInfo(niveau: NiveauLycee): NiveauInfo {
    return NIVEAUX[niveau];
}

/** Retourne les contraintes IA pour un niveau (à injecter dans le system prompt) */
export function getContraintesIA(niveau: NiveauLycee): string {
    return CONTRAINTES_IA[niveau] ?? '';
}

/** Retourne tous les niveaux sous forme de liste pour un sélecteur UI */
export function getAllNiveaux(): { id: NiveauLycee; label: string; labelLong: string }[] {
    return Object.values(NIVEAUX).map(({ id, label, labelLong }) => ({ id, label, labelLong }));
}

/** Détecte le niveau depuis une chaîne de texte (message utilisateur) */
export function detectNiveauFromText(text: string): NiveauLycee | null {
    const t = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    if (/terminale\s+(spe|specialite|maths?\s+spe)/i.test(t)) return 'terminale_spe';
    if (/terminale\s+expert/i.test(t)) return 'terminale_expert';
    if (/terminale\s+(comp|complementaire)/i.test(t)) return 'terminale_comp';
    if (/terminale\s+techno/i.test(t)) return 'terminale_techno';
    if (/\bterminale\b(?!\s+spe|\s+tech|\s+exp|\s+comp)/i.test(t)) return 'terminale_spe';
    if (/premiere\s+(spe|specialite|maths?\s+spe)/i.test(t)) return 'premiere_spe';
    if (/premiere\s+techno/i.test(t)) return 'premiere_techno';
    if (/(1ere|1\w*|premiere)\s+(commune|enseignement\s+commun)/i.test(t)) return 'premiere_commune';
    if (/\bpremiere\b(?!\s+spe|\s+tech|\s+com)/i.test(t)) return 'premiere_spe';
    if (/\b2de\s+sthr\b|\bseconde\s+sthr\b/i.test(t)) return 'seconde_sthr';
    if (/\b(seconde|2de|2nde)\b/i.test(t)) return 'seconde';

    return null;
}
