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

async function checkDatabase() {
    console.log('🔍 Vérification de la base de données Supabase...\n');

    // 1. Vérifier les niveaux
    console.log('📚 Niveaux :');
    const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('id, code, label, position')
        .order('position');

    if (levelsError) {
        console.error('❌ Erreur niveaux:', levelsError.message);
    } else {
        console.log(`✅ ${levels.length} niveaux trouvés`);
        levels.forEach(l => console.log(`   - ${l.label || 'Sans nom'} (${l.code}) - id: ${l.id}`));
    }

    // 2. Vérifier les chapitres
    console.log('\n📖 Chapitres :');
    const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, code, title, position, level_id')
        .order('position');

    if (chaptersError) {
        console.error('❌ Erreur chapitres:', chaptersError.message);
    } else {
        console.log(`✅ ${chapters.length} chapitres trouvés`);
        chapters.forEach(c => console.log(`   - ${c.title || 'Sans nom'} (${c.code})`));
    }

    // 3. Vérifier les ressources
    console.log('\n📄 Ressources :');
    const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('id, chapter_id, kind, pdf_url, docx_url, latex_url, html_url')
        .order('id');

    if (resourcesError) {
        console.error('❌ Erreur ressources:', resourcesError.message);
    } else {
        console.log(`✅ ${resources.length} ressources trouvées`);

        // Grouper par type
        const byKind = resources.reduce((acc, r) => {
            acc[r.kind] = (acc[r.kind] || 0) + 1;
            return acc;
        }, {});

        console.log('\n   Par type :');
        Object.entries(byKind).forEach(([kind, count]) => {
            console.log(`   - ${kind}: ${count}`);
        });

        // Vérifier les URLs
        console.log('\n   Vérification des URLs :');
        const urlIssues = resources.filter(r => {
            if (r.kind === 'interactif') {
                // Les interactifs doivent avoir html_url
                return !r.html_url || r.html_url.trim() === '';
            } else {
                // Les autres doivent avoir au moins une URL
                return (!r.pdf_url && !r.docx_url && !r.latex_url && !r.html_url);
            }
        });

        if (urlIssues.length > 0) {
            console.log(`   ⚠️ ${urlIssues.length} ressources sans URL valide :`);
            urlIssues.forEach(r => {
                console.log(`      - Kind: ${r.kind} - Chapter ID: ${r.chapter_id}`);
            });
        } else {
            console.log('   ✅ Toutes les ressources ont au moins une URL');
        }
    }

    // 4. Vérifier les résultats de quiz
    console.log('\n🎯 Résultats de quiz :');
    const { data: quizResults, error: quizError } = await supabase
        .from('quiz_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (quizError) {
        console.error('❌ Erreur quiz_results:', quizError.message);
    } else {
        console.log(`✅ ${quizResults.length} résultats récents trouvés`);
        if (quizResults.length > 0) {
            quizResults.forEach(q => {
                const userId = q.user_id ? q.user_id.substring(0, 8) + '...' : 'N/A';
                const date = q.created_at ? new Date(q.created_at).toLocaleDateString() : 'N/A';
                console.log(`   - User: ${userId} | Score: ${q.score}/${q.total} | ${date}`);
            });
        }
    }

    // 5. Vérifier la table profiles (si elle existe)
    console.log('\n👤 Profils utilisateurs :');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (profilesError) {
        if (profilesError.code === '42P01') {
            console.error('❌ La table "profiles" n\'existe pas !');
            console.log('   ⚠️ Vous devez exécuter le script supabase_setup_profiles.sql');
        } else {
            console.error('❌ Erreur profiles:', profilesError.message);
        }
    } else {
        console.log(`✅ ${profiles.length} profils trouvés`);
        if (profiles.length > 0) {
            profiles.forEach(p => {
                console.log(`   - ${p.email} | Créé: ${new Date(p.created_at).toLocaleDateString()}`);
            });
        }
    }

    console.log('\n✅ Vérification terminée !\n');
}

checkDatabase().catch(console.error);
