
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLastResource() {
    const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Erreur:", error);
        return;
    }

    if (data && data.length > 0) {
        const res = data[0];
        console.log("Dernière ressource uploadée :");
        console.log(`ID: ${res.id}`);
        console.log(`Type: ${res.kind}`);
        console.log(`Chapitre ID: ${res.chapter_id}`);
        console.log(`DOCX URL: ${res.docx_url}`);
        console.log(`PDF URL: ${res.pdf_url}`);
        console.log(`HTML URL: ${res.html_url}`);

        if (res.docx_url) {
            console.log("\nVérification de l'URL...");
            try {
                const fetch = require('node-fetch'); // ou fetch natif selon version node
                const response = await fetch(res.docx_url, { method: 'HEAD' });
                console.log(`Statut HTTP: ${response.status}`);
                console.log(`Content-Type: ${response.headers.get('content-type')}`);
            } catch (e) {
                console.log("Erreur lors du fetch de l'URL:", e.message);
            }
        }
    } else {
        console.log("Aucune ressource trouvée.");
    }
}

checkLastResource();
