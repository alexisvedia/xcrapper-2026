// Script to update aiSystemPrompt in Supabase from the default in db.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env vars manually
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extract the prompt from db.ts
function extractPromptFromDbTs() {
  const dbContent = readFileSync('src/lib/db.ts', 'utf-8');

  // Find aiSystemPrompt: `...`
  const match = dbContent.match(/aiSystemPrompt:\s*`([\s\S]*?)`\s*,\s*rejectedPatterns/);

  if (!match) {
    console.error('Could not find aiSystemPrompt in db.ts');
    process.exit(1);
  }

  return match[1];
}

async function main() {
  console.log('📖 Reading new prompt from src/lib/db.ts...');
  const newPrompt = extractPromptFromDbTs();
  console.log(`   Prompt length: ${newPrompt.length} characters\n`);

  console.log('📥 Fetching current config from Supabase...');
  const { data: currentConfig, error: fetchError } = await supabase
    .from('config')
    .select('*')
    .eq('key', 'app_config')
    .single();

  if (fetchError) {
    console.error('Error fetching config:', fetchError);
    process.exit(1);
  }

  if (!currentConfig) {
    console.log('   No config found in Supabase. The app will use DEFAULT_CONFIG on next load.');
    return;
  }

  console.log('   Found existing config\n');

  // Show diff summary
  const oldPrompt = currentConfig.value.aiSystemPrompt || '';
  console.log('📊 Comparison:');
  console.log(`   Old prompt: ${oldPrompt.length} chars`);
  console.log(`   New prompt: ${newPrompt.length} chars`);
  console.log(`   Difference: ${newPrompt.length - oldPrompt.length > 0 ? '+' : ''}${newPrompt.length - oldPrompt.length} chars\n`);

  // Update the config
  const updatedValue = {
    ...currentConfig.value,
    aiSystemPrompt: newPrompt
  };

  console.log('📤 Updating config in Supabase...');
  const { error: updateError } = await supabase
    .from('config')
    .update({
      value: updatedValue,
      updated_at: new Date().toISOString()
    })
    .eq('key', 'app_config');

  if (updateError) {
    console.error('Error updating config:', updateError);
    process.exit(1);
  }

  console.log('✅ Prompt updated successfully!\n');

  // Show first 500 chars of new prompt
  console.log('📝 New prompt preview (first 500 chars):');
  console.log('-'.repeat(60));
  console.log(newPrompt.substring(0, 500) + '...');
  console.log('-'.repeat(60));
}

main().catch(console.error);
