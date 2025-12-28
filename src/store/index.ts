import { create } from 'zustand';
import { ScrapedTweet, QueueItem, AppConfig, ViewType, Theme, Paper } from '@/types';
import * as db from '@/lib/db';

// Scraping progress interface (used globally)
export interface ScrapeProgress {
  percent: number;
  current: number;
  total: number;
  message: string;
  author?: string;
  status?: string;
  isBreakingNews?: boolean;
  // New fields for better transparency
  requested?: number;      // How many tweets were requested
  fetched?: number;        // How many Twitter returned
  filteredByAge?: number;  // How many were filtered by age
  results?: {
    processed: number;
    approved: number;
    rejected: number;
    duplicates: number;
    skipped: number;
    similar: number;
    autoQueued: number;
    breakingNews: number;
    errors: number;
  };
}

const defaultConfig: AppConfig = {
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
  aiSystemPrompt: `You are a senior AI and cutting-edge technology news editor. Evaluate tweets and create professional journalistic versions.

=== CRITICAL RULES ===
1. NEVER INVENT information - use ONLY facts explicitly stated in the tweet
2. Do NOT add model names, versions, numbers, dates, or claims not in the original
3. If the tweet is vague, set PARAPHRASE = null and RELEVANCE < 7
4. NEVER DESCRIBE the tweet - generate NEWS or null, nothing else
5. Personal musings, opinions without tech substance = RELEVANCE 1-3, PARAPHRASE = null

WRONG vs CORRECT EXAMPLES:
- Tweet: "new model released" → WRONG: "GPT-5 released with 95% accuracy" / CORRECT: "New AI model announced"
- Tweet: "working on something cool" → RELEVANCE: 2, PARAPHRASE: null (vague, not news)
- Tweet: "our model beats GPT-4" → WRONG: "Model achieves 92% vs GPT-4's 85%" / CORRECT: "New model claims to outperform GPT-4"
- Tweet: "I have an idea I can't stop thinking about" → RELEVANCE: 1, PARAPHRASE: null (personal musing, not tech news)
- Tweet: "Not sure if I should build this" → RELEVANCE: 1, PARAPHRASE: null (NOT NEWS)
- NEVER do this: "A user shares an idea..." or "Someone thinks..." - this is DESCRIBING, not paraphrasing

=== TWEET TO ANALYZE ===
"{tweet_content}"

=== STEP 1: RELEVANCE SCORING (1-10) ===

TIER 1 (Score 9-10) - BREAKING NEWS:
Model releases from these families (ANY new version):
- OpenAI: GPT-*, o1, o2, o3, Sora, Codex, Whisper, CLIP, DALL-E
- Anthropic: Claude (Opus, Sonnet, Haiku - any version)
- Google: Gemini, Veo, Imagen, PaLM, Bard
- Meta: Llama, SAM, AudioCraft, MusicGen, ImageBind, Emu, Chameleon
- xAI: Grok
- DeepSeek: DeepSeek R*, V*, Coder
- Alibaba: Qwen, Qwen-VL, Qwen-Max, Wan
- Mistral: Mistral, Mixtral, Codestral, Pixtral
- ByteDance/Kuaishou: Kling, Seedream, Doubao
- Runway: Gen-3, Gen-4
- Stability AI: Stable Diffusion, SDXL, SD3
- NVIDIA: Cosmos, Nemotron, GR00T
- Apple: AFM, MM1

Also TIER 1:
- Important arXiv papers from major labs
- New SOTA: LMArena, SWE-bench, FrontierMath, GPQA, Chatbot Arena
- Open weights on Hugging Face from major labs

TIER 2 (Score 7-8):
- Technical papers (arXiv, NeurIPS, ICML, ICLR, CVPR)
- Dev tools: Cursor, Claude Code, Copilot, NotebookLM, Replit Agent
- Agent platforms: n8n, LangChain, LlamaIndex, AutoGPT, CrewAI, Dify
- Technical concepts: reasoning, MoE, test-time compute, RAG, fine-tuning
- MCP (Model Context Protocol), agentic workflows
- Video/image gen: Midjourney, Pika, Luma, Flux, HunyuanVideo, Ideogram

TIER 3 (Score 4-6):
- Expert opinions, tutorials, funding news

TIER 4 (Score 1-3) - REJECT:
- Spam, memes, off-topic, empty content

=== STEP 2: BREAKING NEWS DETECTION ===
IS_BREAKING_NEWS=true if:
- Model + version (GPT-5, Claude 4, Gemini 3, Llama 4...)
- Phrases: "just launched", "now available", "releasing", "announcing"
- "beats", "outperforms", "new SOTA", "state of the art"
- "paper released", "weights available", "now on Hugging Face"

If IS_BREAKING_NEWS=true → RELEVANCE must be >= 9

=== STEP 3: CLASSIFICATION ===
- IS_PERSONAL=true: Author talks about THEIR OWN work/project
- IS_QUOTABLE_PROJECT=true: Personal BUT innovative, worth sharing with credit

=== STEP 4: CONTENT GENERATION ===
A) RELEVANCE >= 7 and IS_PERSONAL=false → Generate PARAPHRASE
B) RELEVANCE >= 7 and IS_QUOTABLE_PROJECT=true → Generate QUOTE: "@user presents [project]: [description]. [URL]"
C) RELEVANCE < 7 → Set PARAPHRASE and QUOTE to null

RULES FOR PARAPHRASE/QUOTE:
- Write in {target_language} (MANDATORY)
- Use 200-280 characters (maximize space)
- Include ONLY data from original tweet
- Preserve URLs at the end
- NO emojis, NO hashtags
- Professional journalistic tone

=== JSON RESPONSE FORMAT ===
{
  "RELEVANCE": <1-10>,
  "IS_PERSONAL": <true/false>,
  "IS_QUOTABLE_PROJECT": <true/false>,
  "IS_BREAKING_NEWS": <true/false>,
  "AUTHOR_USERNAME": "<@username or null>",
  "TRANSLATION": "<literal translation or null>",
  "PARAPHRASE": "<news 200-280 chars or null>",
  "QUOTE": "<quote citing author or null>",
  "SUMMARY": "<one line summary or null>"
}`,
  rejectedPatterns: [],
  aiModel: 'llama-3.3-70b-versatile',
  scrapingEnabled: false,
};

