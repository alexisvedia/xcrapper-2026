# Architecture Guide

## Technology Stack

- **Next.js 15.5.9** with App Router
- **React 18.3.1** with TypeScript
- **Zustand 5.0.9** for global state
- **Supabase** for PostgreSQL database
- **TailwindCSS 4** for styling
- **Multi-AI**: Groq, Google Gemini, OpenRouter
- **rettiwt-api 6.1.4** for Twitter scraping
- **motion 12.x** for animations
- **@dnd-kit** for drag and drop
- **lucide-react** for icons
- **date-fns** for date formatting

## Application Flow

```
User → Page.tsx → Views (Inbox/Queue/Published/Config)
                      ↓
                  Zustand Store ←→ Supabase DB
                      ↓
                  API Routes → AI Providers / Twitter
```

## Directory Structure

### `/src/app` — Next.js App Router

```
app/
├── api/
│   ├── scrape/
│   │   ├── route.ts          # Main scraping endpoint (SSE)
│   │   └── abort/route.ts    # Abort scraping
│   ├── publish/route.ts      # Publish tweet to Twitter
│   ├── reprocess/route.ts    # Re-analyze tweet with AI
│   └── health/route.ts       # Health check
├── globals.css               # Global styles + Tailwind base
├── layout.tsx                # Root layout with metadata
├── page.tsx                  # Main SPA entry point
└── icon.svg                  # Favicon
```

### `/src/components` — UI Components

```
components/
├── InboxView.tsx      # Pending tweets list with scraping controls
├── QueueView.tsx      # Publication queue with drag-and-drop
├── PublishedView.tsx  # Published tweets history
├── ConfigView.tsx     # Settings panel (AI model, prompt, etc.)
├── TweetCard.tsx      # Individual tweet display with actions
├── Sidebar.tsx        # Navigation sidebar
├── Toast.tsx          # Notification component
└── index.ts           # Barrel export
```

### `/src/lib` — Core Utilities

```
lib/
├── ai.ts              # Multi-provider AI integration
├── db.ts              # Supabase database operations + default config
├── supabase.ts        # Supabase client initialization
├── twitter.ts         # Twitter scraping with rettiwt-api
└── abort-state.ts     # Global abort controller for scraping
```

### `/src/store` — State Management

```
store/
└── index.ts           # Zustand store with all app state
```

### `/src/types` — TypeScript Types

```
types/
└── index.ts           # All interfaces and types
```

## Key Patterns

### Component Pattern

All components follow this structure:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { SomeIcon } from 'lucide-react';

export function ComponentName() {
  // 1. Store hooks
  const { someState, someAction } = useAppStore();

  // 2. Local state
  const [localState, setLocalState] = useState(false);

  // 3. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // 4. Handlers
  const handleClick = () => {
    someAction();
  };

  // 5. Render
  return (
    <div className="flex flex-col gap-4">
      {/* JSX */}
    </div>
  );
}
```

### View Component Pattern

Views are full-page components that compose smaller components:

```typescript
'use client';

import { useAppStore } from '@/store';
import { TweetCard } from './TweetCard';

export function InboxView() {
  const { tweets } = useAppStore();

  const pendingTweets = tweets.filter(t => t.status === 'pending');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1>Inbox</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {pendingTweets.map(tweet => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
      </div>
    </div>
  );
}
```

### API Route Pattern

All API routes are in `src/app/api/` and use Next.js Route Handlers:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Process request
    const result = await doSomething(body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### SSE (Server-Sent Events) Pattern

Used for real-time progress updates (see `src/app/api/scrape/route.ts`):

```typescript
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send progress updates
      sendEvent({ type: 'progress', percent: 50 });

      // Close stream when done
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Database Schema

### Tables (Supabase)

```sql
-- scraped_tweets: Stores all scraped tweets
CREATE TABLE scraped_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT UNIQUE NOT NULL,
  author_username TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  original_content TEXT NOT NULL,
  processed_content TEXT,
  original_url TEXT,
  relevance_score INTEGER DEFAULT 0,
  ai_summary TEXT,
  ai_model TEXT,
  media JSONB,
  rejection_reason TEXT,
  approval_reason TEXT,
  status TEXT DEFAULT 'pending',  -- pending, approved, rejected, published
  is_breaking_news BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- publish_queue: Publication queue
CREATE TABLE publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_tweet_id UUID REFERENCES scraped_tweets(id) ON DELETE CASCADE,
  custom_text TEXT,
  position INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- config: App configuration (single row)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Key Interfaces

```typescript
// Tweet statuses
type TweetStatus = 'pending' | 'approved' | 'rejected' | 'published';

// Main tweet interface
interface ScrapedTweet {
  id: string;
  tweetId: string;
  authorUsername: string;
  authorName: string;
  authorAvatar?: string;
  originalContent: string;
  processedContent: string;
  originalUrl: string;
  relevanceScore: number;
  aiSummary?: string;
  aiModel?: string;
  media?: TweetMedia[];
  scrapedAt: Date;
  status: TweetStatus;
  rejectionReason?: string;
  approvalReason?: string;
  isBreakingNews?: boolean;
}

// AI providers
type AIProvider = 'groq' | 'gemini' | 'openrouter';

// App configuration
interface AppConfig {
  scrapeIntervalHours: number;
  publishIntervalMinutes: number;
  tweetsPerScrape: number;
  minRelevanceScore: number;
  targetLanguage: string;
  autoPublishEnabled: boolean;
  autoApproveEnabled: boolean;
  aiSystemPrompt: string;
  aiModel: AIModel;
  // ... more settings
}
```

## Best Practices

1. **Always use TypeScript types** — Never use `any`
2. **Use Zustand for global state** — Local state with useState for component-only data
3. **Follow existing patterns** — Copy structure from similar files
4. **Use lucide-react icons** — Don't add other icon libraries
5. **Tailwind utility-first** — Avoid custom CSS when possible
6. **Handle errors gracefully** — Always wrap async operations in try/catch
