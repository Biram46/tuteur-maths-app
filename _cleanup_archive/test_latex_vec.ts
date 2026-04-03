import * as fs from 'fs';

const input = 'Dans un repère, place les points $A(1, 2)$ et $B(4, 6)$ et trace le vecteur $\\vec{AB}$';
console.log('Original:', input);

const deLatexInput = (s: string) => s
    .replace(/\\\[|\\\]/g, '')
    .replace(/\\\(|\\\)/g, '')
    .replace(/\$\$/g, '').replace(/\$/g, '')
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\vec\s*\{([^{}]+)\}/g, 'vecteur $1')
    .replace(/\\overrightarrow\s*\{([^{}]+)\}/g, 'vecteur $1')
    .replace(/\\vec\s*([a-zA-Z0-9]{1,2})/g, 'vecteur $1')
    .replace(/\\overrightarrow\s*([a-zA-Z0-9]{1,2})/g, 'vecteur $1')
    .replace(/\{/g, '(').replace(/\}/g, ')')
    .replace(/\\left\b/g, '').replace(/\\right\b/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .trim();

const cleaned = deLatexInput(input);
console.log('Cleaned:', cleaned);
