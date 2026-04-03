const str = "vecteur: AB\r\npoint: A";
const res = str.replace(/^([ \t]*(?:vecteur|vector|vec):\s*AB)\s*$/gim, '$1, u');
console.log(JSON.stringify(res));
