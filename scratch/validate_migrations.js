import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(envUrl, envKey);

async function checkSchema() {
  console.log('Querying database leads schema...');
  const { data, error } = await supabase.from('leads').select('*').limit(1);

  if (error) {
    console.error('Error fetching leads:', error.message);
    return;
  }

  const sampleLead = data[0] || {};
  const currentColumns = Object.keys(sampleLead);
  
  const requiredColumns = [
    'version',
    'enquiry_date',
    'objections_logged',
    'last_feedback',
    'feedback_sentiment'
  ];

  console.log('\n--- SCHEMA CHECK REPORT ---');
  let missingCount = 0;
  for (const col of requiredColumns) {
    if (currentColumns.includes(col)) {
      console.log(`✅ Column "${col}" is present.`);
    } else {
      console.log(`❌ Column "${col}" is MISSING!`);
      missingCount++;
    }
  }

  if (missingCount > 0) {
    console.log('\n⚠️ ACTION REQUIRED:');
    console.log('Please copy and execute the SQL script in "supabase/migration_v6.sql" in your Supabase SQL Editor to add the missing columns.');
  } else {
    console.log('\n🎉 ALL COLUMNS ARE PRESENT AND CORRECT!');
  }
}

checkSchema();
