function hasTopLevelAddSub(expr: string): boolean {
    let depth = 0;
    const s = expr.replace(/\s+/g, '');
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (depth === 0 && (ch === '+' || ch === '-')) {
            if (i > 0) {
                const prev = s[i - 1];
                if (prev !== '*' && prev !== '/' && prev !== '^' && prev !== '(' && prev !== 'e' && prev !== 'E') {
                    return true;
                }
            }
        }
    }
    return false;
}

const tests = [
    '(x^2-4)*(x+3)',
    'x^2-4*x+4',
    '-2*x^2 + 5*x - 3',
    '2*x - 4',
    'x + 3',
    '(x+1) + (x-2)',
    '3*x',
    'e^(x+1)',
    '-3*x+6',
    'x',
    '(x^2-4*x+4)'
];

for (const t of tests) {
    console.log(t, '->', hasTopLevelAddSub(t));
}
