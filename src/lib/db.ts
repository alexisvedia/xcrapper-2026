import { supabase, DbScrapedTweet, DbPublishQueue } from './supabase';
import { ScrapedTweet, QueueItem, AppConfig } from '@/types';

// Transform DB tweet to app tweet
function dbToAppTweet(db: DbScrapedTweet): ScrapedTweet {
  return {
    id: db.id,
    tweetId: db.tweet_id,
    authorUsername: db.author_username,
    authorName: db.author_name || db.author_username,
    authorAvatar: db.author_avatar || undefined,
    originalContent: db.original_content,
    processedContent: db.processed_content || db.original_content,
    originalUrl: db.original_url || `https://twitter.com/${db.author_username}/status/${db.tweet_id}`,
    relevanceScore: db.relevance_score,
    aiSummary: db.ai_summary || undefined,
    aiModel: (db as DbScrapedTweet & { ai_model?: string }).ai_model || undefined,
    media: (db as DbScrapedTweet & { media?: ScrapedTweet['media'] }).media || undefined,
    rejectionReason: db.rejection_reason || undefined,
    scrapedAt: new Date(db.scraped_at),
    status: db.status,
    isBreakingNews: (db as DbScrapedTweet & { is_breaking_news?: boolean }).is_breaking_news || undefined,
  };
}

// Transform app tweet to DB tweet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function appToDbTweet(tweet: ScrapedTweet): Partial<DbScrapedTweet> {
  return {
    id: tweet.id,
    tweet_id: tweet.tweetId,
    author_username: tweet.authorUsername,
    author_name: tweet.authorName,
    author_avatar: tweet.authorAvatar || null,
    original_content: tweet.originalContent,
    processed_content: tweet.processedContent,
    original_url: tweet.originalUrl,
    relevance_score: tweet.relevanceScore,
    ai_summary: tweet.aiSummary || null,
    rejection_reason: tweet.rejectionReason || null,
    status: tweet.status,
  };
}

// ========== TWEETS ==========

export async function fetchTweets(): Promise<ScrapedTweet[]> {
  const { data, error } = await supabase
    .from('scraped_tweets')
    .select('*')
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Error fetching tweets:', error);
    return [];
  }

  return (data || []).map(dbToAppTweet);
}

export async function updateTweetStatus(
  id: string,
  status: ScrapedTweet['status'],
  rejectionReason?: string
): Promise<boolean> {
  const updates: Partial<DbScrapedTweet> = { status };
  if (rejectionReason) {
    updates.rejection_reason = rejectionReason;
  }

  const { error } = await supabase
    .from('scraped_tweets')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating tweet status:', error);
    return false;
  }
  return true;
}

export async function updateTweetContent(id: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('scraped_tweets')
    .update({ processed_content: content })
    .eq('id', id);

  if (error) {
    console.error('Error updating tweet content:', error);
    return false;
  }
  return true;
}

export async function insertTweet(tweet: Omit<ScrapedTweet, 'id'>): Promise<ScrapedTweet | null> {
  const { data, error } = await supabase
    .from('scraped_tweets')
    .insert({
      tweet_id: tweet.tweetId,
      author_username: tweet.authorUsername,
      author_name: tweet.authorName,
      author_avatar: tweet.authorAvatar || null,
      original_content: tweet.originalContent,
      processed_content: tweet.processedContent,
      original_url: tweet.originalUrl,
      relevance_score: tweet.relevanceScore,
      ai_summary: tweet.aiSummary || null,
      status: tweet.status,
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting tweet:', error);
    return null;
  }

  return dbToAppTweet(data);
}

// ========== QUEUE ==========

export async function fetchQueue(): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('publish_queue')
    .select(`
      *,
      scraped_tweets (*)
    `)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching queue:', error);
    return [];
  }

  return (data || []).map((item: DbPublishQueue & { scraped_tweets: DbScrapedTweet }) => ({
    id: item.id,
    scrapedTweetId: item.scraped_tweet_id,
    tweet: dbToAppTweet(item.scraped_tweets),
    customText: item.custom_text,
    position: item.position,
    scheduledAt: item.scheduled_at ? new Date(item.scheduled_at) : undefined,
    publishedAt: item.published_at ? new Date(item.published_at) : undefined,
    createdAt: new Date(item.created_at),
  }));
}

