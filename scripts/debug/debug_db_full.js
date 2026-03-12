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
    console.log("=== LEVELS ===");
    const { data: levels, error: lErr } = await supabase.from('levels').select('*');
    if (lErr) console.error(lErr);
    else levels.forEach(l => console.log(`ID: ${l.id} | Code: ${l.code} | Label: ${l.label} | Pos: ${l.position}`));

    console.log("\n=== CHAPTERS ===");
    const { data: chapters, error: cErr } = await supabase.from('chapters').select('*');
    if (cErr) console.error(cErr);
    else chapters.forEach(c => console.log(`ID: ${c.id} | Code: ${c.code} | Title: ${c.title} | Published: ${c.published} | LevelID: ${c.level_id}`));
}

checkDatabase();
