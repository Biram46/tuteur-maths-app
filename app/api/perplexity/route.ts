import { NextRequest, NextResponse } from 'next/server';

/**
 * Route API Hybride en Streaming pour mimimaths@i
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();
        const perplexityKey = process.env.PERPLEXITY_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY;

        if (!perplexityKey || !deepseekKey) {
            return NextResponse.json({ error: 'Configurations API manquantes' }, { status: 500 });
        }

        const userQuestion = messages[messages.length - 1].content;

        // 1. RECHERCHE RAPIDE (Perplexity)
        const searchPrompt = `Résume les points clés du programme officiel français (Eduscol/BO) sur : "${userQuestion}" pour le niveau ${context}.`;

        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'system', content: "Tu es un documentaliste Eduscol." }, { role: 'user', content: searchPrompt }],
                temperature: 0.1,
            }),
        });

        const searchData = await searchResponse.json();
        const curriculumContext = searchData.choices[0].message.content;

        // 2. RÉPONSE STREAMÉE (DeepSeek R1)
        const reasoningPrompt = `Tu es mimimaths@i, le Super-Tuteur d'EXCELLENCE dédié EXCLUSIVEMENT aux mathématiques du lycée français (Seconde, Première, Terminale). 
        
        IDENTITÉ & MISSION :
        - Ton ton est celui d'un professeur agrégé, encourageant et ultra-précis.
        - Tu refuses systématiquement de parler d'autre chose que de mathématiques.
        - Tu dois toujours connaître le niveau de l'élève (demande-lui s'il ne l'a pas précisé : 2nde, 1ère Spé, Terminale Spé/Expert/Complémentaire).
        
        ÉDUCATION NATIONALE : 
        - Tu suis strictement les programmes officiels (Eduscol/BO).
        - Contexte actuel : ${curriculumContext}.
        
        CAPACITÉ GRAPHIQUE (OBLIGATOIRE) :
        - Dès que l'élève utilise les termes "lecture graphique", "graphiquement", "courbe", "variations", "signe", ou "extremum", tu DOIS impérativement tracer une courbe lisse pour illustrer tes propos.
        - Les courbes doivent être esthétiques et précises.
        
        FORMAT DU TAG GRAPHIQUE (ULTRA-STRICT) :
        @@@ Titre de la courbe | x1,y1,type | x2,y2 | x3,y3,type | domain:xmin,xmax,ymin,ymax @@@
        RÈGLES :
        1. Utilise TOUJOURS "@@@" pour encapsuler le graphique.
        2. Les coordonnées x,y doivent être numériques.
        3. "type" : "closed" (point plein/borne incluse) ou "open" (point vide/borne exclue).
        4. "domain" : domain:xmin,xmax,ymin,ymax (Obligatoire pour préparer le cadre).
        5. Exemple : @@@ Fonction f | -4,2,closed | 0,-1 | 3,4,open | domain:-5,5,-4,5 @@@

        LaTeX : Utilise $...$ pour les formules dans le texte.`;

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${deepseekKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-reasoner',
                messages: [
                    { role: 'system', content: reasoningPrompt },
                    ...messages
                ],
                stream: true
            }),
        });

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) return;

                const decoder = new TextDecoder();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') break;
                                try {
                                    const json = JSON.parse(data);
                                    const content = json.choices[0].delta?.content || "";
                                    if (content) {
                                        controller.enqueue(new TextEncoder().encode(content));
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        return NextResponse.json({ error: 'Erreur Serveur' }, { status: 500 });
    }
}
