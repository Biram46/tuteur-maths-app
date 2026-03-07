/**
 * Test des tableaux de signes pour :
 * f(x) = (3x-2)(-2x+3)
 * g(x) = (3x-5)/(-5x+1)
 * h(x) = ln(x) - 1
 * k(x) = (-x^2-5x-6)*sqrt(x)
 *
 * On utilise directement les fonctions mathjs pour simuler ce que fait sign-table-engine.ts
 */

import { evaluate } from 'mathjs';

// ─── Copie minimale des utilitaires ───
function evalAt(expr, x) {
    try {
        // Sanitize : ln → log, sqrt(), etc.
        const sanitized = expr
            .replace(/ln\(/g, 'log(')
            .replace(/√\(([^)]+)\)/g, 'sqrt($1)')
            .replace(/×/g, '*');
        const result = evaluate(sanitized, { x });
        if (typeof result === 'number' && isFinite(result)) return result;
        return null;
    } catch {
        return null;
    }
}

function round4(x) { return Math.round(x * 10000) / 10000; }

function formatForTable(x) {
    if (Number.isInteger(x)) return String(x);
    for (let d = 2; d <= 12; d++) {
        const n = Math.round(x * d);
        if (Math.abs(n / d - x) < 1e-8) {
            return n < 0 ? `${n}/${d}` : `${n}/${d}`;
        }
    }
    return x.toFixed(4);
}

function findZeros(expr, xMin = -20, xMax = 20, steps = 2000) {
    const zeros = [];
    const step = (xMax - xMin) / steps;
    let prevX = xMin;
    let prevY = evalAt(expr, xMin);

    for (let i = 1; i <= steps; i++) {
        const x = xMin + i * step;
        const y = evalAt(expr, x);
        if (y === null) { prevX = x; prevY = null; continue; }
        if (prevY === null) { prevX = x; prevY = y; continue; }
        if (prevY * y < 0) {
            // bisect
            let a = prevX, b = x, fa = prevY, fb = y;
            for (let j = 0; j < 50; j++) {
                const mid = (a + b) / 2;
                const fm = evalAt(expr, mid);
                if (fm === null || Math.abs(fm) < 1e-10 || (b - a) / 2 < 1e-10) {
                    const z = round4(mid);
                    if (!zeros.some(zz => Math.abs(zz - z) < 1e-6)) zeros.push(z);
                    break;
                }
                if (fa * fm < 0) { b = mid; fb = fm; }
                else { a = mid; fa = fm; }
            }
        }
        if (Math.abs(y) < 1e-8 && !zeros.some(z => Math.abs(z - x) < 1e-6)) {
            zeros.push(round4(x));
        }
        prevX = x; prevY = y;
    }
    return zeros.sort((a, b) => a - b);
}

function signOnInterval(expr, a, b) {
    const xFrom = a === '-inf' ? -1e6 : a + 1e-6;
    const xTo = b === '+inf' ? 1e6 : b - 1e-6;
    if (xFrom >= xTo) return null;
    const mid = (xFrom + xTo) / 2;
    const testPoints = [mid, xFrom + (xTo - xFrom) * 0.25, xFrom + (xTo - xFrom) * 0.75];
    for (const tx of testPoints) {
        const v = evalAt(expr, tx);
        if (v !== null && Math.abs(v) > 1e-10) return v > 0 ? '+' : '-';
    }
    return '?';
}

// ─── Affichage du tableau ───
// buildXDisplay : produit les 2n+1 labels pour la ligne x
// (intervalles représentés par une cellule vide entre les points critiques)
function buildXDisplay(criticalPoints) {
    const cols = ['-inf'];
    for (let i = 0; i < criticalPoints.length; i++) {
        cols.push(formatForTable(criticalPoints[i]));
        if (i < criticalPoints.length - 1) cols.push(''); // intervalle entre deux points
    }
    cols.push('+inf');
    return cols;
}

// buildSignRow : produit 2n+1 signes :
//   [signe_intervalle_0, valeur_cp0, signe_intervalle_1, valeur_cp1, ..., signe_intervalle_n]
function buildSignRow(factorExpr, criticalPoints, role = 'numerator', isInterdite = false) {
    const n = criticalPoints.length;
    const signs = [];

    for (let i = 0; i <= 2 * n; i++) {
        if (i % 2 === 0) {
            // Colonne intervalle : signe sur ]cp[i/2-1], cp[i/2][
            const cpIdx = i / 2;
            const a = cpIdx === 0 ? '-inf' : criticalPoints[cpIdx - 1];
            const b = cpIdx === n ? '+inf' : criticalPoints[cpIdx];
            signs.push(signOnInterval(factorExpr, a, b) ?? '?');
        } else {
            // Colonne point critique
            const cp = criticalPoints[(i - 1) / 2];
            const y = evalAt(factorExpr, cp);
            if (y === null || !isFinite(y)) {
                // Discontinuité réelle (ex: 1/0 évalué) → double barre
                signs.push('||');
            } else if (Math.abs(y) < 1e-6) {
                // Le facteur s'annule en ce point
                // 'D' = zéro du dénominateur : affiché '0' sur la ligne facteur
                //        mais cause '||' sur la ligne f(x) via computeFxRow
                // '0' = zéro du numérateur : affiché '0' partout
                signs.push(isInterdite ? 'D' : '0');
            } else {
                signs.push(y > 0 ? '+' : '-');
            }
        }
    }
    return signs;
}

