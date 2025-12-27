# Agent Workflow

## Overview

All tasks follow a structured workflow using `tasks/<branch-name>/` folders.

**The task folder name MUST match the git branch name exactly.**

Examples:
- Branch: `feature/auto-publish` → Folder: `tasks/feature/auto-publish/`
- Branch: `fix/scraping-error` → Folder: `tasks/fix/scraping-error/`
- Branch: `refactor/ai-service` → Folder: `tasks/refactor/ai-service/`

## Workflow by Task Type

| Task Type | Phases |
|-----------|--------|
| **New Feature** | Brainstorm → Research → Plan → Implement → Verify |
| **Bug Fix** | Research → Plan (brief) → Implement → Verify |
| **Small Change** | Research → Implement → Verify |

---

## Phase 0: Brainstorming (New Features Only)

**Goal**: Clarify requirements and choose the best approach BEFORE researching code.

**When to use**: Only for new features or significant changes. Skip for bug fixes and small changes.

### Process

#### Step 1: Understand the Idea
- Ask clarifying questions **one at a time**
- Prefer **multiple-choice questions** when possible
- Focus on: purpose, constraints, and success criteria

Example questions:
```
"¿El auto-publish debe funcionar solo cuando la app está abierta o también en background?"
  A) Solo con la app abierta (setTimeout en cliente)
  B) Background con cron job (requiere servidor)
  C) Ambos (híbrido)
```

#### Step 2: Explore Approaches
- Present **2-3 different approaches** with trade-offs
- Lead with the **recommended option** and explain why
- Let the user choose

#### Step 3: Validate Design
- Present the design in **chunks pequeños** (200-300 palabras)
- Validate each section before continuing

### Output

Create `tasks/<branch-name>/brainstorm.md`:

```markdown
# Brainstorm: <branch-name>

## Idea Original
[Lo que el usuario pidió]

## Preguntas y Respuestas
1. Q: [pregunta]
   A: [respuesta del usuario]

## Opciones Evaluadas
| Opción | Pros | Contras |
|--------|------|---------|
| A (elegida) | ... | ... |

## Decisión Final
[Enfoque elegido y por qué]

## Alcance Definido
- ✅ Incluido: [features]
- ❌ Excluido: [features para después - YAGNI]
```

---

## Phase 1: Research

**Goal**: Understand the problem and find existing patterns.

### Steps

1. **Understand the request** — What exactly needs to be done?
2. **Find existing patterns** — Search the codebase for similar implementations
3. **Identify affected files** — Which files will need changes?
4. **Check dependencies** — Are there related components or services?

### Output

Create `tasks/<branch-name>/research.md`:

```markdown
# Research: <branch-name>

## Request Summary
[What the user asked for in your own words]

## Existing Patterns Found
- [Pattern 1]: `path/to/file.ts` — [what it does]
- [Pattern 2]: `path/to/file.ts` — [what it does]

## Files to Modify
- `src/components/TweetCard.tsx` — [reason]
- `src/lib/ai.ts` — [reason]

## Dependencies/Considerations
- [Any blockers, questions, or things to clarify]

## Open Questions
- [Questions for the user before planning]
```

### Research Commands

```bash
# Find similar components
grep -r "ComponentName" src/ --include="*.tsx"

# Find store usage
grep -r "useAppStore" src/ --include="*.tsx"

# Find API patterns
grep -r "export async function" src/app/api/ --include="*.ts"

# Find type definitions
grep -r "interface" src/types/ --include="*.ts"
```

## Phase 2: Planning

**Goal**: Create a detailed implementation plan.

### Steps

1. **Read research.md** — Review findings
2. **Ask clarifying questions** — If scope is unclear
3. **Design the solution** — Based on existing patterns
4. **Break into steps** — Ordered implementation tasks

### Output

Create `tasks/<branch-name>/plan.md`:

```markdown
# Plan: <branch-name>

## State (update as you progress)
- **Done**: [completed items]
- **Now**: [current focus]
- **Next**: [upcoming items]
- **Blocked**: [blockers or open questions, if any]

## Objective
[Clear statement of what will be built]

## Approach
[High-level approach based on existing patterns]

## Implementation Steps

### Step 1: [Description]
- File: `path/to/file.ts`
- Changes: [specific changes]
- Pattern reference: `path/to/similar/file.ts`

### Step 2: [Description]
- File: `path/to/file.ts`
- Changes: [specific changes]

[...more steps...]

## Testing Plan
- [ ] Manual test: [scenario]
- [ ] Type check: `npx tsc --noEmit`
- [ ] Verify: [expected behavior]

## Rollback Plan
[How to undo if something goes wrong]
```

## Phase 3: Implementation

**Goal**: Execute the plan systematically.

### Steps

1. **Create a checklist** — From plan.md steps
2. **Implement one step at a time** — Commit mentally after each
3. **Follow existing patterns** — Copy/adapt, don't invent
4. **Group questions** — Ask at the end, not during

### Best Practices

- **One file at a time** — Complete each file before moving on
- **Test incrementally** — Verify each change works
- **Reference patterns** — Keep similar files open for reference
- **Preserve style** — Match existing code style exactly

## Phase 4: Verification

**Goal**: Confirm the implementation is correct and complete.

### Checklist

- [ ] All plan.md steps completed
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] `npm run dev` runs without issues
- [ ] Feature works as expected
- [ ] No regressions in related features
- [ ] Code follows project conventions

## Task Folder Structure

```
tasks/
└── <branch-name>/          # Matches git branch exactly
    ├── brainstorm.md       # Phase 0 output (new features only)
    ├── research.md         # Phase 1 output
    ├── plan.md             # Phase 2 output (includes State tracking)
    └── notes.md            # Optional: additional context
```

## Quick Reference

| Phase | Output | Key Question |
|-------|--------|--------------|
| Brainstorming | `brainstorm.md` | "What exactly are we building and why?" |
| Research | `research.md` | "What patterns exist?" |
| Planning | `plan.md` | "How will I build this?" |
| Implementation | Code changes | "Does this match the pattern?" |
| Verification | ✅ or fixes | "Does it work correctly?" |

---

## Prompt Improvement Workflow

Para mejorar el prompt de análisis de tweets basándote en datos reales:

### 1. Consultar Rechazos

```bash
node scripts/query-rejections.mjs
```

Output:
- Tweets rechazados agrupados por razón
- Contenido original y score
- Resumen de razones más frecuentes

### 2. Analizar Patrones

Buscar:
- **Rechazos manuales**: Qué rechaza el usuario que la IA aprobó
- **Falsos positivos**: Tweets con score alto pero rechazados
- **Temas off-topic**: Categorías que se cuelan

### 3. Actualizar Prompt

Archivo: `src/lib/db.ts` → `DEFAULT_CONFIG.aiSystemPrompt` (líneas ~243-395)

Secciones a modificar:
- `TIER 4` - Agregar nuevos criterios de rechazo
- `CONTENIDO OFF-TOPIC` - Expandir lista de temas
- `TWEETS VAGOS/GENÉRICOS` - Agregar ejemplos
- `EJEMPLOS DE TWEETS A RECHAZAR` - Usar casos reales

### 4. Verificar

Hacer scrape de prueba y revisar que:
- Los tweets problemáticos ahora se rechazan
- No se rechazaron tweets válidos (falsos negativos)
