
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getEmbedding(text: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: text
        })
    });
    const result: any = await res.json();
    if (result.error) throw new Error(result.error.message);
    return result.data[0].embedding;
}

async function fixContentWithAI(content: string) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un expert en conversion LaTeX vers Markdown + KaTeX. Ta mission est de transformer un document LaTeX complet ou partiel (incluant preambles, environnements, et commandes complexes) en un document Markdown propre, lisible et parfaitement rendu par KaTeX.

Règles de conversion :
1. STRUCTURE : Supprime le préambule (\\documentclass, \\usepackage, etc.) et le \\begin{document}. Ne garde que le contenu utile.
2. TITRES : Convertis \\section, \\subsection, \\subsubsection en #, ##, ###.
3. LISTES : Convertis \\begin{enumerate} en listes numérotées (1., 2.) et \\begin{itemize} en puces (-).
4. MATHÉMATIQUES (CRITIQUE) : 
   - Convertis TOUS les délimiteurs \\( ... \\) en $ ... $.
   - Convertis TOUS les délimiteurs \\[ ... \\] en $$ ... $$.
   - Assure-toi que TOUTE formule mathématique est entourée de symboles monétaires ($).
5. TABLEAUX, GRAPHIQUES & GÉOMÉTRIE (MIMIMATHS PRO) : 
   - Utilise EXCLUSIVEMENT les balises suivantes :
     A) <mathtable data='...' /> :
        { "xValues": ["xi", "xj"], "rows": [{"label": "f", "type": "variation", "content": ["val", "nearrow", "val"]}] }
        IMPORTANT : "content" pour variation DOIT alterner valeur et flèche (ex: 2N-1 items pour N valeurs de x).
     B) <mathgraph data='...' /> :
        { "functions": [{"fn": "sin(x)", "color": "#ff0000"}], "title": "Courbe" }
     C) <geometryfigure data='...' /> :
        { "objects": [{"id": "A", "kind": "point", "x": 1, "y": 2}], "title": "Figure" }
6. NETTOYAGE : Supprime les commandes LaTeX inutiles (préambule).
7. NE METS JAMAIS de balises de bloc de code markdown (\`\`\`markdown).`
                },
                {
                    role: 'user',
                    content: content
                }
            ],
            temperature: 0.1
        })
    });
    const result: any = await res.json();
    if (result.error) throw new Error(result.error.message);
    
    let fixed = result.choices[0].message.content;
    fixed = fixed.replace(/^```markdown\n/i, '').replace(/^```\n/i, '').replace(/\n```$/i, '').trim();
    return fixed;
}

async function runBulkFix() {
    console.log('--- Démarrage de la conversion globale (3271 fichiers) ---');
    
    // Récupérer les documents non encore traités
    const { data: docs, error } = await supabase
        .from('rag_documents')
        .select('id, content, metadata')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur Supabase:', error);
        return;
    }

    const toProcess = docs.filter(doc => doc.metadata?.fixed_by_ai !== 'true');
    console.log(`${toProcess.length} documents à traiter sur ${docs.length} au total.`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const doc of toProcess) {
        if (!doc.content || doc.content.length < 5) {
            skipped++;
            continue;
        }

        try {
            process.stdout.write(`[${success + failed + skipped + 1}/${toProcess.length}] Traitement de ${doc.id}... `);
            
            const fixedContent = await fixContentWithAI(doc.content);
            const embedding = await getEmbedding(fixedContent);

            const { error: updateError } = await supabase
                .from('rag_documents')
                .update({
                    content: fixedContent,
                    embedding: embedding,
                    metadata: { 
                        ...doc.metadata, 
                        fixed_by_ai: 'true', 
                        fixed_date: new Date().toISOString() 
                    }
                })
                .eq('id', doc.id);

            if (updateError) throw updateError;
            
            success++;
            process.stdout.write('✅\n');
        } catch (e: any) {
            failed++;
            process.stdout.write(`❌ (${e.message})\n`);
        }
        
        // Pause pour le rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n--- Résumé final ---`);
    console.log(`Documents convertis : ${success}`);
    console.log(`Échecs : ${failed}`);
    console.log(`Ignorés (trop courts) : ${skipped}`);
    console.log(`---------------------`);
}

runBulkFix();