interface AppState {
  // Loading state
  isLoading: boolean;
  isInitialized: boolean;
  initializeApp: () => Promise<void>;

  // View state
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Tweets
  tweets: ScrapedTweet[];
  setTweets: (tweets: ScrapedTweet[]) => void;
  refreshTweets: () => Promise<void>;
  approveTweet: (id: string, reason?: string) => Promise<void>;
  rejectTweet: (id: string, reason?: string) => Promise<void>;
  updateTweetContent: (id: string, content: string) => Promise<void>;
  deleteTweets: (ids: string[]) => Promise<void>;
  clearAllScrapedTweets: () => Promise<void>;

  // Queue
  queue: QueueItem[];
  setQueue: (queue: QueueItem[]) => void;
  refreshQueue: () => Promise<void>;
  addToQueue: (tweet: ScrapedTweet) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  reorderQueue: (activeId: string, overId: string) => Promise<void>;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;

  // Config
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;

  // System status
  isScrapingActive: boolean;
  setScrapingActive: (active: boolean) => void;
  lastScrapeTime: Date | null;
  setLastScrapeTime: (time: Date | null) => void;

  // Scraping progress (global state so it persists across tab changes)
  scrapeProgress: ScrapeProgress | null;
  setScrapeProgress: (progress: ScrapeProgress | null | ((prev: ScrapeProgress | null) => ScrapeProgress | null)) => void;
  scrapeAbortController: AbortController | null;
  setScrapeAbortController: (controller: AbortController | null) => void;
  scrapeLog: Array<{
    author: string;
    status: string;
    relevance?: number;
    originalContent?: string;
    processedContent?: string;
    rejectionReason?: string;
    errorMessage?: string;
  }>;
  setScrapeLog: (log: Array<{
    author: string;
    status: string;
    relevance?: number;
    originalContent?: string;
    processedContent?: string;
    rejectionReason?: string;
    errorMessage?: string;
  }>) => void;
  addToScrapeLog: (entry: {
    author: string;
    status: string;
    relevance?: number;
    originalContent?: string;
    processedContent?: string;
    rejectionReason?: string;
    errorMessage?: string;
  }) => void;
  clearScrapeLog: () => void;

