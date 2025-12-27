# Styling Guide

## Overview

XCrapper uses **TailwindCSS 4** with a dark theme. All styling is utility-first with minimal custom CSS.

## Color Palette

### Background Colors

```css
bg-gray-900     /* Main background */
bg-gray-800     /* Card/panel background */
bg-gray-700     /* Hover states, borders */
bg-gray-600     /* Secondary elements */
```

### Text Colors

```css
text-white      /* Primary text */
text-gray-300   /* Secondary text */
text-gray-400   /* Muted text */
text-gray-500   /* Disabled/placeholder */
```

### Accent Colors

```css
/* Success */
bg-emerald-500  text-emerald-400  border-emerald-500

/* Error */
bg-red-500      text-red-400      border-red-500

/* Warning */
bg-amber-500    text-amber-400    border-amber-500

/* Info */
bg-blue-500     text-blue-400     border-blue-500

/* Breaking News */
bg-rose-500     text-rose-400     border-rose-500
```

## Common Patterns

### Card Layout

```tsx
<div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
  {/* Card content */}
</div>
```

### Button Styles

```tsx
{/* Primary button */}
<button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
  Aprobar
</button>

{/* Secondary button */}
<button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
  Cancelar
</button>

{/* Danger button */}
<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
  Eliminar
</button>

{/* Ghost button */}
<button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
  <Icon size={18} />
</button>
```

### Input Fields

```tsx
<input
  type="text"
  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
  placeholder="Placeholder text"
/>
```

### Textarea

```tsx
<textarea
  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 resize-none"
  rows={4}
/>
```

### Select Dropdown

```tsx
<select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

## Layout Patterns

### Full Height Container

```tsx
<div className="flex flex-col h-full">
  {/* Header */}
  <div className="p-4 border-b border-gray-700">
    <h1 className="text-xl font-semibold text-white">Title</h1>
  </div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-auto p-4">
    {/* Content */}
  </div>
</div>
```

### Grid Layout

```tsx
{/* Two columns */}
<div className="grid grid-cols-2 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Flex Layouts

```tsx
{/* Row with space between */}
<div className="flex items-center justify-between">
  <span>Left</span>
  <span>Right</span>
</div>

{/* Row with gap */}
<div className="flex items-center gap-2">
  <Icon size={18} />
  <span>Label</span>
</div>

{/* Column with gap */}
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Animation Patterns

### Using motion (framer-motion)

```tsx
import { motion, AnimatePresence } from 'motion/react';

{/* Fade in/out */}
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>

{/* Slide in */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.div>

{/* Staggered children */}
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }}
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### CSS Transitions

```tsx
{/* Color transition */}
<button className="transition-colors hover:bg-gray-700">
  Button
</button>

{/* All transitions */}
<div className="transition-all duration-200 hover:scale-105">
  Card
</div>

{/* Transform transitions */}
<div className="transition-transform hover:translate-y-[-2px]">
  Hover me
</div>
```

## Icons

Use **lucide-react** for all icons:

```tsx
import { Check, X, Clock, Send, Settings, Trash2 } from 'lucide-react';

{/* Standard size */}
<Check size={18} className="text-emerald-400" />

{/* In button */}
<button className="flex items-center gap-2">
  <Send size={16} />
  <span>Publicar</span>
</button>

{/* Icon button */}
<button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
  <Settings size={20} className="text-gray-400 hover:text-white" />
</button>
```

## Status Badges

```tsx
{/* Pending */}
<span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded">
  Pendiente
</span>

{/* Approved */}
<span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">
  Aprobado
</span>

{/* Rejected */}
<span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
  Rechazado
</span>

{/* Published */}
<span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
  Publicado
</span>

{/* Breaking News */}
<span className="px-2 py-1 text-xs bg-rose-500/20 text-rose-400 rounded font-medium">
  🔴 Breaking
</span>
```

## Relevance Score Colors

```tsx
const getScoreColor = (score: number) => {
  if (score >= 9) return 'text-emerald-400';  // Excellent
  if (score >= 7) return 'text-blue-400';     // Good
  if (score >= 5) return 'text-amber-400';    // Medium
  return 'text-red-400';                       // Low
};
```

## Responsive Design

```tsx
{/* Mobile-first approach */}
<div className="
  p-2 md:p-4          /* Padding: 8px mobile, 16px desktop */
  text-sm md:text-base /* Font: 14px mobile, 16px desktop */
  grid-cols-1 md:grid-cols-2 /* 1 col mobile, 2 cols desktop */
">
  Content
</div>

{/* Hide on mobile */}
<div className="hidden md:block">Desktop only</div>

{/* Show on mobile only */}
<div className="md:hidden">Mobile only</div>
```

## Global Styles

Located in `src/app/globals.css`:

```css
@import "tailwindcss";

/* Custom scrollbar (dark theme) */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #1f2937;  /* gray-800 */
}
::-webkit-scrollbar-thumb {
  background: #4b5563;  /* gray-600 */
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #6b7280;  /* gray-500 */
}
```

## Best Practices

1. **Use Tailwind utilities** — Avoid custom CSS when possible
2. **Consistent spacing** — Use gap-2, gap-4 for spacing
3. **Transition everything** — Add `transition-colors` or `transition-all`
4. **Dark theme first** — Design for dark mode, it's the only theme
5. **Mobile responsive** — Use `md:` breakpoint for desktop styles
6. **Icon consistency** — Always lucide-react, size 16-20
7. **Color opacity** — Use `bg-color-500/20` for subtle backgrounds
