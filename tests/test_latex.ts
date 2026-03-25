import { fixLatexContent } from '../lib/latex-fixer';

const text1 = "**$S = ]-\\infty ; \\frac{5}{2}[ \\cup ]\\frac{5}{2} ; +\\infty[$**";
console.log("text1 =>", fixLatexContent(text1).content);