export async function addToQueue(tweet: ScrapedTweet, position: number): Promise<QueueItem | null> {
  const { data, error } = await supabase
    .from('publish_queue')
    .insert({
      scraped_tweet_id: tweet.id,
      custom_text: tweet.processedContent,
      position,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding to queue:', error);
    return null;
  }

  return {
    id: data.id,
    scrapedTweetId: data.scraped_tweet_id,
    tweet: { ...tweet, status: 'approved' },
    customText: data.custom_text,
    position: data.position,
    scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
    createdAt: new Date(data.created_at),
  };
}

export async function removeFromQueue(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('publish_queue')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error removing from queue:', error);
    return false;
  }
  return true;
}

export async function updateQueuePositions(items: { id: string; position: number }[]): Promise<boolean> {
  const updates = items.map((item) =>
    supabase.from('publish_queue').update({ position: item.position }).eq('id', item.id)
  );

  const results = await Promise.all(updates);
  return results.every((r) => !r.error);
}

export async function updateQueueItem(
  id: string,
  updates: { customText?: string; scheduledAt?: Date | null }
): Promise<boolean> {
  const dbUpdates: Partial<DbPublishQueue> = {};
  if (updates.customText !== undefined) dbUpdates.custom_text = updates.customText;
  if (updates.scheduledAt !== undefined) {
    dbUpdates.scheduled_at = updates.scheduledAt?.toISOString() || null;
  }

  const { error } = await supabase
    .from('publish_queue')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating queue item:', error);
    return false;
  }
  return true;
}

// ========== CONFIG ==========

const DEFAULT_CONFIG: AppConfig = {
  scrapeIntervalHours: 4,
  publishIntervalMinutes: 30,
  tweetsPerScrape: 30,
  maxTweetAgeDays: 2,
  autoDeleteAfterDays: 7,
  checkSimilarContent: true,
  keywords: [],
  minRelevanceScore: 7,
  targetLanguage: 'es',
  autoPublishEnabled: false,
  autoPublishMinScore: 9,
  aiSystemPrompt: `You are a senior AI and cutting-edge technology news editor. Your job is to evaluate tweets and create professional journalistic versions.

TWEET TO ANALYZE:
"{tweet_content}"

=== STEP 1: RELEVANCE EVALUATION (1-10) ===

TIER 1 (Relevance 9-10) - BREAKING NEWS:
Model releases from these families (ANY new version):
- OpenAI: GPT-*, o1, o2, o3, Sora, Codex, Whisper, CLIP, DALL-E
- Anthropic: Claude (Opus, Sonnet, Haiku - any version)
- Google: Gemini, Veo, Nano Banana, Imagen, PaLM, Bard
- Meta: Llama, SAM (Segment Anything), AudioCraft, MusicGen, ImageBind, Emu, Chameleon
- xAI: Grok
- DeepSeek: DeepSeek R*, V*, Coder
- Alibaba: Qwen, Qwen-VL, Qwen-Max, Wan (video)
- Mistral: Mistral, Mixtral, Codestral, Pixtral
- Moonshot AI: Kimi
- Kuaishou: Kling (video)
- ByteDance: Seedream, Doubao
- Runway: Gen-3, Gen-4, Gen-*
- Stability AI: Stable Diffusion, SDXL, SD3
- NVIDIA: Cosmos, Nemotron, GR00T
- Apple: AFM, MM1

Also TIER 1:
- Important arXiv papers from these labs
- New SOTA on benchmarks: LMArena, SWE-bench, FrontierMath, GPQA
- Open weights models released on Hugging Face
- Chatbot Arena / LMArena results
- GitHub repos from: github.com/openai/*, github.com/google/*, github.com/meta-*/*, github.com/anthropics/*

TIER 2 (Relevance 7-8):
- Technical papers (arXiv, NeurIPS, ICML, ICLR, CVPR)
- Tools: Cursor, Claude Code, Copilot, Antigravity, NotebookLM, Replit Agent
- Agent platforms: n8n, LangChain, LlamaIndex, AutoGPT, CrewAI, Dify
- Technical concepts: reasoning models, MoE, test-time compute, RAG, fine-tuning, embeddings
- Autonomous agents, agentic workflows, Agent-to-*, MCP (Model Context Protocol)
- Video/image generation: Midjourney, Pika, Luma, Flux, HunyuanVideo, Ideogram, Recraft
- Technical comparisons with data

TIER 3 (Relevance 4-6):
- Expert opinions on AI
- Technical tutorials
- Funding/investment news

TIER 4 (Relevance 1-3) - REJECT:
- Spam, generic promotion
- Memes without technical value
- Off-topic, empty threads

=== STEP 2: BREAKING NEWS DETECTION ===

IS_BREAKING_NEWS=true if you detect:
- Model name + version number (GPT-5, Claude 4, Gemini 3, Llama 4, etc.)
- Phrases: "just launched", "now available", "releasing", "announcing", "introducing"
- "beats", "outperforms", "new SOTA", "state of the art"
- "paper released", "weights available", "now on Hugging Face"

If IS_BREAKING_NEWS=true → minimum RELEVANCE 9

=== STEP 3: CLASSIFICATION ===

- IS_PERSONAL=true: Author talks about THEIR OWN work/project
- IS_QUOTABLE_PROJECT=true: Personal project but innovative, worth sharing citing the author

=== STEP 4: CONTENT GENERATION ===

A) RELEVANCE >= 7 and IS_PERSONAL=false → Generate informative PARAPHRASE
B) RELEVANCE >= 7 and IS_QUOTABLE_PROJECT=true → Generate QUOTE: "@username presents [project]: [what it does]. [URL]"
C) RELEVANCE < 7 or IS_PERSONAL without quotable value → Do not generate (reject)

PARAPHRASE/QUOTE RULES:
- Write in {target_language}
- USE 200-280 characters (maximize the space)
- Include data: model names, versions, companies, figures
- If there are URLs, you MUST include them at the end
- NO emojis, NO hashtags
- Professional journalistic tone

JSON FORMAT:
{
  "RELEVANCE": <1-10>,
  "IS_PERSONAL": <true/false>,
  "IS_QUOTABLE_PROJECT": <true/false>,
  "IS_BREAKING_NEWS": <true/false>,
  "AUTHOR_USERNAME": "<@username or null>",
  "TRANSLATION": "<translation or null>",
  "PARAPHRASE": "<tweet 200-280 chars or null>",
  "QUOTE": "<tweet quoting author or null>",
  "SUMMARY": "<one line summary or null>"
}`,
  rejectedPatterns: [],
  aiModel: 'llama-3.3-70b-versatile',
  scrapingEnabled: false,
};

