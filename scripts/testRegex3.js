const str = "vecteur : A, B\r\npoint: A";
const res = str.replace(/^([ \t]*(?:vecteur|vector|vec)\s*:\s*\[?\s*A\s*,?\s*B\s*\]?)\s*$/gim, (m, g1) => {
    return JSON.stringify(g1);
});
console.log(res);