function computeFxRow(factors, colCount) {
    const result = [];
    for (let i = 0; i < colCount; i++) {
        const colSigns = factors.map(f => f.signs[i]);
        // '||' = discontinuité réelle, 'D' = zéro du dénominateur → les deux causent || dans f(x)
        if (colSigns.includes('||') || colSigns.includes('D')) { result.push('||'); continue; }
        if (colSigns.includes('0')) { result.push('0'); continue; }
        const negCount = colSigns.filter(s => s === '-').length;
        result.push(negCount % 2 === 1 ? '-' : '+');
    }
    return result;
}

function printTable(title, xDisplayCols, factors, fxLabel = 'f(x)') {
    const colCount = xDisplayCols.length;
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${title}`);
    console.log('═'.repeat(70));

    // Ligne x
    let xLine = 'x        |';
    for (const v of xDisplayCols) {
        xLine += ` ${String(v).padEnd(8)}|`;
    }
    console.log(xLine);
    console.log('-'.repeat(xLine.length));

    // Lignes facteurs
    // Note : 'D' (zéro du dénominateur) s'affiche comme '0' sur la ligne du facteur
    for (const { label, signs } of factors) {
        let line = String(label).padEnd(9) + '|';
        for (const s of signs) {
            const display = s === 'D' ? '0' : s;
            line += ` ${String(display).padEnd(8)}|`;
        }
        console.log(line);
    }

    console.log('-'.repeat(xLine.length));

    // Ligne f(x) — calculée par règle des signes
    const fxValues = computeFxRow(factors, colCount);
    let fxLine = String(fxLabel).padEnd(9) + '|';
    for (const s of fxValues) {
        fxLine += ` ${String(s).padEnd(8)}|`;
    }
    console.log(fxLine);
    console.log('═'.repeat(xLine.length));
}

// ══════════════════════════════════════════════════════════════
//  f(x) = (3x-2)(-2x+3)
// ══════════════════════════════════════════════════════════════

console.log('\n\n📐 TEST TABLEAUX DE SIGNES\n');

{
    console.log('▶ f(x) = (3x-2)(-2x+3)');
    // Zéros de (3x-2) : x = 2/3
    // Zéros de (-2x+3) : x = 3/2
    const cp = [2 / 3, 3 / 2];
    const xDisplay = buildXDisplay(cp); // 2*2+1 = 5 colonnes
    console.log('  Points critiques:', cp.map(formatForTable));
    console.log('  Colonnes du tableau:', xDisplay);

    const row1 = buildSignRow('3*x-2', cp);
    const row2 = buildSignRow('-2*x+3', cp);

    printTable('f(x) = (3x-2)(-2x+3)', xDisplay,
        [{ label: '3x-2', signs: row1 }, { label: '-2x+3', signs: row2 }],
        'f(x)'
    );

    // Vérification numérique
    const testPts = [0, 0.7, 1, 1.6, 2];
    console.log('\n  Vérification numérique f(x) = (3x-2)(-2x+3):');
    for (const x of testPts) {
        const v = evalAt('(3*x-2)*(-2*x+3)', x);
        console.log(`    f(${x}) = ${v?.toFixed(4)} → ${v > 0 ? '+' : v < 0 ? '-' : '0'}`);
    }
}

// ══════════════════════════════════════════════════════════════
//  g(x) = (3x-5)/(-5x+1)
// ══════════════════════════════════════════════════════════════
{
    console.log('\n▶ g(x) = (3x-5)/(-5x+1)');
    // Zéros de (3x-5) : x = 5/3
    // Valeur interdite : -5x+1=0 → x = 1/5
    const cpNum = [5 / 3];    // zéros numérateur
    const cpDen = [1 / 5];    // valeurs interdites
    const cp = [...cpDen, ...cpNum].sort((a, b) => a - b);
    const xDisplay = buildXDisplay(cp); // 2*2+1 = 5 colonnes
    console.log('  Points critiques:', cp.map(formatForTable));
    console.log('  Colonnes du tableau:', xDisplay);

    const row1 = buildSignRow('3*x-5', cp);              // numérateur
    const row2 = buildSignRow('-5*x+1', cp, 'denominator', true); // dénominateur → interdite

    printTable('g(x) = (3x-5)/(-5x+1)', xDisplay,
        [{ label: '3x-5', signs: row1 }, { label: '-5x+1', signs: row2 }],
        'g(x)'
    );

    console.log('\n  Vérification numérique g(x) = (3x-5)/(-5x+1):');
    const testPts = [0, 0.21, 1, 1.68, 2];
    for (const x of testPts) {
        const v = evalAt('(3*x-5)/(-5*x+1)', x);
        console.log(`    g(${x}) = ${v !== null ? v.toFixed(4) : 'UNDEF'} → ${v === null ? '||' : v > 0 ? '+' : v < 0 ? '-' : '0'}`);
    }
}

// ══════════════════════════════════════════════════════════════
//  h(x) = ln(x) - 1   —  domaine ]0, +∞[
// ══════════════════════════════════════════════════════════════

// buildSignRow adapté pour un domaine à borne gauche finie
// signOnIntervalDomain : comme signOnInterval mais xMin = domainLeft
function signOnIntervalDomain(expr, a, b, domainLeft = -1e6) {
    const xFrom = a === '-inf' ? domainLeft : a + 1e-9;
    const xTo = b === '+inf' ? 1e6 : b - 1e-9;
    if (xFrom >= xTo) return null;
    const mid = (xFrom + xTo) / 2;
    const testPoints = [mid, xFrom + (xTo - xFrom) * 0.25, xFrom + (xTo - xFrom) * 0.75];
    for (const tx of testPoints) {
        const v = evalAt(expr, tx);
        if (v !== null && Math.abs(v) > 1e-10) return v > 0 ? '+' : '-';
    }
    return '?';
}

// buildSignRowDomain : comme buildSignRow mais avec une borne gauche du domaine
function buildSignRowDomain(factorExpr, criticalPoints, domainLeft, isInterdite = false) {
    const n = criticalPoints.length;
    const signs = [];
    for (let i = 0; i <= 2 * n; i++) {
        if (i % 2 === 0) {
            const cpIdx = i / 2;
            const a = cpIdx === 0 ? '-inf' : criticalPoints[cpIdx - 1];
            const b = cpIdx === n ? '+inf' : criticalPoints[cpIdx];
            signs.push(signOnIntervalDomain(factorExpr, a, b, domainLeft) ?? '?');
        } else {
            const cp = criticalPoints[(i - 1) / 2];
            const y = evalAt(factorExpr, cp);
            if (y === null || !isFinite(y)) signs.push(isInterdite ? '||' : 'U');
            else if (Math.abs(y) < 1e-6) signs.push(isInterdite ? '||' : '0');
            else signs.push(y > 0 ? '+' : '-');
        }
    }
    return signs;
}

{
    console.log('\n▶ h(x) = ln(x) - 1');
    // Domaine : x > 0  →  borne gauche = 0+
    // Zéro : ln(x) - 1 = 0 → x = e ≈ 2.7183
    const zeroH = round4(Math.E);
    const cp = [zeroH]; // un seul point critique : x = e
    const domainLeft = 1e-9; // 0+ (domaine ouvert en 0)

    // Structure correcte (pédagogie lycée) :
    //   x    |  0  |     e   |   +∞
    //   h(x) |  |  |  - | 0 |  +
    //
    // 4 colonnes : ['0', '', 'e≈...', '+inf']
    //   col 0 → borne de domaine            → '|'  (pas ||, pas de signe)
    //   col 1 → intervalle ]0, e[           → '-'  (calculé numériquement)
    //   col 2 → point x=e                   → '0'
    //   col 3 → intervalle ]e, +∞[          → '+'  (calculé numériquement)
    const xDisplay = ['0', '', formatForTable(zeroH), '+inf'];
    console.log('  Domaine: ]0, +∞[');
    console.log('  Zéro: x = e ≈', zeroH);
    console.log('  Colonnes du tableau:', xDisplay);

    const signBefore = signOnIntervalDomain('log(x) - 1', '-inf', zeroH, domainLeft); // '-'
    const signAfter = signOnIntervalDomain('log(x) - 1', zeroH, '+inf', domainLeft); // '+'
    const row1 = ['|', signBefore, '0', signAfter];

    printTable('h(x) = ln(x) - 1', xDisplay,
        [{ label: 'ln(x)-1', signs: row1 }],
        'h(x)'
    );

    console.log('\n  Vérification numérique h(x) = log(x) - 1:');
    for (const x of [0.5, 1, 2, Math.E, 4, 10]) {
        const v = evalAt('log(x) - 1', x);
        console.log(`    h(${x.toFixed(4)}) = ${v?.toFixed(4)} → ${v > 0 ? '+' : v < 0 ? '-' : '0'}`);
    }
}

// ══════════════════════════════════════════════════════════════
//  f(x) = (3x-2)/(x-1)
//  Zéro numérateur : 3x-2=0 → x = 2/3
//  Valeur interdite : x-1=0 → x = 1
// ══════════════════════════════════════════════════════════════
{
    console.log('\n▶ f(x) = (3x-2)/(x-1)');

    const cpNum = [2 / 3]; // zéro numérat.
    const cpDen = [1];     // valeur interdite
    const cp = [...cpNum, ...cpDen].sort((a, b) => a - b); // [2/3, 1]

    const xDisplay = buildXDisplay(cp); // ['-inf', '2/3', '', '1', '+inf']
    console.log('  Points critiques:', cp.map(formatForTable));
    console.log('  Colonnes x:', xDisplay);

    // Tableau attendu :
    //  x     | -∞  |     | 2/3 |     |  1  |     | +∞
    //  3x-2  |  -  |  -  |  0  |  +  |  +  |  +  |  +
    //  x-1   |  -  |  -  |  -  |  -  | ||  |  +  |  +
    //  f(x)  |  +  |  +  |  0  |  -  | ||  |  +  |  +

    const row1 = buildSignRow('3*x-2', cp);                        // numérateur
    const row2 = buildSignRow('x-1', cp, 'denominator', true);   // dénominateur → interdite

    console.log('  row 3x-2 :', row1);
    console.log('  row x-1  :', row2);

    printTable('f(x) = (3x-2)/(x-1)', xDisplay,
        [{ label: '3x-2', signs: row1 }, { label: 'x-1', signs: row2 }],
        'f(x)'
    );

    // Vérification numérique
    console.log('\n  Vérification numérique f(x) = (3x-2)/(x-1):');
    for (const x of [0, 0.5, 0.667, 0.9, 1.1, 2, 5]) {
        const v = evalAt('(3*x-2)/(x-1)', x);
        const sign = v === null ? '||' : v > 1e-9 ? '+' : v < -1e-9 ? '-' : '0';
        console.log(`    f(${x}) = ${v !== null ? v.toFixed(4) : 'UNDEF'} → ${sign}`);
    }
}

// ══════════════════════════════════════════════════════════════
{
    console.log('\n▶ k(x) = (-x²-5x-6) × √x');
    // Domaine : x ≥ 0 (√x exige x ≥ 0)
    // Facteurs :
    //   - sqrt(x) : toujours ≥ 0, s'annule en x=0
    //   - (-x²-5x-6) : trinôme -x²-5x-6
    //       Δ = 25 - 24 = 1 > 0
    //       x₁ = (5 - 1) / (-2) = -2
    //       x₂ = (5 + 1) / (-2) = -3
    //   Mais sur le domaine x ≥ 0, les racines x=-2 et x=-3 sont HORS domaine
    //   → Sur [0, +∞), (-x²-5x-6) a un signe constant
    //   → Tester en x=0 : -0-0-6 = -6 < 0 → toujours négatif sur [0, +∞)
    // Donc k(x) = (négatif) × (positif) = négatif sur ]0, +∞[, k(0)=0

    console.log('\n  Analyse:');
    console.log('  - Domaine: [0, +∞) car √x exige x ≥ 0');
    console.log('  - Facteur √x : ≥ 0, zero en x=0');
    console.log('  - Facteur (-x²-5x-6) : Δ=25-24=1>0, racines x₁=-3, x₂=-2 (hors domaine)');
    console.log('  - Sur [0, +∞) : (-x²-5x-6) vaut -6 en x=0 → TOUJOURS NÉGATIF');

    console.log('\n  Tableau de signes de k(x) = (-x²-5x-6)√x:');
    console.log('  ══════════════════════════════════════════════');
    console.log(`  x              |   0    |       +∞      `);
    console.log('  ---------------+--------+----------------');
    console.log(`  √x             |   0    |       +       `);
    console.log(`  -x²-5x-6       |   -6   |       -       `);
    console.log('  ---------------+--------+----------------');
    console.log(`  k(x)           |   0    |       -       `);
    console.log('  ══════════════════════════════════════════════');

    console.log('\n  Vérification numérique k(x) = (-x^2 - 5*x - 6)*sqrt(x):');
    for (const x of [0, 0.5, 1, 2, 4, 9]) {
        const v = evalAt('(-x^2 - 5*x - 6)*sqrt(x)', x);
        console.log(`    k(${x}) = ${v?.toFixed(4)} → ${v === 0 ? '0' : v > 0 ? '+' : '-'}`);
    }
}

console.log('\n\n✅ Tests terminés.\n');
