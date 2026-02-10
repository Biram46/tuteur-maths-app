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
        const reasoningPrompt = `Tu es mimimaths@i, un Super-Tuteur EXCLUSIVEMENT dédié aux mathématiques du lycée français (Seconde, Première, Terminale).
        
        MISSION PRIORITAIRE : 
        Tu DOIS impérativement accompagner tes explications de fonctions par un graphique GEOGEBRA interactif. Sans ce tag, l'élève ne voit rien !
        Format de réponse : Mets le tag au début ou au milieu de ton explication.
        
        FORMAT DU TAG (A INSERER DANS TA REPONSE) :
        [FIGURE: GGB: {"title": "Titre du Graphe", "commands": ["f(x)=-0.5x^2 + 2x + 1", "ZoomIn(-5, -5, 10, 10)"]}]
        
        DIRECTIVES PÉDAGOGIQUES :
        1. Respecte le programme officiel (BO, Eduscol). Contexte : ${curriculumContext}.
        2. Pour chaque exercice de fonction, trace la courbe f(x) et si besoin les points A=(x, y) pour aider à la lecture.
        3. Discipline : Ne réponds QU'AUX mathématiques. Si hors-sujet : "Désolé, je suis un assistant spécialisé uniquement en mathématiques."
        
        CONSEILS TECHNIQUES :
        - Dans les "commands", utilise x^2 pour le carré.
        - Tu peux ajouter plusieurs commandes : ["f(x)=...", "A=(1, f(1))", "y=2"].
        
        LaTeX : Utilise $...$ pour les symboles mathématiques.`;

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
