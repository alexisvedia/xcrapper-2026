// Quick script to verify the prompt in Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env vars
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'app_config')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  const prompt = data.value.aiSystemPrompt;

  console.log('📊 Prompt in Supabase:');
  console.log(`   Length: ${prompt.length} chars`);
  console.log(`   Contains "OFF-TOPIC CONTENT": ${prompt.includes('OFF-TOPIC CONTENT') ? '✅ YES' : '❌ NO'}`);
  console.log(`   Contains "VAGUE/GENERIC TWEETS": ${prompt.includes('VAGUE/GENERIC TWEETS') ? '✅ YES' : '❌ NO'}`);
  console.log(`   Contains "STYLE GUIDE": ${prompt.includes('STYLE GUIDE') ? '✅ YES' : '❌ NO'}`);
  console.log(`   Contains "Latin American Spanish": ${prompt.includes('Latin American Spanish') ? '✅ YES' : '❌ NO'}`);
  console.log(`   In English: ${prompt.startsWith('You are a tech content creator') ? '✅ YES' : '❌ NO'}`);

  console.log('\n📝 First 300 chars:');
  console.log(prompt.substring(0, 300) + '...');
}

main();