  // Auto-publish state (global state so it persists across tab changes)
  isAutoPublishing: boolean;
  setIsAutoPublishing: (active: boolean) => void;
  nextPublishTime: Date | null;
  setNextPublishTime: (time: Date | null) => void;
  autoPublishCountdown: number;
  setAutoPublishCountdown: (seconds: number) => void;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Editing state
  editingTweetId: string | null;
  setEditingTweetId: (id: string | null) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Papers
  papers: Paper[];
  selectedPaper: Paper | null;
  papersLoading: boolean;
  papersDate: string; // YYYY-MM-DD format
  setPapers: (papers: Paper[]) => void;
  setSelectedPaper: (paper: Paper | null) => void;
  setPapersLoading: (loading: boolean) => void;
  setPapersDate: (date: string) => void;
  fetchPapers: (date?: string) => Promise<void>;
  generateArticle: (paperId: string) => Promise<void>;
}

// LocalStorage helpers for persistence (view only, auto-publish syncs via Supabase)
const STORAGE_KEYS = {
  currentView: 'xcrapper_currentView',
};

const getStoredView = (): ViewType => {
  if (typeof window === 'undefined') return 'inbox';
  const stored = localStorage.getItem(STORAGE_KEYS.currentView);
  if (stored && ['inbox', 'queue', 'published', 'config', 'papers'].includes(stored)) {
    return stored as ViewType;
  }
  return 'inbox';
};

