import { parseGeoScene } from './lib/geo-engine/parser.ts';

const code = `
geo
title: test
point: A, 1, 2
point: B, 4, 6
vecteur: AB
`;

const scene = parseGeoScene(code);
console.log(JSON.stringify(scene, null, 2));
