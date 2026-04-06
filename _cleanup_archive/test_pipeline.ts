import { parseGeoScene } from './lib/geo-engine/parser';

// EXACT process from useMathRouter.ts
const inputCleaned = "Dans un repère, place les points A(1, 2) et B(4, 6) et trace le vecteur vecteur AB";
let block = `geo
title: Vecteur AB
point: A, 1, 2
point: B, 4, 6
vecteur: A, B
segment: AB
`;

if (/\\bvecteur\\s+([a-zA-Z0-9]{1,2})\\b/i.test(inputCleaned)) {
    const vecMatches = [...inputCleaned.matchAll(/\\bvecteur\\s+([a-zA-Z0-9]{1,2})\\b/gi)];
    vecMatches.forEach(m => {
        const vecName = m[1].toUpperCase();
        const pattern = vecName.length === 2 ? `\\[?\\s*${vecName[0]}\\s*,?\\s*${vecName[1]}\\s*\\]?` : vecName;
        block = block.replace(new RegExp(`(?:segment|droite|demi-droite):\\s*${pattern}(?:\\s|$)`, 'gi'), `vecteur: ${vecName}\n`);
    });
}
console.log("INTERCEPTED BLOCK:\n", block);
const scene = parseGeoScene(block);
console.log("\nPARSED SCENE:\n", JSON.stringify(scene, null, 2));
