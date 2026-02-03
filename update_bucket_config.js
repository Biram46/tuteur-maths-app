
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'resources';

async function updateBucketConfig() {
    console.log(`Tentative de mise à jour de la config du bucket: ${bucketName}`);

    // On essaie de mettre à jour pour autoriser explicitement le HTML
    const { data, error } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        allowedMimeTypes: [
            'text/html',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png',
            'image/jpeg',
            'image/svg+xml'
        ],
        fileSizeLimit: 52428800 // 50MB
    });

    if (error) {
        console.error("Erreur updateBucket:", error);
    } else {
        console.log("Config bucket mise à jour avec succès:", data);
    }
}

updateBucketConfig();
