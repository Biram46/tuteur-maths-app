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
    console.log("--- LEVELS ---");
    const { data: levels, error: lErr } = await supabase.from('levels').select('*').order('position');
    if (lErr) console.error(lErr);
    else console.log(JSON.stringify(levels, null, 2));

    console.log("\n--- CHAPTERS ---");
    const { data: chapters, error: cErr } = await supabase.from('chapters').select('*, levels(label)').order('level_id, position');
    if (cErr) console.error(cErr);
    else console.log(JSON.stringify(chapters, null, 2));
}

checkDatabase();
