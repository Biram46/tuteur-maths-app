import { extractFunctionParams } from './lib/math-engine/expression-parser';
const msg = `Soit la fonction $f(x) = \\frac{e^x}{x}$. 1) Donne moi son domaine de définition. 2) Calcule sa dérivée f'(x). 3) Dresse son tableau de variations complet.`;
console.log(extractFunctionParams(msg));
