import { NextRequest, NextResponse } from 'next/server';

/**
 * Route API qui permet de switcher entre Perplexity et DeepSeek
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context, mode = 'standard' } = await request.json();

        // MODE 1: DEEPSEEK (Expert Calcul / Raisonnement R1)
        if (mode === 'expert') {
            const apiKey = process.env.DEEPSEEK_API_KEY;

            if (!apiKey) {
                return NextResponse.json({ error: 'Clé DeepSeek non configurée' }, { status: 500 });
            }

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'deepseek-reasoner',
                    messages: [
                        { role: 'system', content: `Tu es mimimaths@i, version EXPERT en raisonnement logique. Tu es un professeur de mathématiques français utilisant les programmes officiels. Utilise LaTeX ($...$ et $$...$$). Justifie chaque étape. Contexte : ${context}` },
                        ...messages
                    ]
                }),
            });

            if (!response.ok) throw new Error('Erreur API DeepSeek');
            const data = await response.json();
            return NextResponse.json({ success: true, response: data.choices[0].message.content });
        }

        // MODE 2: PERPLEXITY (Standard / Recherche & Cours) - Mode par défaut déjà existant
        const perplexityKey = process.env.PERPLEXITY_API_KEY;
        if (!perplexityKey) return NextResponse.json({ error: 'Clé Perplexity non configurée' }, { status: 500 });

        const systemPrompt = `Tu es mimimaths@i, un Professeur de Mathématiques expert de l'Éducation Nationale (France). 
        Utilise Eduscol et le BO pour tes recherches. Structure : Cours > Exemple > Exercice. LaTeX obligatoire.
        CONTEXTE : ${context}`;

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                temperature: 0.5,
            }),
        });

        if (!response.ok) throw new Error('Erreur API Perplexity');
        const data = await response.json();

        return NextResponse.json({
            success: true,
            response: data.choices[0].message.content,
            citations: data.citations || []
        });

    } catch (error) {
        console.error('Erreur Router IA:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
