import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(envUrl, envKey);

async function checkLeadsSchema() {
  console.log('Querying leads table schema details...');
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching lead:', error);
  } else if (data.length === 0) {
    console.log('No leads found in database.');
  } else {
    const lead = data[0];
    console.log('Sample Lead Keys:', Object.keys(lead));
    if ('version' in lead) {
      console.log(`\n✅ SUCCESS: "version" column is present in database leads table! Current sample version: ${lead.version}`);
    } else {
      console.error('\n❌ ERROR: "version" column is MISSING from database leads table!');
    }
  }
}

checkLeadsSchema();
