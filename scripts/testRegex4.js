const str = "vecteur: AB\r\npoint: A";
const pts = "AB";
const res = str.replace(new RegExp(`^([ \\t]*(?:vecteur|vector|vec)\\s*:\\s*${pts})\\s*$`, 'gim'), `$1, u`);
console.log(JSON.stringify(res));
