const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Service Role Key in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("🚀 Démarrage de l'intégration du programme de Première Spécialité...");

    // 1. Création du Niveau
    const { data: level, error: levelErr } = await supabase
        .from('levels')
        .upsert({ code: '1SPE', label: '1ère Spécialité Maths', position: 2 }, { onConflict: 'code' })
        .select()
        .single();

    if (levelErr) {
        console.error("Erreur Niveau:", levelErr);
        return;
    }
    console.log("✅ Niveau '1ère Spécialité' opérationnel.");

    const levelId = level.id;

    // 2. Création des Chapitres
    const chaptersData = [
        { level_id: levelId, code: 'second-degre', title: 'Le Second Degré', position: 1, published: true },
        { level_id: levelId, code: 'suites', title: 'Suites Numériques', position: 2, published: true },
        { level_id: levelId, code: 'derivation', title: 'Dérivation', position: 3, published: true }
    ];

    const { data: chapters, error: chaptersErr } = await supabase
        .from('chapters')
        .upsert(chaptersData, { onConflict: 'code' })
        .select();

    if (chaptersErr) {
        console.error("Erreur Chapitres:", chaptersErr);
        return;
    }
    console.log("✅ Chapitres (Second Degré, Suites, Dérivation) intégrés.");

    // 3. Création des Ressources
    const resourcesData = [];

    // Resources for Second Degré
    const secDeg = chapters.find(c => c.code === 'second-degre');
    resourcesData.push({
        chapter_id: secDeg.id,
        kind: 'cours',
        html_url: '/resources/1ere/second_degre_cours.md' // Using MD as HTML for ReactMarkdown
    });
    resourcesData.push({
        chapter_id: secDeg.id,
        kind: 'interactif',
        html_url: '/exos/1ere/second_degre.html'
    });

    // Resources for Suites
    const suites = chapters.find(c => c.code === 'suites');
    resourcesData.push({
        chapter_id: suites.id,
        kind: 'interactif',
        html_url: '/exos/1ere/suites.html'
    });

    const { error: resErr } = await supabase
        .from('resources')
        .upsert(resourcesData, { onConflict: 'chapter_id,kind,html_url' });

    if (resErr) {
        console.error("Erreur Ressources:", resErr);
        // Note: onConflict might need better keys depending on schema
    } else {
        console.log("✅ Toutes les ressources pédagogiques sont en ligne.");
    }

    console.log("\n🎉 Intégration terminée avec succès !");
}

seed();
