const { parseGeoScene } = require('./lib/geo-engine/parser.ts');
const block = "vecteur: AB, u";
try {
    const res = parseGeoScene(block);
    console.log("SUCCESS parsedScene:", JSON.stringify(res.objects));
} catch(e) { console.error('FAIL', e); }
