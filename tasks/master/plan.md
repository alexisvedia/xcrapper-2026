# Plan: AI Papers Journal Feature

## Overview
Crear una nueva sección "Diario de Papers" estilo The Verge para leer daily papers de Hugging Face en español.

## State
- **Done**: Research, Types/Store, Font, Theme, PapersView, API Route, Navigation
- **Now**: Testing
- **Next**: Real HF scraping (future)
- **Blocked**: none

---

## Implementation Steps

### Step 1: Add Types and Store Updates
**Files**: `src/types/index.ts`, `src/store/index.ts`

1. Add new ViewType: `'papers'`
2. Add Paper interface:
   ```typescript
   interface Paper {
     id: string;
     title: string;
     titleEs: string;        // Translated
     abstract: string;
     abstractEs: string;     // Translated + expanded
     authors: string[];
     institution?: string;
     arxivId: string;
     upvotes: number;
     thumbnail?: string;
     publishedAt: Date;
     fetchedAt: Date;
   }
   ```
3. Add store state for papers:
   - `papers: Paper[]`
   - `selectedPaper: Paper | null`
   - `fetchPapers()`, `setSelectedPaper()`

### Step 2: Add Serif Font
**Files**: `src/app/layout.tsx`, `src/app/globals.css`

1. Import Playfair Display from Google Fonts
2. Add CSS variable `--font-serif: 'Playfair Display', serif`
3. Add utility class `.font-serif`

### Step 3: Create PapersView Component
**File**: `src/components/PapersView.tsx`

Layout structure:
```
┌─────────────────────────────────────────┐
│ Header: "Papers" + date selector        │
├─────────────────────────────────────────┤
│ Hero Article (if papers exist)          │
│ ┌───────────────────────────────────┐   │
│ │ Large thumbnail                    │   │
│ │ Title (serif, large)               │   │
│ │ Subtitle/abstract excerpt          │   │
│ │ Author (cyan) + date (gray)        │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ Papers List                             │
│ ┌─────┬─────────────────────────────┐   │
│ │ #1  │ Title (serif)               │   │
│ │ img │ Author · Date · ↑ upvotes   │   │
│ └─────┴─────────────────────────────┘   │
│ ┌─────┬─────────────────────────────┐   │
│ │ #2  │ Title (serif)               │   │
│ │ img │ Author · Date · ↑ upvotes   │   │
│ └─────┴─────────────────────────────┘   │
└─────────────────────────────────────────┘
```

Components:
- `PapersView` - Main container
- `HeroPaper` - Featured paper card
- `PaperListItem` - Paper in list
- `PaperDetail` - Full paper view (modal or expanded)

### Step 4: Create Papers API Route
**File**: `src/app/api/papers/route.ts`

1. Fetch papers from HF: `https://huggingface.co/papers?date=YYYY-MM-DD`
2. Parse HTML to extract paper data
3. Translate title + abstract to Spanish using existing AI
4. Return processed papers

### Step 5: Update Navigation
**Files**: `src/components/Sidebar.tsx`, `src/components/BottomNav.tsx`, `src/components/MobileHeader.tsx`

1. Add "Papers" nav item with `Newspaper` icon from lucide-react
2. Update `getViewTitle()` in MobileHeader
3. Add case in page.tsx `renderView()`

### Step 6: Style Refinements
**File**: `src/app/globals.css`

1. Add `.paper-title` class (serif, large, bold)
2. Add `.paper-meta` class (small, muted)
3. Add `.paper-card` hover effects
4. Ensure dark theme consistency

---

## Design Decisions

### Typography
- **Titles**: Playfair Display (serif), bold, 24-32px
- **Body**: System fonts (existing)
- **Meta**: Monospace for dates/stats

### Colors (existing palette)
- Background: `--bg-primary` (black)
- Accent: `--accent` (cyan) - for authors, highlights
- Text: `--text-primary`, `--text-secondary`, `--text-muted`

### Layout
- Desktop: 3-column grid (hero spans 2)
- Mobile: Single column, stacked cards

### Data Flow
```
User selects date → API fetches HF papers → AI translates → Store updates → View renders
```

---

## Verification Checklist
- [ ] Types added and exported
- [ ] Store updated with papers state
- [ ] Font imported and working
- [ ] PapersView renders correctly
- [ ] API fetches and translates papers
- [ ] Navigation works (desktop + mobile)
- [ ] Mobile responsive design
- [ ] TypeScript passes (`npx tsc --noEmit`)

---

## Risks & Mitigations
1. **HF scraping might break**: Use try/catch, show error state
2. **AI translation slow**: Show loading skeleton, cache results
3. **Rate limits**: Batch translations, respect API limits

---

## Estimated Complexity
- Types/Store: Simple
- Font: Simple
- PapersView: Medium (main work)
- API Route: Medium (scraping + AI)
- Navigation: Simple
- Styling: Simple

**Total**: ~6 implementation steps, medium complexity
