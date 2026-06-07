import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const process = { env: { VITE_SUPABASE_URL: envUrl, VITE_SUPABASE_ANON_KEY: envKey } };

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
  console.log('Checking Supabase profiles table...');
  const { data, error } = await supabase.from('profiles').select('*');
  
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log(`Found ${data.length} profile(s):`);
    console.log(JSON.stringify(data, null, 2));
    if (data.length > 0) {
      console.log('\n✅ SUCCESS: Profiles are present in the database!');
    } else {
      console.log('\n❌ Profiles table is still empty. The user hasn\'t successfully signed in yet.');
    }
  }
}

checkProfiles();
