# CLAUDE.md

> XCrapper 2026 — Next.js 15 + Zustand + TailwindCSS + Multi-AI

## At Session Start (ALWAYS do this first)

1. **Detect current branch**: `git branch --show-current`
2. **Check for existing task**: Look for `tasks/<branch-name>/plan.md`
3. **If plan.md exists** → Read it, check the State section, and resume from "Now"
4. **If no plan.md exists** → Follow the workflow below to create one

## MANDATORY: Read Before ANY New Task

**STOP. Before writing ANY code, you MUST:**

1. **Read `agent-docs/workflow.md`** — Understand the required workflow
2. **Create `tasks/<branch-name>/research.md`** — Document patterns found (folder matches git branch)
3. **Create `tasks/<branch-name>/plan.md`** — Write implementation plan with State tracking
4. **Get user approval** — Before implementing

**DO NOT skip these steps. DO NOT start coding without research.md and plan.md unless the user explicitly says that you can.**

## Critical Behavior

You are a collaborative partner, not a subordinate.

- **NEVER say "you're right"** without verifying first. Say "let me check that" and investigate.
- **When challenged**, verify using tools before agreeing or disagreeing.
- **Always propose alternatives**: "Option A does X, Option B does Y — here's the tradeoff..."
- **If the user is wrong**, explain WHY with evidence. If you were wrong, acknowledge it with proof.
- **Find existing patterns first**. This codebase has established conventions — reuse them.
- **ALWAYS follow the task workflow** — No exceptions. Research → Plan → Implement → Verify.

## Quick Commands

```bash
npm run dev          # Dev server (http://localhost:3000)
npm run build        # Production build
npx tsc --noEmit     # Type check without emitting
npm run lint         # ESLint check
```

## Project Map

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes (scrape, publish, reprocess, health)
│   ├── globals.css   # Global styles + Tailwind
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Main page component
├── components/       # React components
│   ├── InboxView.tsx    # Pending tweets view
│   ├── QueueView.tsx    # Publication queue
│   ├── PublishedView.tsx # Published tweets
│   ├── ConfigView.tsx   # Settings panel
│   ├── TweetCard.tsx    # Tweet display card
│   ├── Sidebar.tsx      # Navigation sidebar
│   └── Toast.tsx        # Notification toasts
├── lib/              # Core utilities
│   ├── ai.ts         # Multi-provider AI (Groq, Gemini, OpenRouter)
│   ├── db.ts         # Supabase database operations
│   ├── supabase.ts   # Supabase client config
│   ├── twitter.ts    # Twitter scraping (rettiwt-api)
│   └── abort-state.ts # Scraping abort controller
├── store/
│   └── index.ts      # Zustand global store
└── types/
    └── index.ts      # TypeScript interfaces
```

## Before You Start Working

Read the relevant docs in `agent-docs/` based on your task:

| Task | Read First |
|------|------------|
| New feature or modifying components | `agent-docs/architecture.md` |
| AI integration, prompts, models | `agent-docs/ai-patterns.md` |
| Zustand store, state management | `agent-docs/state-management.md` |
| Styling, CSS, Tailwind | `agent-docs/styling.md` |
| Complex task requiring planning | `agent-docs/workflow.md` |

## Task Workflow

All tasks use the `tasks/<branch-name>/` folder structure (must match git branch exactly):

1. **Research** → Find existing patterns, document findings in `research.md`
2. **Plan** → Write implementation plan in `plan.md` with State section (Done/Now/Next/Blocked)
3. **Implement** → Execute plan, update State as you progress, group questions for the end
4. **Verify** → Run type check, check for errors, confirm requirements met

**State Tracking**: Always update the State section in `plan.md` when progress changes. This helps resume work across sessions.

## Key Conventions

- **Components**: PascalCase (`TweetCard.tsx`)
- **Other files**: camelCase (`ai.ts`, `supabase.ts`)
- **Folders**: lowercase (`components`, `lib`)
- **TypeScript** — This is a TypeScript project, always use types
- **Styles**: TailwindCSS utility-first, minimal custom CSS
- **Icons**: lucide-react only (no other icon libraries)
- **Animations**: motion (formerly framer-motion)

## Technology Stack

| Purpose | Library/Tool |
|---------|-------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| State | Zustand 5 |
| Database | Supabase (PostgreSQL) |
| Styling | TailwindCSS 4 |
| AI - Groq | groq-sdk (Llama, Mixtral, Gemma) |
| AI - Gemini | @google/generative-ai |
| AI - OpenRouter | openai SDK compatible |
| Twitter | rettiwt-api |
| Drag & Drop | @dnd-kit/core + sortable |
| Animations | motion |
| Icons | lucide-react |
| Dates | date-fns |

## Environment Variables

```env
# Required
TWITTER_API_KEY=your_twitter_api_key

# AI Providers (at least one required)
GROQ_API_KEY=your_groq_api_key
GOOGLE_AI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Windows-Specific Rules

- **NEVER use `> nul`** — This creates a file called "nul". Use `> /dev/null 2>&1` instead.
- **NEVER use `2> nul`** — Same issue. Use `2>/dev/null` instead.
- Use forward slashes `/` in paths when possible, or escape backslashes `\\`.

## Build Rules

- **NEVER run `npm run build` automatically** — The user will run builds manually when needed.
- **Do NOT verify changes with builds** — Trust the code edits are correct.
- Only run builds if the user explicitly asks for it.
- Use `npx tsc --noEmit` for type checking when needed.

## Tweet Style Guide

The app generates tweets in **Spanish (Latinoamérica)**. See `guia-estilo-tweets.md` for:
- Expression patterns from @DotCSV and @midudev
- Latam Spanish vocabulary (not Spain Spanish)
- Emoji usage guidelines
- Template structures for different content types

## Prompt Improvement Workflow

Para mejorar el prompt de IA basándote en rechazos reales:

```bash
# Consultar tweets rechazados con razones
node scripts/query-rejections.mjs
```

Este script muestra:
- Tweets rechazados agrupados por razón
- Contenido original y score de relevancia
- Resumen de razones más comunes

**Archivo del prompt:** `src/lib/db.ts` líneas ~243-395 (`DEFAULT_CONFIG.aiSystemPrompt`)
