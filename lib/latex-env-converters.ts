/**
 * Convertisseurs d'environnements LaTeX → composants visuels.
 *
 * Utilisé par cleanLatexForPreview() dans ProfChatbot.tsx pour transformer
 * les blocs LaTeX (tabular, tkz-tab, pgfplots) en HTML/composants que
 * useFigureRenderer sait afficher.
 */

// ─── Couleurs pgfplots → hex ─────────────────────────────────
const COLOR_MAP: Record<string, string> = {
    blue: '#3b82f6', red: '#ef4444', green: '#22c55e', orange: '#f97316',
    purple: '#a855f7', cyan: '#06b6d4', magenta: '#ec4899', yellow: '#eab308',
    black: '#1e293b', gray: '#94a3b8', pink: '#f472b6', teal: '#14b8a6',
};

// ─── Utilitaires ─────────────────────────────────────────────
/** Extrait la valeur numérique d'une option pgfplots comme `xmin=-3` */
function extractAxisOption(options: string, key: string): number | null {
    const m = options.match(new RegExp(`${key}\\s*=\\s*(-?[0-9.]+)`));
    return m ? parseFloat(m[1]) : null;
}

/** Nettoie un label LaTeX pour l'affichage (retire les $, convertit inf) */
function cleanLabel(text: string): string {
    let t = text.trim();
    // Retirer les $ extérieurs
    if (t.startsWith('$') && t.endsWith('$')) t = t.slice(1, -1);
    // Conversions communes
    t = t.replace(/\\infty/g, '∞').replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β');
    t = t.replace(/\\left/g, '').replace(/\\right/g, '');
    return t.trim();
}

/** Échappe les guillemets simples en entités HTML pour un attribut JSON délimité par '. */
function escapeJsonAttr(obj: object): string {
    // JSON.stringify gère déjà l'échappement des backslashes et guillemets.
    // On ne remplace que les ' en &#39; car l'attribut HTML est délimité par des '.
    return JSON.stringify(obj).replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════════
//  1. TABULAR → HTML <table>
// ═══════════════════════════════════════════════════════════════

/**
 * Convertit un bloc \begin{tabular}{...}...\end{tabular} en HTML <table>.
 * Préserve les expressions $...$ pour le rendu KaTeX en aval.
 */
export function convertTabularToHtml(match: string): string {
    try {
        // Extraire le contenu du tabular
        const tabMatch = match.match(
            /\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/
        );
        if (!tabMatch) return match;

        const colSpec = tabMatch[1];
        const body = tabMatch[2];

        // Alignements de colonnes (c→center, l→left, r→right)
        const aligns = colSpec.replace(/[|]/g, '').split('').map(c => {
            if (c === 'l') return 'left';
            if (c === 'r') return 'right';
            return 'center';
        });

        // Séparer les lignes (sur \\ mais pas \\\\ dans les maths)
        const rows = body.split(/\\\\/)
            .map(r => r.trim())
            .filter(r => r && r !== '\\hline' && !/^\s*$/.test(r.replace(/\\hline/g, '')));

        if (rows.length === 0) return match;

        const cellStyle = 'border:1px solid #d1d5db;padding:8px 14px;';
        let html = '<table style="border-collapse:collapse;width:100%;margin:1rem 0">';

        for (let i = 0; i < rows.length; i++) {
            let row = rows[i].replace(/\\hline/g, '').trim();
            if (!row) continue;

            // Gérer \multicolumn{n}{align}{text}
            const cells: { text: string; colspan: number; align: string }[] = [];
            const parts = row.split(/&/);

            for (let j = 0; j < parts.length; j++) {
                let cell = parts[j].trim();
                let colspan = 1;
                let align = aligns[j] || 'center';

                const mc = cell.match(/\\multicolumn\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}/);
                if (mc) {
                    colspan = parseInt(mc[1]);
                    cell = mc[2];
                }

                // Nettoyer les commandes de formatage simples
                cell = cell.replace(/\\textbf\{([^}]*)\}/g, '**$1**');
                cell = cell.replace(/\\textit\{([^}]*)\}/g, '*$1*');
                cell = cell.replace(/\\text\{([^}]*)\}/g, '$1');

                cells.push({ text: cell, colspan, align });
            }

            html += '<tr>';
            for (const cell of cells) {
                const cs = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '';
                html += `<td${cs} style="${cellStyle}text-align:${cell.align}">${cell.text}</td>`;
            }
            html += '</tr>';
        }

        html += '</table>';
        return html;
    } catch {
        return match;
    }
}

