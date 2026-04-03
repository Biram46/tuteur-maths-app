const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Service Role Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    const { data: levels } = await supabase.from('levels').select('id, code, label').order('position');
    const { data: chapters } = await supabase.from('chapters').select('id, code, title, published, level_id').order('level_id, position');

    console.log("=== LEVELS ===");
    levels?.forEach(l => console.log(`[${l.id}] ${l.code}: ${l.label}`));

    console.log("\n=== CHAPTERS ===");
    chapters?.forEach(c => console.log(`[${c.id}] ${c.code}: ${c.title} (Published: ${c.published}) - LevelID: ${c.level_id}`));
}

checkDatabase();
