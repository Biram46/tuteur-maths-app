const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
}

loadEnv(path.join(__dirname, '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("🚀 Mise à jour du programme de Première avec tous les formats (.pdf, .docx, .tex, .md)...");

    const { data: level } = await supabase.from('levels').select('id').eq('code', '1SPE').single();
    if (!level) { console.error("Level 1SPE non trouvé."); return; }
    const levelId = level.id;

    // Chapters list
    const chaptersData = [
        { level_id: levelId, code: 'second-degre', title: 'Le Second Degré', position: 1, published: true },
        { level_id: levelId, code: 'suites', title: 'Suites Numériques', position: 2, published: true },
        { level_id: levelId, code: 'derivation', title: 'Dérivation', position: 3, published: true },
        { level_id: levelId, code: 'produit-scalaire', title: 'Produit Scalaire', position: 4, published: true },
        { level_id: levelId, code: 'probabilites', title: 'Probabilités Conditionnelles', position: 5, published: true }
    ];

    // Ensure chapters exist and get their IDs
    for (const ch of chaptersData) {
        await supabase.from('chapters').upsert(ch, { onConflict: 'code' });
    }
    const { data: chapters } = await supabase.from('chapters').select('id, code').eq('level_id', levelId);

    const getChapterId = (code) => chapters.find(c => c.code === code).id;

    // Prepare Resource Rows
    const resources = [];

    const codes = ['second-degre', 'suites', 'derivation', 'produit-scalaire', 'probabilites'];
    const fileNames = {
        'second-degre': 'second_degre',
        'suites': 'suites',
        'derivation': 'derivation',
        'produit-scalaire': 'produit_scalaire',
        'probabilites': 'probabilites'
    };

    for (const code of codes) {
        const id = getChapterId(code);
        const base = fileNames[code];

        // 1. Unified Course Resource (MD + PDF + DOCX + TEX)
        resources.push({
            chapter_id: id,
            kind: 'cours',
            html_url: `/resources/1ere/${base}_cours.md`,
            pdf_url: `/resources/1ere/${base}_cours.pdf`,
            docx_url: `/resources/1ere/${base}_cours.docx`,
            latex_url: `/resources/1ere/${base}_cours.tex`
        });

        // 2. Non-Interactive Exercise Resources (PDF + DOCX + TEX)
        resources.push({
            chapter_id: id,
            kind: 'exercice',
            pdf_url: `/resources/1ere/${base}_exos.pdf`,
            docx_url: `/resources/1ere/${base}_exos.docx`,
            latex_url: `/resources/1ere/${base}_exos.tex`
        });

        // 3. Interactive Exercise
        resources.push({
            chapter_id: id,
            kind: 'interactif',
            html_url: `/exos/1ere/${base === 'probabilites' ? 'probabilites' : (base === 'produit_scalaire' ? 'produit_scalaire' : base)}.html`
        });
    }

    // Clean and Insert
    const chapterIds = chapters.map(c => c.id);
    await supabase.from('resources').delete().in('chapter_id', chapterIds);

    const { error: resErr } = await supabase.from('resources').insert(resources);

    if (resErr) {
        console.error("Erreur Insertion Ressources:", resErr);
    } else {
        console.log("✅ Toutes les ressources multi-formats ont été intégrées.");
    }

    console.log("\n🎉 Opération terminée !");
}

seed();
