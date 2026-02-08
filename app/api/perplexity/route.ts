import { NextRequest, NextResponse } from 'next/server';

/**
 * Route API Hybride pour mimimaths@i
 * Combine Perplexity (Recherche BO/Eduscol) et DeepSeek R1 (Raisonnement Mathématique)
 */
export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();

        const perplexityKey = process.env.PERPLEXITY_API_KEY;
        const deepseekKey = process.env.DEEPSEEK_API_KEY;

        if (!perplexityKey || !deepseekKey) {
            return NextResponse.json({ error: 'Configurations API manquantes (Perplexity ou DeepSeek)' }, { status: 500 });
        }

        const userQuestion = messages[messages.length - 1].content;

        // ÉTAPE 1 : Recherche du contexte pédagogique via Perplexity
        // On demande à Perplexity de nous donner les points clés du programme officiel français sur le sujet.
        const searchPrompt = `En tant qu'assistant de recherche pour un professeur de mathématiques, 
        recherche et résume les points clés du programme de l'Éducation Nationale française (Eduscol/BO) 
        concernant la notion suivante : "${userQuestion}". 
        Donne uniquement les définitions officielles et les attendus de fin d'année pour le niveau : ${context}.`;

        const searchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'system', content: "Tu es un documentaliste expert Eduscol/BO." }, { role: 'user', content: searchPrompt }],
                temperature: 0.2,
            }),
        });

        const searchData = await searchResponse.json();
        const curriculumContext = searchData.choices[0].message.content;
        const citations = searchData.citations || [];

        // ÉTAPE 2 : Génération de la réponse pédagogique via DeepSeek R1
        // On combine la recherche officielle avec la puissance de raisonnement de DeepSeek.
        const reasoningPrompt = `Tu es mimimaths@i, le Super-Tuteur de mathématiques. 
        Tu dois répondre à l'élève en suivant ce plan : 
        1. 📘 Rappel du Cours (basé sur le contexte officiel fourni ci-dessous).
        2. 💡 Exemple Traité (rédigé parfaitement).
        3. ✍️ Exercice d'application (attendre la réponse de l'élève).

        CONTEXTE OFFICIEL RÉCUPÉRÉ (Eduscol/BO) :
        ${curriculumContext}

        CONSIGNES :
        - Utilise LaTeX pour TOUTE formule mathématique ($...$ et $$...$$).
        - Respecte les notations françaises.
        - Sois bienveillant et rigoureux.`;

        const finalResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${deepseekKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-reasoner', // DeepSeek-R1
                messages: [
                    { role: 'system', content: reasoningPrompt },
                    ...messages
                ]
            }),
        });

        if (!finalResponse.ok) throw new Error('Erreur API DeepSeek R1');
        const finalData = await finalResponse.json();

        return NextResponse.json({
            success: true,
            response: finalData.choices[0].message.content,
            citations: citations // On garde les sources Perplexity
        });

    } catch (error) {
        console.error('Erreur Super-Tuteur Hybride:', error);
        return NextResponse.json({ error: 'Une défaillance technique est survenue dans le noyau quantique.' }, { status: 500 });
    }
}
