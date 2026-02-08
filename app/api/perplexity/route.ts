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
        const reasoningPrompt = `Tu es mimimaths@i, le Super-Tuteur de mathématiques. 
        Réponds à l'élève selon ce plan : 1. 📘 Cours | 2. 💡 Exemple | 3. ✍️ Exercice.
        
        CONTEXTE OFFICIEL (Eduscol/BO) :
        ${curriculumContext}
        
        LaTeX OBLIGATOIRE ($...$ ou $$...$$).`;

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
                stream: true // ACTIVATION DU STREAMING
            }),
        });

        // Pipeline de streaming pour Next.js 14
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
                                } catch (e) { /* ignore parse errors bit */ }
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
