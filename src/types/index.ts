export type TweetStatus = 'pending' | 'approved' | 'rejected' | 'published';

export interface TweetMedia {
  type: 'PHOTO' | 'VIDEO' | 'GIF';
  url: string;
  thumbnailUrl?: string;
}

export interface ScrapedTweet {
  id: string;
  tweetId: string;
  authorUsername: string;
  authorName: string;
  authorAvatar?: string;
  originalContent: string;
  processedContent: string;
  translation?: string;
  originalUrl: string;
  relevanceScore: number;
  aiSummary?: string;
  aiModel?: string;
  media?: TweetMedia[];
  scrapedAt: Date;
  status: TweetStatus;
  rejectionReason?: string;
  approvalReason?: string; // Why a rejected tweet was approved (for prompt improvement)
  isBreakingNews?: boolean;
}

export interface QueueItem {
  id: string;
  scrapedTweetId: string;
  tweet: ScrapedTweet;
  customText: string;
  position: number;
  scheduledAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
}

// Modelos disponibles
export type AIModel =
  // Groq (gratuitos)
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'gemma2-9b-it'
  | 'mixtral-8x7b-32768'
  // Gemini
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  // OpenRouter (gratuitos)
  | 'google/gemma-2-9b-it:free'
  | 'meta-llama/llama-3.2-3b-instruct:free'
  | 'qwen/qwen-2-7b-instruct:free'
  | 'microsoft/phi-3-mini-128k-instruct:free'
  | 'mistralai/mistral-7b-instruct:free';

export type AIProvider = 'groq' | 'gemini' | 'openrouter';

export const AI_MODELS: { id: AIModel; name: string; description: string; provider: AIProvider }[] = [
  // Groq models
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Mejor calidad, más lento', provider: 'groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Rápido, buena calidad', provider: 'groq' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google vía Groq', provider: 'groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Mistral, contexto largo', provider: 'groq' },
  // Gemini models
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Último modelo, experimental', provider: 'gemini' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido y eficiente', provider: 'gemini' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Mayor capacidad', provider: 'gemini' },
  // OpenRouter models (free)
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', description: 'Google, gratuito', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B', description: 'Meta, rápido', provider: 'openrouter' },
  { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B', description: 'Alibaba, gratuito', provider: 'openrouter' },
  { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini', description: 'Microsoft, 128k contexto', provider: 'openrouter' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', description: 'Mistral AI, gratuito', provider: 'openrouter' },
];

export interface AppConfig {
  scrapeIntervalHours: number;
  publishIntervalMinutes: number;
  tweetsPerScrape: number;
  maxTweetAgeDays: number;
  autoDeleteAfterDays: number;
  checkSimilarContent: boolean;
  keywords: string[];
  minRelevanceScore: number;
  targetLanguage: string;
  autoPublishEnabled: boolean;
  autoPublishMinScore: number;
  autoApproveEnabled: boolean; // Auto-approve tweets with score >= minRelevanceScore
  nextPublishTime: string | null; // ISO string for Supabase sync
  aiSystemPrompt: string;
  rejectedPatterns: string[];
  aiModel: AIModel;
  // Runtime state (persisted)
  scrapingEnabled: boolean;
}

export type ViewType = 'inbox' | 'queue' | 'published' | 'config' | 'papers';

export type Theme = 'dark' | 'light';

export interface Paper {
  id: string;
  title: string;
  titleEs: string;
  abstract: string;
  abstractEs: string;
  authors: string[];
  institution?: string;
  arxivId?: string;
  upvotes: number;
  thumbnail?: string;
  publishedAt: Date;
  fetchedAt: Date;
  url: string;
  // Hook for home view (simple description)
  hook?: string;
  // AI-generated article for divulgación
  article?: string;
  articleLoading?: boolean;
}
