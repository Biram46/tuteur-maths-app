const str = "vecteur : A, B\r\npoint: A";
const pts = "AB";
const pattern = `\\[?\\s*${pts[0]}\\s*,?\\s*${pts[1]}\\s*\\]?`;
const res = str.replace(new RegExp(`^([ \\t]*(?:vecteur|vector|vec)\\s*:\\s*${pattern})\\s*$`, 'gim'), `$1, u`);
console.log(JSON.stringify(res));