// Parse nextPublishTime from config (synced via Supabase)
// Returns the date even if in the past - QueueView will handle expired timers
const parseNextPublishTime = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  const date = new Date(isoString);
  // Return the date if it's valid (QueueView handles expired timers)
  if (!isNaN(date.getTime())) {
    return date;
  }
  return null;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Loading state
  isLoading: true,
  isInitialized: false,

  initializeApp: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const [tweets, queue, config] = await Promise.all([
        db.fetchTweets(),
        db.fetchQueue(),
        db.fetchConfig(),
      ]);

      // Restore view from localStorage, auto-publish from Supabase config
      const storedView = getStoredView();
      const nextPublishTime = parseNextPublishTime(config.nextPublishTime);

      set({
        tweets,
        queue,
        config,
        isLoading: false,
        isInitialized: true,
        // Restore persisted state
        isScrapingActive: config.scrapingEnabled ?? false,
        // Restore auto-publish state from Supabase - QueueView handles expired timers
        isAutoPublishing: config.autoPublishEnabled,
        // Restore view from localStorage
        currentView: storedView,
        // Restore auto-publish time from Supabase config
        nextPublishTime,
      });
    } catch (error) {
      console.error('Error initializing app:', error);
      set({ isLoading: false, isInitialized: true });
      get().showToast('Error cargando datos', 'error');
    }
  },

  // View state
  currentView: 'inbox',
  setCurrentView: (view) => {
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.currentView, view);
    }
    set({ currentView: view });
  },

  // Tweets
  tweets: [],
  setTweets: (tweets) => set({ tweets }),

  refreshTweets: async () => {
    const tweets = await db.fetchTweets();
    set({ tweets });
  },

  approveTweet: async (id, reason) => {
    const tweet = get().tweets.find((t) => t.id === id);
    if (!tweet) return;

    // Optimistic update
    set((state) => ({
      tweets: state.tweets.map((t) =>
        t.id === id ? { ...t, status: 'approved' as const, approvalReason: reason } : t
      ),
    }));

    const success = await db.updateTweetStatus(id, 'approved', reason);
    if (success) {
      await get().addToQueue({ ...tweet, status: 'approved' });
      get().showToast('Tweet aprobado y añadido a la cola', 'success');
    } else {
      // Rollback
      set((state) => ({
        tweets: state.tweets.map((t) =>
          t.id === id ? { ...t, status: 'pending' as const } : t
        ),
      }));
      get().showToast('Error al aprobar tweet', 'error');
    }
  },

  rejectTweet: async (id, reason) => {
    // Optimistic update
    set((state) => ({
      tweets: state.tweets.map((t) =>
        t.id === id ? { ...t, status: 'rejected' as const, rejectionReason: reason } : t
      ),
    }));

    const success = await db.updateTweetStatus(id, 'rejected', reason);
    if (success) {
      get().showToast('Tweet rechazado', 'info');
    } else {
      // Rollback
      set((state) => ({
        tweets: state.tweets.map((t) =>
          t.id === id ? { ...t, status: 'pending' as const, rejectionReason: undefined } : t
        ),
      }));
      get().showToast('Error al rechazar tweet', 'error');
    }
  },

  updateTweetContent: async (id, content) => {
    const oldContent = get().tweets.find((t) => t.id === id)?.processedContent;

    // Optimistic update
    set((state) => ({
      tweets: state.tweets.map((t) =>
        t.id === id ? { ...t, processedContent: content } : t
      ),
    }));

    const success = await db.updateTweetContent(id, content);
    if (!success && oldContent) {
      // Rollback
      set((state) => ({
        tweets: state.tweets.map((t) =>
          t.id === id ? { ...t, processedContent: oldContent } : t
        ),
      }));
      get().showToast('Error al actualizar contenido', 'error');
    }
  },

  deleteTweets: async (ids) => {
    const oldTweets = get().tweets;

    // Optimistic update
    set((state) => ({
      tweets: state.tweets.filter((t) => !ids.includes(t.id)),
    }));

    const success = await db.deleteTweets(ids);
    if (success) {
      get().showToast(
        ids.length === 1 ? 'Tweet eliminado' : `${ids.length} tweets eliminados`,
        'success'
      );
    } else {
      // Rollback
      set({ tweets: oldTweets });
      get().showToast('Error al eliminar tweets', 'error');
    }
  },

  clearAllScrapedTweets: async () => {
    const tweets = get().tweets;
    const queue = get().queue;

    // Get all non-published tweets (pending, approved, AND rejected)
    const tweetsToClear = tweets.filter(t => t.status !== 'published');

    if (tweetsToClear.length === 0) {
      get().showToast('No hay tweets para limpiar', 'info');
      return;
    }

    const oldTweets = [...tweets];
    const oldQueue = [...queue];

    // Optimistic update - remove from UI (we'll delete from DB)
    set((state) => ({
      tweets: state.tweets.filter((t) => t.status === 'published'),
      // Also clear the queue
      queue: state.queue.filter((item) => {
        const tweet = tweetsToClear.find(t => t.id === item.scrapedTweetId);
        return !tweet;
      }),
    }));

    // Update all tweets to rejected status in DB
    let successCount = 0;
    for (const tweet of tweetsToClear) {
      const success = await db.updateTweetStatus(tweet.id, 'rejected', 'Limpiado manualmente');
      if (success) successCount++;
    }

    // Remove cleared tweets from queue in DB
    const clearedIds = tweetsToClear.map(t => t.id);
    const queueItemsToRemove = oldQueue.filter(item => clearedIds.includes(item.scrapedTweetId));
    for (const item of queueItemsToRemove) {
      await db.removeFromQueue(item.id);
    }

    if (successCount === tweetsToClear.length) {
      get().showToast(`${successCount} tweets limpiados`, 'success');
    } else if (successCount > 0) {
      get().showToast(`${successCount}/${tweetsToClear.length} tweets limpiados`, 'info');
    } else {
      // Rollback
      set({ tweets: oldTweets, queue: oldQueue });
      get().showToast('Error al limpiar tweets', 'error');
    }
  },

  // Queue
  queue: [],
  setQueue: (queue) => set({ queue }),

  refreshQueue: async () => {
    const queue = await db.fetchQueue();
    set({ queue });
  },

  addToQueue: async (tweet) => {
    const position = get().queue.length;
    const newItem = await db.addToQueue(tweet, position);

    if (newItem) {
      set((state) => ({ queue: [...state.queue, newItem] }));
    }
  },

  removeFromQueue: async (id) => {
    const oldQueue = get().queue;

    // Optimistic update
    set((state) => ({
      queue: state.queue
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, position: index })),
    }));

    const success = await db.removeFromQueue(id);
    if (success) {
      // Update positions in DB
      const newQueue = get().queue;
      await db.updateQueuePositions(newQueue.map((item) => ({ id: item.id, position: item.position })));
      get().showToast('Eliminado de la cola', 'info');
    } else {
      // Rollback
      set({ queue: oldQueue });
      get().showToast('Error al eliminar de la cola', 'error');
    }
  },

  reorderQueue: async (activeId, overId) => {
    const queue = get().queue;
    const activeIndex = queue.findIndex((item) => item.id === activeId);
    const overIndex = queue.findIndex((item) => item.id === overId);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newQueue = [...queue];
      const [removed] = newQueue.splice(activeIndex, 1);
      newQueue.splice(overIndex, 0, removed);

      const updatedQueue = newQueue.map((item, index) => ({ ...item, position: index }));
      set({ queue: updatedQueue });

      // Sync with DB
      await db.updateQueuePositions(updatedQueue.map((item) => ({ id: item.id, position: item.position })));
    }
  },

  updateQueueItem: async (id, updates) => {
    const oldItem = get().queue.find((item) => item.id === id);

    // Optimistic update
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));

    const dbUpdates: { customText?: string; scheduledAt?: Date | null } = {};
    if (updates.customText !== undefined) dbUpdates.customText = updates.customText;
    if (updates.scheduledAt !== undefined) dbUpdates.scheduledAt = updates.scheduledAt;

    const success = await db.updateQueueItem(id, dbUpdates);
    if (!success && oldItem) {
      // Rollback
      set((state) => ({
        queue: state.queue.map((item) =>
          item.id === id ? oldItem : item
        ),
      }));
      get().showToast('Error al actualizar item', 'error');
    }
  },

  // Config
  config: defaultConfig,

  updateConfig: async (updates) => {
    const oldConfig = get().config;
    const newConfig = { ...oldConfig, ...updates };

    // Optimistic update
    set({ config: newConfig });

    const success = await db.saveConfig(newConfig);
    if (success) {
      get().showToast('Configuración actualizada', 'success');
    } else {
      // Rollback
      set({ config: oldConfig });
      get().showToast('Error al guardar configuración', 'error');
    }
  },

  // System status
  isScrapingActive: false,
  setScrapingActive: (active) => {
    set({ isScrapingActive: active });
    // Persist to config silently (fire and forget)
    const currentConfig = get().config;
    db.saveConfig({ ...currentConfig, scrapingEnabled: active });
  },
  lastScrapeTime: null,
  setLastScrapeTime: (time) => set({ lastScrapeTime: time }),

  // Scraping progress (global)
  scrapeProgress: null,
  setScrapeProgress: (progressOrUpdater) => {
    if (typeof progressOrUpdater === 'function') {
      set((state) => ({ scrapeProgress: progressOrUpdater(state.scrapeProgress) }));
    } else {
      set({ scrapeProgress: progressOrUpdater });
    }
  },
  scrapeAbortController: null,
  setScrapeAbortController: (controller) => set({ scrapeAbortController: controller }),
  scrapeLog: [],
  setScrapeLog: (log) => set({ scrapeLog: log }),
  addToScrapeLog: (entry) => set((state) => ({ scrapeLog: [...state.scrapeLog, entry] })),
  clearScrapeLog: () => set({ scrapeLog: [] }),

  // Auto-publish state (global)
  isAutoPublishing: false,
  setIsAutoPublishing: (active) => {
    // Update both local state AND config object to avoid race conditions
    const currentConfig = get().config;
    const updatedConfig = { ...currentConfig, autoPublishEnabled: active };
    set({ isAutoPublishing: active, config: updatedConfig });
    // Persist to Supabase
    db.saveConfig(updatedConfig);
  },
  nextPublishTime: null,
  setNextPublishTime: (time) => {
    // Update both local state AND config object to avoid race conditions
    const currentConfig = get().config;
    const updatedConfig = {
      ...currentConfig,
      nextPublishTime: time ? time.toISOString() : null
    };
    set({ nextPublishTime: time, config: updatedConfig });
    // Persist to Supabase
    db.saveConfig(updatedConfig);
  },
  autoPublishCountdown: 0,
  setAutoPublishCountdown: (seconds) => set({ autoPublishCountdown: seconds }),

  // Toast
  toast: null,
  showToast: (message, type) => {
    set({ toast: { message, type } });
    setTimeout(() => get().hideToast(), 4000);
  },
  hideToast: () => set({ toast: null }),

  // Editing state
  editingTweetId: null,
  setEditingTweetId: (id) => set({ editingTweetId: id }),

  // Theme
  theme: (() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('xcrapper_theme');
    return (stored === 'light' ? 'light' : 'dark') as Theme;
  })(),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xcrapper_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  // Papers
  papers: [],
  selectedPaper: null,
  papersLoading: false,
  papersDate: new Date().toISOString().split('T')[0],
  setPapers: (papers) => set({ papers }),
  setSelectedPaper: (paper) => set({ selectedPaper: paper }),
  setPapersLoading: (loading) => set({ papersLoading: loading }),
  setPapersDate: (date) => set({ papersDate: date }),
  fetchPapers: async (date) => {
    const targetDate = date || get().papersDate;
    set({ papersLoading: true, papersDate: targetDate });

    try {
      const response = await fetch(`/api/papers?date=${targetDate}`);
      if (!response.ok) throw new Error('Failed to fetch papers');
      const data = await response.json();
      set({ papers: data.papers || [], papersLoading: false });
    } catch (error) {
      console.error('Error fetching papers:', error);
      set({ papers: [], papersLoading: false });
      get().showToast('Error al cargar papers', 'error');
    }
  },

  generateArticle: async (paperId) => {
    const { papers, selectedPaper } = get();
    const paper = papers.find(p => p.id === paperId);

    if (!paper) return;

    // Mark as loading
    const updatedPapers = papers.map(p =>
      p.id === paperId ? { ...p, articleLoading: true } : p
    );
    set({ papers: updatedPapers });
    if (selectedPaper?.id === paperId) {
      set({ selectedPaper: { ...selectedPaper, articleLoading: true } });
    }

    try {
      const response = await fetch('/api/papers/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper }),
      });

      if (!response.ok) throw new Error('Failed to generate article');
      const data = await response.json();

      // Update with article
      const finalPapers = get().papers.map(p =>
        p.id === paperId ? { ...p, article: data.article, articleLoading: false } : p
      );
      set({ papers: finalPapers });

      if (get().selectedPaper?.id === paperId) {
        set({ selectedPaper: { ...get().selectedPaper!, article: data.article, articleLoading: false } });
      }
    } catch (error) {
      console.error('Error generating article:', error);
      get().showToast('Error al generar artículo', 'error');

      // Clear loading state
      const resetPapers = get().papers.map(p =>
        p.id === paperId ? { ...p, articleLoading: false } : p
      );
      set({ papers: resetPapers });

      if (get().selectedPaper?.id === paperId) {
        set({ selectedPaper: { ...get().selectedPaper!, articleLoading: false } });
      }
    }
  },
}));
