const inputCleaned = 'Dans un repère, place les points A(1, 2) et B(4, 6) et trace le vecteur vecteur AB.';
let block = `
title: Triangle avec vecteur
point: A, 1, 2
point: B, 4, 6
segment: AB
`;

if (/\\bvecteur\\s+([a-zA-Z0-9]{1,2})\\b/i.test(inputCleaned)) {
    const vecMatches = [...inputCleaned.matchAll(/\\bvecteur\\s+([a-zA-Z0-9]{1,2})\\b/gi)];
    vecMatches.forEach(m => {
        const vecName = m[1].toUpperCase();
        console.log("Found vecName:", vecName);
        const pattern = vecName.length === 2 ? `\\[?\\s*${vecName[0]}\\s*,?\\s*${vecName[1]}\\s*\\]?` : vecName;
        console.log("Pattern:", pattern);
        block = block.replace(new RegExp(`(?:segment|droite|demi-droite):\\s*${pattern}(?:\\s|$)`, 'gi'), `vecteur: ${vecName}\n`);
    });
}
console.log("FINAL BLOCK:", block);
