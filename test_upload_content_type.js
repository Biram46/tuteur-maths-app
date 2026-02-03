
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Erreur: Les variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY sont manquantes.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'resources';

async function testUpload() {
    console.log(`Test upload vers le bucket: ${bucketName}`);

    const fileName = 'test_upload_script.html';
    const fileContent = '<html><body><h1>Ceci est un test</h1><p>Si vous voyez ça, le HTML est bien rendu.</p></body></html>';
    const timestamp = Date.now();
    const filePath = `debug_tests/${timestamp}-${fileName}`;
    const contentType = 'text/html';

    console.log(`Uploading ${filePath} avec Content-Type: ${contentType}...`);

    // Essai avec Buffer pour voir si ça change quelque chose par rapport à string
    const fileBuffer = Buffer.from(fileContent, 'utf-8');

    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
            upsert: true,
            contentType: contentType,
            cacheControl: '3600'
        });

    if (error) {
        console.error("Upload Error:", error);
        return;
    }

    console.log("Upload réussi:", data);

    // Vérifier l'URL publique
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    console.log("Public URL:", publicUrl);

    console.log("\n--- VÉRIFICATION DU CONTENT-TYPE VIA TÉLÉCHARGEMENT ---");

    // On essaie de faire un fetch HEAD sur l'URL publique (si accessible) ou de récupérer les métadonnées
    // Note: le client admin js ne donne pas facilement les metadata HTTP via list, mais on peut télécharger le blob.

    try {
        // Utilisation de fetch natif pour vérifier les headers
        const response = await fetch(publicUrl, { method: 'HEAD' });
        console.log("Status:", response.status);
        console.log("Content-Type reçu du serveur:", response.headers.get('content-type'));

        if (response.headers.get('content-type')?.includes('text/html')) {
            console.log("SUCCÈS: Le fichier est bien servi comme HTML.");
        } else {
            console.log("ÉCHEC: Le fichier n'est PAS servi comme HTML.");
        }
    } catch (e) {
        console.error("Erreur lors du fetch:", e);
    }
}

testUpload();
