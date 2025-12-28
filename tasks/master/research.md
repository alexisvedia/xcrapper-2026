# Research: AI Papers Journal Feature

## Objetivo
Crear una nueva sección "Diario de Papers" estilo The Verge para leer daily papers de Hugging Face en español.

## Análisis de The Verge

### Estilo Visual (Screenshots capturados)
- **Fondo**: Negro puro (#000000)
- **Color accent**: Cyan/verde (#50E3C2) - MUY similar al accent de XCrapper!
- **Tipografía títulos**: Serif, bold, grande (font-family: serif)
- **Tipografía body**: Sans-serif, limpia
- **Metadata**: Autor en color accent, fecha en gris

### Layout de Artículos
1. **Hero Article**: Imagen grande + título serif grande + subtítulo + autor/fecha
2. **Lista de artículos**:
   - Thumbnail cuadrado (con número de ranking)
   - Título serif bold a la derecha
   - Autor (cyan) + fecha (gris) + comentarios

### Elementos UI
- Tabs: "TOP STORIES" / "FOLLOWING" (pills con accent color)
- Cards con hover effects
- Transiciones suaves

## Patrones Existentes en XCrapper

### Views Actuales
- `InboxView.tsx` - Lista de tweets pendientes
- `QueueView.tsx` - Cola de publicación
- `PublishedView.tsx` - Historial
- `ConfigView.tsx` - Configuración

### Sistema de Navegación
- `Sidebar.tsx` - Desktop navigation
- `BottomNav.tsx` - Mobile navigation
- `MobileHeader.tsx` - Header móvil
- ViewType en types: 'inbox' | 'queue' | 'published' | 'config'

### CSS Variables (globals.css)
```css
--bg-primary, --bg-secondary, --bg-tertiary
--accent, --accent-dim
--text-primary, --text-secondary, --text-muted
--green, --red
```

### State Management
- Zustand store en `src/store/index.ts`
- Pattern: `useAppStore()` hook

## Fuente de Datos

### Hugging Face Papers API
- URL: `https://huggingface.co/papers/date/YYYY-MM-DD`
- Cada paper tiene:
  - Título
  - Abstract
  - Autores
  - Institución
  - ArXiv ID
  - Upvotes
  - Imagen/thumbnail (si existe)

### Procesamiento Necesario
1. Scrape papers de HF
2. Traducir a español con AI
3. Expandir/explicar el abstract
4. Almacenar para lectura

## Tipografías Serif Sugeridas

### Google Fonts (gratis)
1. **Playfair Display** - Elegante, editorial
2. **Lora** - Legible, moderna
3. **Merriweather** - Excelente para lectura
4. **Source Serif Pro** - Profesional

### Combinación Recomendada
- Títulos: Playfair Display (bold)
- Body: System fonts (ya usados en XCrapper)

## Conclusiones

1. El accent color de XCrapper (#00f2fe cyan) es casi idéntico al de The Verge
2. Solo necesitamos agregar tipografía serif para títulos
3. El dark theme ya está implementado
4. Necesitamos una nueva View + agregar al store/navigation
