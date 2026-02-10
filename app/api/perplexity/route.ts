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

        // 1. RECHERCHE RAPIDE (Perplexity) - Non-streamée car courte
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
        const reasoningPrompt = `Tu es mimimaths@i, un Super-Tuteur de mathématiques. 
        
        FORMAT DE GRAPHIQUE (OBLIGATOIRE - STRICT JSON) :
        [FIGURE: Graph: {"title": "Courbe lisse", "points": [{"x": -3, "y": 2, "type": "closed"}, {"x": -1, "y": -2}, {"x": 2, "y": 3}], "domain": {"x": [-4, 6], "y": [-3, 4]}}]
        
        ATTENTION : Dans le JSON du graphique, utilise UNIQUEMENT le petit tiret "-" du clavier pour les nombres négatifs. Ne mets PAS de sauts de ligne à l'intérieur du tag [FIGURE: ...].
        
        DIRECTIVES TECHNIQUES :
        - Les "points" sont des points de passage. Le moteur tracera une courbe de Bézier (Spline Monotone) parfaitement lisse passant par ces points.
        - "type": "closed" (point plein) ou "open" (point vide) pour les bornes d'intervalles comme [-3; 5[.
        - Ne réponds qu'aux mathématiques du lycée français. Respecte le programme : ${curriculumContext}.
        
        MÉTHODOLOGIE PÉDAGOGIQUE :
        - Pose des questions sur les maximums, minimums, variations ou signes à partir du graphique lisse que tu génères.
        
        LaTeX : Utilise $...$ pour les symboles classiques.`;

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
