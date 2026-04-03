
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Checking Supabase connection...');
console.log('URL:', url ? 'Defined' : 'UNDEFINED');
console.log('Key:', key ? 'Defined' : 'UNDEFINED');

if (!url || !key) {
    console.error('Missing Supabase environment variables!');
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Supabase Auth Error:', error.message);
    } else {
        console.log('Supabase Auth Connection: OK');
    }

    // Try to check if we can reach the health endpoint or similar if possible, 
    // or just a simple query to a public table if exists.
    const { count, error: dbError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (dbError) {
        console.warn('Database access check (profiles):', dbError.message);
    } else {
        console.log('Database Connection (profiles): OK, count:', count);
    }
}

test();
