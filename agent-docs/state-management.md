# State Management

## Overview

XCrapper uses **Zustand** for global state management. All state is centralized in a single store at `src/store/index.ts`.

## Store Structure

```typescript
interface AppState {
  // Loading
  isLoading: boolean;
  isInitialized: boolean;
  initializeApp: () => Promise<void>;

  // View
  currentView: ViewType;  // 'inbox' | 'queue' | 'published' | 'config'
  setCurrentView: (view: ViewType) => void;

  // Tweets
  tweets: ScrapedTweet[];
  refreshTweets: () => Promise<void>;
  approveTweet: (id: string, reason?: string) => Promise<void>;
  rejectTweet: (id: string, reason?: string) => Promise<void>;
  updateTweetContent: (id: string, content: string) => Promise<void>;
  deleteTweets: (ids: string[]) => Promise<void>;

  // Queue
  queue: QueueItem[];
  refreshQueue: () => Promise<void>;
  addToQueue: (tweet: ScrapedTweet) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  reorderQueue: (activeId: string, overId: string) => Promise<void>;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;

  // Config
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;

  // Scraping State
  isScrapingActive: boolean;
  setScrapingActive: (active: boolean) => void;
  scrapeProgress: ScrapeProgress | null;
  setScrapeProgress: (progress: ScrapeProgress | null) => void;
  scrapeLog: ScrapeLogEntry[];
  addToScrapeLog: (entry: ScrapeLogEntry) => void;

  // Auto-publish State
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

  // Editing
  editingTweetId: string | null;
  setEditingTweetId: (id: string | null) => void;
}
```

## Using the Store

### Basic Usage

```typescript
import { useAppStore } from '@/store';

function MyComponent() {
  // Select specific state
  const tweets = useAppStore(state => state.tweets);
  const config = useAppStore(state => state.config);

  // Or destructure multiple items
  const { currentView, setCurrentView } = useAppStore();

  return <div>{/* ... */}</div>;
}
```

### Selective Subscriptions (Performance)

```typescript
// Good: Only re-render when tweets change
const tweets = useAppStore(state => state.tweets);

// Good: Only re-render when pending count changes
const pendingCount = useAppStore(
  state => state.tweets.filter(t => t.status === 'pending').length
);

// Avoid: Re-renders on ANY state change
const store = useAppStore();  // Don't do this
```

## Key Patterns

### Optimistic Updates

All mutations use optimistic updates with rollback on failure:

```typescript
approveTweet: async (id, reason) => {
  const tweet = get().tweets.find((t) => t.id === id);
  if (!tweet) return;

  // 1. Optimistic update
  set((state) => ({
    tweets: state.tweets.map((t) =>
      t.id === id ? { ...t, status: 'approved' } : t
    ),
  }));

  // 2. API call
  const success = await db.updateTweetStatus(id, 'approved', reason);

  if (success) {
    // 3a. Success: Additional actions
    await get().addToQueue({ ...tweet, status: 'approved' });
    get().showToast('Tweet aprobado', 'success');
  } else {
    // 3b. Failure: Rollback
    set((state) => ({
      tweets: state.tweets.map((t) =>
        t.id === id ? { ...t, status: 'pending' } : t
      ),
    }));
    get().showToast('Error al aprobar', 'error');
  }
},
```

### State Persistence

View state persists to localStorage:

```typescript
const STORAGE_KEYS = {
  currentView: 'xcrapper_currentView',
};

// Save
setCurrentView: (view) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.currentView, view);
  }
  set({ currentView: view });
},

// Restore
const getStoredView = (): ViewType => {
  if (typeof window === 'undefined') return 'inbox';
  const stored = localStorage.getItem(STORAGE_KEYS.currentView);
  return stored as ViewType || 'inbox';
};
```

Auto-publish state persists to Supabase config:

```typescript
setIsAutoPublishing: (active) => {
  const currentConfig = get().config;
  const updatedConfig = { ...currentConfig, autoPublishEnabled: active };
  set({ isAutoPublishing: active, config: updatedConfig });
  db.saveConfig(updatedConfig);  // Persist to Supabase
},
```

### Initialization

App initializes on first load:

```typescript
initializeApp: async () => {
  if (get().isInitialized) return;

  set({ isLoading: true });
  try {
    const [tweets, queue, config] = await Promise.all([
      db.fetchTweets(),
      db.fetchQueue(),
      db.fetchConfig(),
    ]);

    set({
      tweets,
      queue,
      config,
      isLoading: false,
      isInitialized: true,
    });
  } catch (error) {
    set({ isLoading: false, isInitialized: true });
    get().showToast('Error cargando datos', 'error');
  }
},
```

### Using in Page Component

```typescript
// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store';

export default function Home() {
  const { isInitialized, initializeApp, isLoading } = useAppStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeApp();
    }
  }, [isInitialized, initializeApp]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <MainLayout />;
}
```

## Scraping Progress State

Global state for scraping progress (persists across view changes):

```typescript
interface ScrapeProgress {
  percent: number;
  current: number;
  total: number;
  message: string;
  author?: string;
  status?: string;
  isBreakingNews?: boolean;
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

// Update with callback
setScrapeProgress: (progressOrUpdater) => {
  if (typeof progressOrUpdater === 'function') {
    set((state) => ({
      scrapeProgress: progressOrUpdater(state.scrapeProgress)
    }));
  } else {
    set({ scrapeProgress: progressOrUpdater });
  }
},
```

## Database Sync

All store actions that modify data sync with Supabase:

```typescript
// src/lib/db.ts functions
db.fetchTweets()      // Read all tweets
db.updateTweetStatus() // Update tweet status
db.insertTweet()       // Insert new tweet
db.deleteTweets()      // Delete tweets

db.fetchQueue()        // Read queue
db.addToQueue()        // Add to queue
db.removeFromQueue()   // Remove from queue
db.updateQueuePositions() // Reorder queue

db.fetchConfig()       // Read config
db.saveConfig()        // Save config
```

## Best Practices

1. **Use selective subscriptions** — Only subscribe to state you need
2. **Keep actions in store** — Don't put business logic in components
3. **Optimistic updates** — Update UI immediately, rollback on error
4. **Persist critical state** — Auto-publish to Supabase, view to localStorage
5. **Initialize once** — Check `isInitialized` before calling `initializeApp`
6. **Use `get()` in actions** — Access current state in async actions
7. **Group related updates** — Batch related state changes in single `set()`
