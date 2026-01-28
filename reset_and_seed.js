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

async function resetAndSeed() {
    console.log('🔧 Réinitialisation et seeding de la base de données...\n');

    // 1. Supprimer toutes les données existantes
    console.log('🗑️  Suppression des données existantes...');
    await supabase.from('resources').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('levels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Données supprimées\n');

    // 2. Créer les niveaux
    console.log('📚 Création des niveaux...');
    const levelsData = [
        { code: '2NDE', label: 'Seconde', position: 1 },
        { code: '1SPE', label: 'Première Spécialité Maths', position: 2 },
        { code: 'TSPE', label: 'Terminale Spécialité Maths', position: 3 },
        { code: 'TEXP', label: 'Terminale Maths Expertes', position: 4 }
    ];

    const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .insert(levelsData)
        .select();

    if (levelsError) {
        console.error('❌ Erreur création niveaux:', levelsError);
        return;
    }
    console.log(`✅ ${levels.length} niveaux créés\n`);

    // 3. Trouver le niveau 1SPE
    const level1SPE = levels.find(l => l.code === '1SPE');
    if (!level1SPE) {
        console.error('❌ Niveau 1SPE non trouvé');
        return;
    }

    // 4. Créer les chapitres pour 1ère
    console.log('📖 Création des chapitres pour Première...');
    const chaptersData = [
        { level_id: level1SPE.id, code: 'second-degre', title: 'Le Second Degré', position: 1, published: true },
        { level_id: level1SPE.id, code: 'suites', title: 'Suites Numériques', position: 2, published: true },
        { level_id: level1SPE.id, code: 'derivation', title: 'Dérivation', position: 3, published: true },
        { level_id: level1SPE.id, code: 'produit-scalaire', title: 'Produit Scalaire', position: 4, published: true },
        { level_id: level1SPE.id, code: 'probabilites', title: 'Probabilités Conditionnelles', position: 5, published: true }
    ];

    const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .insert(chaptersData)
        .select();

    if (chaptersError) {
        console.error('❌ Erreur création chapitres:', chaptersError);
        return;
    }
    console.log(`✅ ${chapters.length} chapitres créés\n`);

    // 5. Créer les ressources
    console.log('📄 Création des ressources...');
    const fileNames = {
        'second-degre': 'second_degre',
        'suites': 'suites',
        'derivation': 'derivation',
        'produit-scalaire': 'produit_scalaire',
        'probabilites': 'probabilites'
    };

    const resources = [];

    for (const chapter of chapters) {
        const base = fileNames[chapter.code];

        // 1. Cours (MD + PDF + DOCX + TEX)
        resources.push({
            chapter_id: chapter.id,
            kind: 'cours',
            html_url: `/resources/1ere/${base}_cours.md`,
            pdf_url: `/resources/1ere/${base}_cours.pdf`,
            docx_url: `/resources/1ere/${base}_cours.docx`,
            latex_url: `/resources/1ere/${base}_cours.tex`
        });

        // 2. Exercices non-interactifs (PDF + DOCX + TEX)
        resources.push({
            chapter_id: chapter.id,
            kind: 'exercice',
            html_url: null,
            pdf_url: `/resources/1ere/${base}_exos.pdf`,
            docx_url: `/resources/1ere/${base}_exos.docx`,
            latex_url: `/resources/1ere/${base}_exos.tex`
        });

        // 3. Exercice interactif (HTML)
        resources.push({
            chapter_id: chapter.id,
            kind: 'interactif',
            html_url: `/exos/1ere/${base}.html`,
            pdf_url: null,
            docx_url: null,
            latex_url: null
        });
    }

    const { data: insertedResources, error: resourcesError } = await supabase
        .from('resources')
        .insert(resources)
        .select();

    if (resourcesError) {
        console.error('❌ Erreur création ressources:', resourcesError);
        return;
    }
    console.log(`✅ ${insertedResources.length} ressources créées\n`);

    // 6. Vérification finale
    console.log('🔍 Vérification finale...\n');

    const { data: finalLevels } = await supabase.from('levels').select('*').order('position');
    console.log('📚 Niveaux :');
    finalLevels.forEach(l => console.log(`   - ${l.label} (${l.code})`));

    const { data: finalChapters } = await supabase.from('chapters').select('*').order('position');
    console.log('\n📖 Chapitres :');
    finalChapters.forEach(c => console.log(`   - ${c.title} (${c.code})`));

    const { data: finalResources } = await supabase.from('resources').select('*');
    console.log(`\n📄 Ressources : ${finalResources.length} au total`);

    const byKind = finalResources.reduce((acc, r) => {
        acc[r.kind] = (acc[r.kind] || 0) + 1;
        return acc;
    }, {});

    console.log('   Par type :');
    Object.entries(byKind).forEach(([kind, count]) => {
        console.log(`   - ${kind}: ${count}`);
    });

    console.log('\n✅ Base de données réinitialisée et seedée avec succès ! 🎉\n');
}

resetAndSeed().catch(console.error);
