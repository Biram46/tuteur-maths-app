import fetch from 'node-fetch';

async function test() {
    const prompt = `[SYSTÈME GÉOMÉTRIE] L'élève demande une figure géométrique.
Tu DOIS répondre avec UN SEUL bloc @@@...@@@ au format suivant :

@@@
geo
title: [titre de la figure]
point: A, [x], [y]
point: B, [x], [y]
[...autres points...]
segment: AB
[...ou: droite: AB | cercle: O, r | triangle: A, B, C | vecteur: AB | angle: A,B,C | angle_droit: A,B,C]

Puis explique la figure pédagogiquement.

RÈGLE ABSOLUE : Tu DOIS TOUJOURS déclarer chaque point avec ses coordonnées.
- Respecte les conventions EN France : [AB] pour segments, (d) pour droites, [AB) pour demi-droites
- Pour un vecteur canonique, utilise OBLIGATOIREMENT : vecteur: AB (ne trace JAMAIS un segment classique si un vecteur $\\vec{AB}$ est explicitement demandé)`;

    const userPrompt = `Dans un repère, place les points A(1, 2) et B(4, 6) et trace le vecteur vecteur AB.`;

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
            model: "sonar-reasoning",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: userPrompt }
            ]
        })
    });
    
    const data = await res.json();
    console.log(data.choices[0].message.content);
}

test();