// ═══════════════════════════════════════════════════════════════
//  2. TKZ-TAB → <mathtable data='...' />
// ═══════════════════════════════════════════════════════════════

/**
 * Convertit un bloc tikzpicture contenant \tkzTabInit en composant <mathtable>.
 *
 * Format attendu :
 *   \tkzTabInit{label1/h1, label2/h2}{x1, x2, x3}
 *   \tkzTabLine{, -, z, +, }        → type 'sign'
 *   \tkzTabVar{-/, +/val, -/}        → type 'variation'
 */
export function convertTkzTabToMathtable(match: string): string {
    try {
        // ── A. Parser \tkzTabInit ──
        const initMatch = match.match(
            /\\tkzTabInit\s*\{([^}]*)\}\s*\{([^}]*)\}/
        );
        if (!initMatch) {
            return '<div style="padding:1rem;color:#94a3b8">Tableau de variations (format non reconnu)</div>';
        }

        const labelsRaw = initMatch[1];
        const xRaw = initMatch[2];

        // Labels : "$x$ / 1, $f'(x)$ / 1, $f(x)$ / 2" → ["x", "f'(x)", "f(x)"]
        const labelEntries = labelsRaw.split(/,(?![^{}]*})/);
        const labels = labelEntries.map(e => {
            const parts = e.split('/');
            return cleanLabel(parts[0]);
        });

        // xValues : "$-\infty$, $0$, $+\infty$" → ["-∞", "0", "+∞"]
        const xValues = xRaw.split(',').map(v => cleanLabel(v.trim()));

        const N = xValues.length;
        const rows: { label: string; type: 'sign' | 'variation'; content: string[] }[] = [];

        // ── B. Parser \tkzTabLine{...} (sign rows) ──
        const lineRegex = /\\tkzTabLine\s*\{([^}]*)\}/g;
        let lineMatch;
        let lineIdx = 0;
        while ((lineMatch = lineRegex.exec(match)) !== null) {
            const entries = lineMatch[1].split(',').map((s: string) => s.trim());
            // tkzTabLine content : length should be 2*N - 3 for N x-values
            // Map : z→"0", t/d→"||", +→"+", -→"-", empty→""
            const content = entries.map((e: string) => {
                if (e === 'z' || e === 'Z') return '0';
                if (e === 't' || e === 'T' || e === 'd') return '||';
                if (e === '+') return '+';
                if (e === '-') return '-';
                if (/^\s*$/.test(e)) return '';
                // Peut contenir du LaTeX comme \tfrac{a}{b}
                return e;
            });

            // Le label est labels[lineIdx + 1] (le premier label est toujours x)
            rows.push({
                label: labels[lineIdx + 1] || `ligne${lineIdx}`,
                type: 'sign',
                content,
            });
            lineIdx++;
        }

        // ── C. Parser \tkzTabVar{...} (variation rows) ──
        const varRegex = /\\tkzTabVar\s*\{([^}]*)\}/g;
        let varMatch;
        let varIdx = 0;
        while ((varMatch = varRegex.exec(match)) !== null) {
            const raw = varMatch[1].trim();
            // Entrées : -/val , +/val , ...
            // On split sur , mais attention aux accolades imbriquées
            const entries: string[] = [];
            let depth = 0;
            let current = '';
            for (const ch of raw) {
                if (ch === '{') depth++;
                if (ch === '}') depth--;
                if (ch === ',' && depth === 0) {
                    entries.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            if (current.trim()) entries.push(current.trim());

            // Variation content : alternance valeur / flèche
            // longueur 2*N - 1 : [val0, arrow0, val1, arrow1, ..., val(N-1)]
            const content: string[] = [];

            for (const entry of entries) {
                const dirMatch = entry.match(/^([+-])\s*\/\s*(.*)$/s);
                if (dirMatch) {
                    const dir = dirMatch[1];
                    const val = dirMatch[2].trim();
                    // La valeur (peut être vide pour -∞/+∞)
                    if (val) {
                        content.push(cleanLabel(val));
                    } else {
                        content.push('');
                    }
                    // La flèche
                    content.push(dir === '+' ? 'nearrow' : 'searrow');
                } else {
                    // Entrée sans direction (rare)
                    content.push(cleanLabel(entry));
                }
            }

            // Ajuster la longueur : le dernier élément ne doit pas être une flèche
            // et le tableau doit faire exactement 2*N - 1
            const expectedLen = 2 * N - 1;
            while (content.length > expectedLen) content.pop();
            while (content.length < expectedLen) content.push('');

            rows.push({
                label: labels[lineIdx + varIdx + 1] || `var${varIdx}`,
                type: 'variation',
                content,
            });
            varIdx++;
        }

        const data = { xValues, rows };
        return `<mathtable data='${escapeJsonAttr(data)}' />`;
    } catch {
        return '<div style="padding:1rem;color:#94a3b8">Tableau de variations (erreur de conversion)</div>';
    }
}

