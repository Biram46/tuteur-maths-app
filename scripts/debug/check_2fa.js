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

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing DB credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking last 2FA session...");
    const { data, error } = await supabase
        .from('admin_2fa_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
    } else if (data && data.length > 0) {
        const session = data[0];
        console.log("========================================");
        console.log("LAST 2FA CODE FOUND IN DB:");
        console.log("Code: " + session.code);
        console.log("Created At: " + session.created_at);
        console.log("Verified: " + session.verified);
        console.log("========================================");
    } else {
        console.log("No 2FA sessions found.");
    }
}

check();
