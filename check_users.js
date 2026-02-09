
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing!');
    process.exit(1);
}

const supabase = createClient(url, key, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkUsers() {
    console.log('Checking auth users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error.message);
    } else {
        console.log(`Total users in auth.users: ${users.length}`);
        users.forEach(u => {
            console.log(`- ${u.email} (${u.id}) - Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
        });
    }

    console.log('\nChecking profiles table...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) {
        console.error('Error listing profiles:', pError.message);
    } else {
        console.log(`Total profiles in public.profiles: ${profiles.length}`);
    }
}

checkUsers();