// ═══════════════════════════════════════════════════════════════
//  3. PGFPLOTS → <mathgraph data='...' />
// ═══════════════════════════════════════════════════════════════

/**
 * Convertit un bloc tikzpicture contenant \begin{axis} (pgfplots)
 * en composant <mathgraph>.
 *
 * Extrait le domaine (xmin/xmax/ymin/ymax) et les expressions \addplot.
 */
export function convertPgfplotsToMathgraph(match: string): string {
    try {
        // ── A. Parser les options de \begin{axis}[...] ──
        const axisMatch = match.match(/\\begin\{axis\}\s*\[([^\]]*)\]/);
        const axisOpts = axisMatch ? axisMatch[1] : '';

        const xmin = extractAxisOption(axisOpts, 'xmin');
        const xmax = extractAxisOption(axisOpts, 'xmax');
        const ymin = extractAxisOption(axisOpts, 'ymin');
        const ymax = extractAxisOption(axisOpts, 'ymax');

        const domain: { x: [number, number]; y: [number, number] } = {
            x: [xmin ?? -5, xmax ?? 5],
            y: [ymin ?? -5, ymax ?? 5],
        };

        // ── B. Parser les \addplot[...]{expression} ──
        const functions: { fn: string; color: string; domain?: [number, number] }[] = [];

        // Pattern 1 : \addplot[options]{expression};
        const plotRegex = /\\addplot\s*(?:\[([^\]]*)\])?\s*\{([^}]*)\}/g;
        let plotMatch;
        while ((plotMatch = plotRegex.exec(match)) !== null) {
            const opts = plotMatch[1] || '';
            let expr = plotMatch[2].trim();

            // Nettoyer l'expression pgfplots → notation standard
            expr = expr.replace(/\\x/g, 'x').replace(/\^/g, '^');

            // Extraire la couleur
            let color = '#3b82f6';
            for (const [name, hex] of Object.entries(COLOR_MAP)) {
                if (opts.includes(name)) { color = hex; break; }
            }

            // Extraire le domain local de l'addplot si présent
            const localDomain = opts.match(/domain\s*=\s*(-?[\d.]+)\s*:\s*(-?[\d.]+)/);
            const fnDomain: [number, number] | undefined = localDomain
                ? [parseFloat(localDomain[1]), parseFloat(localDomain[2])]
                : undefined;

            functions.push({ fn: expr, color, domain: fnDomain });
        }

        // Pattern 2 : \addplot coordinates {(x1,y1) (x2,y2) ...};
        const coordRegex = /\\addplot[^{]*coordinates\s*\{([^}]*)\}/g;
        let coordMatch;
        while ((coordMatch = coordRegex.exec(match)) !== null) {
            const pointRegex = /\((-?[\d.]+)\s*,\s*(-?[\d.]+)\)/g;
            const points: { x: number; y: number }[] = [];
            let pt;
            while ((pt = pointRegex.exec(coordMatch[1])) !== null) {
                points.push({ x: parseFloat(pt[1]), y: parseFloat(pt[2]) });
            }
            if (points.length > 0) {
                // Pour les points seuls, on les passe comme points du graph
                const data = {
                    points,
                    domain,
                    title: 'Courbe',
                };
                return `<mathgraph data='${escapeJsonAttr(data)}' />`;
            }
        }

        if (functions.length === 0) {
            return '<div style="padding:1rem;color:#94a3b8">Courbe (format non reconnu)</div>';
        }

        const data: Record<string, unknown> = { functions, domain, title: 'Courbe' };
        return `<mathgraph data='${escapeJsonAttr(data)}' />`;
    } catch {
        return '<div style="padding:1rem;color:#94a3b8">Courbe (erreur de conversion)</div>';
    }
}
