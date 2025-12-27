# GEMINI.md

> XCrapper 2026 — Configuration for Gemini CLI

## Project Overview

XCrapper is a Twitter/X content curation app built with:
- **Next.js 15** (App Router)
- **TypeScript**
- **Zustand** (state management)
- **Supabase** (PostgreSQL database)
- **TailwindCSS 4**
- **Multi-AI**: Groq, Google Gemini, OpenRouter

## Quick Start

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes (scrape, publish, reprocess)
│   └── page.tsx      # Main SPA
├── components/       # React components (Views, Cards, etc.)
├── lib/              # Core utilities (AI, DB, Twitter)
├── store/            # Zustand global store
└── types/            # TypeScript interfaces
```

## Key Files

| File | Purpose |
|------|---------|
| `src/store/index.ts` | Zustand store - all app state |
| `src/lib/ai.ts` | Multi-provider AI integration |
| `src/lib/db.ts` | Supabase database + default config |
| `src/lib/twitter.ts` | Twitter scraping |
| `src/app/api/scrape/route.ts` | Main scraping endpoint (SSE) |
| `src/components/TweetCard.tsx` | Tweet display component |

## Coding Guidelines

### TypeScript
- Always use types, never `any`
- Interfaces in `src/types/index.ts`

### Components
- PascalCase filenames (`TweetCard.tsx`)
- Use `'use client'` directive for client components
- Import store with `useAppStore` from `@/store`

### Styling
- TailwindCSS utility-first
- Dark theme only (`bg-gray-800`, `text-white`)
- Icons: lucide-react only

### State
- Global state in Zustand store
- Optimistic updates with rollback
- Persist view to localStorage, config to Supabase

## Common Tasks

### Add New Component
```typescript
'use client';
import { useAppStore } from '@/store';

export function NewComponent() {
  const { someState, someAction } = useAppStore();
  return <div className="bg-gray-800 p-4 rounded-lg">{/* ... */}</div>;
}
```

### Add API Route
```typescript
// src/app/api/endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Process...
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

### Modify Store
```typescript
// In src/store/index.ts
interface AppState {
  newField: string;
  setNewField: (value: string) => void;
}

// In create()
newField: '',
setNewField: (value) => set({ newField: value }),
```

## Environment Variables

```env
TWITTER_API_KEY=xxx
GROQ_API_KEY=xxx
GOOGLE_AI_API_KEY=xxx
OPENROUTER_API_KEY=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Tweet Style (Spanish Latam)

Generated tweets use:
- Spanish from Latin America (NOT Spain)
- Expressions: "¡Brutal!", "¡Wow!", "Es oro puro"
- Max 2-3 emojis: 🔥 (new), 🔴 (breaking), 👇 (CTA)
- See `guia-estilo-tweets.md` for full style guide

## Windows Notes

- Use `/` not `\` in paths
- Never use `> nul` (creates file), use `> /dev/null 2>&1`
- Don't run `npm run build` automatically

## Prompt Improvement

```bash
# Ver tweets rechazados con razones
node scripts/query-rejections.mjs
```

Archivo del prompt: `src/lib/db.ts` líneas ~243-395

## Before Coding

1. Read `CLAUDE.md` for full guidelines
2. Check `agent-docs/` for specific patterns
3. Find existing patterns in codebase first
4. Follow TypeScript types strictly
