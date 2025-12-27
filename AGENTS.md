# Sistema de Agentes - XCrapper 2026

## ¿Qué es esto?

Este sistema optimiza cómo los agentes de IA (Claude Code, Gemini CLI, Codex) trabajan con el codebase. En lugar de un archivo enorme, usamos documentación modular que se lee según la tarea.

## Estructura

```
CLAUDE.md                    # Core (~100 líneas) — siempre presente
gemini.md                    # Versión compacta para Gemini CLI
agents.md                    # Este archivo - explica el sistema
agent-docs/
├── workflow.md              # Research → Plan → Implement → Verify
├── architecture.md          # Stack, estructura, patrones
├── ai-patterns.md           # Integración multi-AI (Groq, Gemini, OpenRouter)
├── state-management.md      # Zustand store patterns
└── styling.md               # TailwindCSS, dark theme, animations
```

## Cómo Funciona

1. **CLAUDE.md** se lee siempre al inicio de sesión
2. El agente revisa la tabla "Before You Start Working"
3. Según la tarea, lee **solo** el archivo relevante de `agent-docs/`
4. Esto reduce el contexto y mejora la adherencia a instrucciones

## Cuándo Leer Qué

| Tarea | Leer Primero |
|-------|--------------|
| Nueva feature o modificar componentes | `agent-docs/architecture.md` |
| Integración AI, prompts, modelos | `agent-docs/ai-patterns.md` |
| Zustand store, estado global | `agent-docs/state-management.md` |
| Estilos, CSS, Tailwind | `agent-docs/styling.md` |
| Tarea compleja que requiere planificación | `agent-docs/workflow.md` |

## Comportamiento Clave

### "No Yes-Man"

Los agentes están configurados para:
- **NUNCA decir "tienes razón"** sin verificar primero
- **Verificar usando herramientas** antes de confirmar o negar
- **Proponer alternativas** con tradeoffs
- **Explicar si el usuario está equivocado** con evidencia

### Workflow Obligatorio

Para tareas no triviales:
1. **Research** → Encontrar patrones existentes
2. **Plan** → Escribir plan de implementación
3. **Implement** → Ejecutar el plan
4. **Verify** → Confirmar que funciona

## Para Claude Code

Lee `CLAUDE.md` completo. Contiene:
- Comandos rápidos
- Mapa del proyecto
- Convenciones de código
- Reglas de Windows
- Reglas de build

## Para Gemini CLI

Lee `gemini.md`. Es una versión compacta con:
- Overview del proyecto
- Estructura de archivos
- Guidelines de código
- Tareas comunes

## Carpeta tasks/

Las tareas se documentan en `tasks/<branch-name>/`:

```
tasks/
└── feature/
    └── auto-publish/
        ├── brainstorm.md   # Ideas y opciones evaluadas
        ├── research.md     # Patrones encontrados
        ├── plan.md         # Plan de implementación
        └── notes.md        # Notas adicionales
```

**El nombre de la carpeta DEBE coincidir con el branch de git.**

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 15.5.9 | Framework (App Router) |
| React | 18.3.1 | UI Library |
| TypeScript | 5 | Lenguaje |
| Zustand | 5.0.9 | State Management |
| Supabase | - | Database (PostgreSQL) |
| TailwindCSS | 4 | Styling |
| Groq SDK | - | AI Provider (Llama, Mixtral) |
| @google/generative-ai | - | AI Provider (Gemini) |
| OpenAI SDK | - | AI Provider (OpenRouter) |
| rettiwt-api | 6.1.4 | Twitter Scraping |
| motion | 12.x | Animations |
| @dnd-kit | - | Drag & Drop |
| lucide-react | - | Icons |
| date-fns | - | Date Formatting |

## Guía de Estilo de Tweets

Los tweets generados usan español de Latinoamérica. Ver `guia-estilo-tweets.md` para:
- Expresiones auténticas (@DotCSV, @midudev)
- Vocabulario Latam vs España
- Uso de emojis
- Plantillas por tipo de contenido

## Archivos Importantes

```
src/lib/db.ts              # Default AI prompt (líneas ~243-395)
src/store/index.ts         # Todo el estado de la app
src/lib/ai.ts              # Multi-provider AI
src/app/api/scrape/route.ts # Scraping con SSE
guia-estilo-tweets.md      # Guía de estilo completa
```

## Prompt Improvement Workflow

Para mejorar el prompt basándote en rechazos reales:

```bash
# 1. Consultar tweets rechazados con razones
node scripts/query-rejections.mjs
```

**Output del script:**
- Tweets agrupados por razón de rechazo
- Contenido original y score de relevancia
- Resumen de razones más frecuentes

**Archivo del prompt:** `src/lib/db.ts` → `DEFAULT_CONFIG.aiSystemPrompt`

**Secciones del prompt a modificar:**
| Sección | Propósito |
|---------|-----------|
| `TIER 4` | Criterios generales de rechazo |
| `CONTENIDO OFF-TOPIC` | Temas a rechazar (películas, juegos, etc.) |
| `TWEETS VAGOS/GENÉRICOS` | Patrones de contenido vago |
| `EJEMPLOS DE TWEETS A RECHAZAR` | Casos reales con scores |

**Workflow:**
1. Ejecutar script → Ver rechazos manuales
2. Identificar patrones → Qué rechaza el usuario que la IA aprueba
3. Actualizar prompt → Agregar reglas/ejemplos
4. Verificar → Hacer scrape de prueba