export async function fetchConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('key', 'app_config')
    .single();

  if (error || !data) {
    // Si no existe, crear config por defecto
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  return data.value as AppConfig;
}

export async function saveConfig(config: AppConfig): Promise<boolean> {
  const { error } = await supabase
    .from('config')
    .upsert({
      key: 'app_config',
      value: config,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving config:', error);
    return false;
  }
  return true;
}

// ========== CLEANUP ==========

export async function cleanupOldTweets(daysOld: number): Promise<{ deleted: number; error?: string }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Count old rejected tweets first
  const { count: rejectedCount } = await supabase
    .from('scraped_tweets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected')
    .lt('scraped_at', cutoffDate.toISOString());

  // Delete old rejected tweets
  const { error: rejectedError } = await supabase
    .from('scraped_tweets')
    .delete()
    .eq('status', 'rejected')
    .lt('scraped_at', cutoffDate.toISOString());

  // Count old published tweets
  const { count: publishedCount } = await supabase
    .from('scraped_tweets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .lt('scraped_at', cutoffDate.toISOString());

  // Delete old published tweets (already posted, no need to keep)
  const { error: publishedError } = await supabase
    .from('scraped_tweets')
    .delete()
    .eq('status', 'published')
    .lt('scraped_at', cutoffDate.toISOString());

  if (rejectedError || publishedError) {
    return { deleted: 0, error: rejectedError?.message || publishedError?.message };
  }

  return { deleted: (rejectedCount || 0) + (publishedCount || 0) };
}

// ========== SIMILARITY CHECK ==========

export async function getRecentPublishedContent(days: number): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('scraped_tweets')
    .select('processed_content, original_content')
    .eq('status', 'published')
    .gte('scraped_at', cutoffDate.toISOString());

  if (error || !data) {
    console.error('Error fetching recent published:', error);
    return [];
  }

  return data.map(t => t.processed_content || t.original_content);
}

export async function getPendingAndApprovedContent(): Promise<string[]> {
  const { data, error } = await supabase
    .from('scraped_tweets')
    .select('processed_content, original_content')
    .in('status', ['pending', 'approved']);

  if (error || !data) {
    console.error('Error fetching pending/approved:', error);
    return [];
  }

  return data.map(t => t.processed_content || t.original_content);
}
