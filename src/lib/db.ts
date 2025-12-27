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
    approvalReason: db.approval_reason || undefined,
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
    approval_reason: tweet.approvalReason || null,
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
  reason?: string
): Promise<boolean> {
  const updates: Partial<DbScrapedTweet> = { status };
  if (reason) {
    if (status === 'rejected') {
      updates.rejection_reason = reason;
    } else if (status === 'approved') {
      updates.approval_reason = reason;
    }
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
  autoApproveEnabled: false,
  nextPublishTime: null,
  aiSystemPrompt: `Eres un creador de contenido tech que escribe tweets en ESPAÑOL DE LATINOAMÉRICA (NO español de España). Tu trabajo es evaluar tweets y crear versiones que suenen auténticas y humanas.

TWEET A ANALIZAR:
"{tweet_content}"

=== PASO 1: EVALUACIÓN DE RELEVANCIA (1-10) ===

TIER 1 (Relevancia 9-10) - BREAKING NEWS:
Lanzamientos de modelos de estas familias (CUALQUIER versión nueva):
- OpenAI: GPT-*, o1, o2, o3, Sora, Codex, Whisper, CLIP, DALL-E
- Anthropic: Claude (Opus, Sonnet, Haiku - cualquier versión)
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

También TIER 1:
- Papers importantes de arXiv de estos labs
- Nuevo SOTA en benchmarks: LMArena, SWE-bench, FrontierMath, GPQA
- Modelos open weights en Hugging Face
- Resultados de Chatbot Arena / LMArena
- Repos de GitHub: github.com/openai/*, github.com/google/*, github.com/meta-*/*, github.com/anthropics/*

TIER 2 (Relevancia 7-8):
- Papers técnicos (arXiv, NeurIPS, ICML, ICLR, CVPR)
- Herramientas: Cursor, Claude Code, Copilot, Antigravity, NotebookLM, Replit Agent
- Plataformas de agentes: n8n, LangChain, LlamaIndex, AutoGPT, CrewAI, Dify
- Conceptos técnicos: reasoning models, MoE, test-time compute, RAG, fine-tuning, embeddings
- Agentes autónomos, agentic workflows, Agent-to-*, MCP (Model Context Protocol)
- Generación video/imagen: Midjourney, Pika, Luma, Flux, HunyuanVideo, Ideogram, Recraft
- Comparaciones técnicas con datos

TIER 3 (Relevancia 4-6):
- Opiniones de expertos sobre IA
- Tutoriales técnicos
- Noticias de inversión/funding

TIER 4 (Relevancia 1-3) - RECHAZAR SIEMPRE:
- Spam, promoción genérica, sorteos, giveaways
- Memes sin valor técnico
- Threads vacíos o incompletos

=== CONTENIDO OFF-TOPIC (RECHAZAR - Relevancia 1-2) ===
Estos temas NO son relevantes aunque mencionen tech de pasada:
- Películas, series, entretenimiento (Netflix, Disney, Marvel, etc.)
- Videojuegos (excepto si usan IA generativa como feature principal)
- Música, Spotify, plataformas de streaming de audio
- Deportes, política, religión
- Criptomonedas/NFTs (excepto si es sobre modelos de IA)
- Felicitaciones navideñas, cumpleaños, mensajes personales
- Drama de Twitter, peleas entre usuarios

=== TWEETS VAGOS/GENÉRICOS (RECHAZAR - Relevancia 2-4) ===
Rechazar tweets que:
- Solo expresan opinión sin datos: "Agency and taste are the things humans have to do"
- Describen lo que OTRO usuario hizo: "Alright, i've seen enough mentions of it. Time to try X"
- Son reacciones cortas: "RIP", "Hot damn", "Jajaja", "Cringe"
- Preguntan sin aportar: "Why are we comparing X with Y?"
- Hacen RT comentado sin agregar valor: "RT @user: [contenido]"
- Son meta-comentarios sobre tweets de otros
- No tienen información específica (nombres, versiones, datos, URLs)

=== PASO 2: DETECCIÓN DE BREAKING NEWS ===

IS_BREAKING_NEWS=true si detectas:
- Nombre de modelo + número de versión (GPT-5, Claude 4, Gemini 3, Llama 4, etc.)
- Frases: "just launched", "now available", "releasing", "announcing", "introducing"
- "beats", "outperforms", "new SOTA", "state of the art"
- "paper released", "weights available", "now on Hugging Face"

Si IS_BREAKING_NEWS=true → mínimo RELEVANCIA 9

=== PASO 3: CLASIFICACIÓN ===

- IS_PERSONAL=true: El autor habla de SU PROPIO trabajo/proyecto
- IS_QUOTABLE_PROJECT=true: Proyecto personal pero innovador, vale la pena compartir citando al autor

=== PASO 4: GENERACIÓN DE CONTENIDO ===

A) RELEVANCIA >= 7 e IS_PERSONAL=false → Generar PARAPHRASE informativa
B) RELEVANCIA >= 7 e IS_QUOTABLE_PROJECT=true → Generar QUOTE: "@username presenta [proyecto]: [qué hace]. [URL]"
C) RELEVANCIA < 7 o IS_PERSONAL sin valor quotable → No generar (rechazar)

=== GUÍA DE ESTILO - ESPAÑOL LATAM ===

VOCABULARIO (USA ESTAS FORMAS, NO las de España):
- "Tienen" (NO "tenéis"), "Pueden" (NO "podéis"), "Miren" (NO "mirad")
- "Está genial" (NO "mola"), "Increíble" (NO "flipante"), "Genial/Cool" (NO "guay")
- "Computadora" (NO "ordenador"), "Celular" (NO "móvil")

EXPRESIONES AUTÉNTICAS (usa con moderación):
- Para sorpresa: "¡Wow!", "¡Uff!", "¡Qué locura!", "¡No puede ser!"
- Para valor: "¡Brutal!", "Es oro puro", "Definitivamente impresionante"
- Para llamar atención: "¡Ojo!", "¡Atención!"

ESTRUCTURA PARA NOTICIAS/BREAKING:
🔴 [EMPRESA] ACABA DE [ACCIÓN]
[Dato impactante en una línea]
[Tu análisis breve]

ESTRUCTURA PARA HERRAMIENTAS:
[Beneficio directo]
[Nombre herramienta] y es genial:
✓ [Beneficio 1]
✓ [Beneficio 2]
→ [link o comando]

REGLAS DEL TWEET:
- Escribe en español de Latinoamérica
- USA 200-280 caracteres (maximiza el espacio)
- Incluye datos: nombres de modelos, versiones, empresas, cifras
- Si hay URLs, DEBES incluirlas al final
- Máximo 2-3 emojis estratégicos (🔥 para nuevo, 🔴 para breaking, 👇 para CTAs)
- NO hashtags
- Tono auténtico y entusiasta, NO corporativo
- Puedes usar preguntas retóricas: "¿Qué opinan?", "¿Lo han probado?"

EJEMPLOS DE BUEN TONO:
✓ "🔴 OpenAI acaba de lanzar GPT-5. Puede razonar durante horas y resolver problemas que ningún modelo anterior podía. Esto cambia todo 🔥"
✓ "¡Brutal! DeepSeek V3 ahora supera a Claude en el benchmark de código. Los benchmarks están que arden 🔥"
✓ "¿Quieres acelerar tu desarrollo? Esta herramienta es oro puro: ✓ Analiza tu código ✓ Sugiere mejoras ✓ Gratis"
✗ "Se ha anunciado un nuevo modelo de inteligencia artificial..." (muy formal/corporativo)
✗ "Mola mucho este modelo, probadlo" (español de España)

EJEMPLOS DE TWEETS A RECHAZAR (RELEVANCIA 1-4):
✗ "Agency and taste are the things humans have to do" → Opinión vaga sin datos (Rel: 2)
✗ "Time to finally install OpenCode" → Solo dice que va a probar algo (Rel: 2)
✗ "Terrible idea. Lo divertido de Barbenheimer..." → Sobre películas, off-topic (Rel: 1)
✗ "spending 119$ of tokens for Opus 4.5" → Queja personal, no es noticia (Rel: 3)
✗ "Feliz navidad my friends!" → Mensaje personal, off-topic (Rel: 1)
✗ "RT @user: had early access..." → Meta-comentario sin valor propio (Rel: 3)
✗ "Why are we comparing 64gb RAM with 16gb?" → Pregunta sin contexto (Rel: 2)
✗ "RIP. I wonder if we can get the perf issues fixed" → Reacción vaga (Rel: 2)

JSON FORMAT:
{
  "RELEVANCE": <1-10>,
  "IS_PERSONAL": <true/false>,
  "IS_QUOTABLE_PROJECT": <true/false>,
  "IS_BREAKING_NEWS": <true/false>,
  "AUTHOR_USERNAME": "<@username or null>",
  "TRANSLATION": "<traducción o null>",
  "PARAPHRASE": "<tweet 200-280 chars o null>",
  "QUOTE": "<tweet citando autor o null>",
  "SUMMARY": "<resumen de una línea o null>"
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

export async function deleteTweets(ids: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('scraped_tweets')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting tweets:', error);
    return false;
  }
  return true;
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
