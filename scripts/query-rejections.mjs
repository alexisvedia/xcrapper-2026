// Script to query rejected tweets from Supabase
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
process.env = { ...process.env, ...envVars };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching rejected tweets...\n');

  const { data, error } = await supabase
    .from('scraped_tweets')
    .select('author_username, original_content, rejection_reason, relevance_score, scraped_at')
    .eq('status', 'rejected')
    .not('rejection_reason', 'is', null)
    .order('scraped_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No rejected tweets found with reasons.');
    return;
  }

  console.log(`Found ${data.length} rejected tweets with reasons:\n`);
  console.log('='.repeat(80));

  // Group by rejection reason
  const byReason = {};

  for (const tweet of data) {
    const reason = tweet.rejection_reason || 'Unknown';
    if (!byReason[reason]) {
      byReason[reason] = [];
    }
    byReason[reason].push(tweet);
  }

  // Print grouped results
  for (const [reason, tweets] of Object.entries(byReason)) {
    console.log(`\n📋 RAZÓN: ${reason}`);
    console.log(`   (${tweets.length} tweets)`);
    console.log('-'.repeat(80));

    for (const tweet of tweets.slice(0, 5)) { // Show max 5 per reason
      console.log(`\n   @${tweet.author_username} (Score: ${tweet.relevance_score})`);
      const content = tweet.original_content.substring(0, 200);
      console.log(`   "${content}${tweet.original_content.length > 200 ? '...' : ''}"`);
    }

    if (tweets.length > 5) {
      console.log(`\n   ... y ${tweets.length - 5} más con esta razón`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN DE RAZONES:');
  for (const [reason, tweets] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${tweets.length}x - ${reason}`);
  }
}

main().catch(console.error);
