# CLAUDE.md — Agent Harness for atoms-demo

Operating rules and guardrails for AI agents. Obey hard rules unconditionally.

---

## System Overview

**atoms-demo** is an agentic app builder platform. Users describe an app idea, and an AI team (Orchestrator, PM, Engineer, Designer, Arbiter) generates it live with streaming preview.

**Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS v4, Supabase (optional), Anthropic/OpenAI APIs
**Architecture**: Layered — API Routes → Services → Repositories → Storage (Supabase or in-memory)

---

## Hard Rules

### MUST

- **Type hints** on ALL functions — TypeScript strict mode, no `any` unless absolutely necessary
- **Run `./scripts/validate.sh`** before declaring any task complete
- **Read `docs/memory/short-term.md`** before starting any task
- **Respect dependency flow**: API Routes → Services → Repositories — never reverse
- **Repository pattern** for all data access — never raw Supabase calls in services or routes
- **Write tests** for new functionality — match existing patterns in `src/__tests__/`
- **Update `docs/`** in the same PR as code changes (see Documentation Gate below)
- **Keep agents stateless** — agent orchestration must not store state between requests
- **SSE for streaming** — all agent responses stream via Server-Sent Events

### MUST NOT

- **Suppress type errors** — no `@ts-ignore`, `as any`, or `// @ts-expect-error` without justification
- **Reverse dependencies** — never import from API layer in Services, or Services in Repositories
- **Commit secrets** — never commit `.env.local`, API keys, tokens, or credentials
- **Skip validation** — never claim work is done without running `./scripts/validate.sh`
- **Break mock mode** — the app must always work without Supabase or AI API keys
- **Modify generated code format** — Engineer agent must always output `\`\`\`html ... \`\`\`` blocks
- **Delete or skip failing tests** to make a PR pass

---

## Architecture

```
src/
├── app/                    # API Layer (Next.js App Router)
│   ├── api/                # REST endpoints
│   │   ├── auth/           # Authentication
│   │   ├── generate/       # SSE agentic generation (core)
│   │   └── projects/       # Project CRUD
│   ├── dashboard/          # Project management UI
│   ├── login/register/     # Auth pages
│   └── workspace/[id]/     # Main workspace (chat + preview)
│
├── lib/                    # Business Logic Layer
│   ├── agents/             # Agent System
│   │   ├── orchestrator.ts # Agentic pipeline: Orch → PM → Eng → Des → Arb
│   │   └── llm.ts          # LLM provider abstraction (Anthropic/OpenAI/mock)
│   ├── services/           # Service Layer (business logic)
│   ├── repositories/       # Data Access Layer (Supabase + memory fallback)
│   ├── storage/            # In-memory store for demo mode
│   ├── tools/              # Tool Registry (extensible agent capabilities)
│   ├── supabase.ts         # DB client with config detection
│   └── types.ts            # Core type definitions
│
├── components/             # Shared UI Components
│   ├── ChatPanel.tsx       # Agent conversation with SSE streaming
│   ├── PreviewPanel.tsx    # Live iframe preview + code view
│   └── AgentMessage.tsx    # Individual agent message bubble
│
└── __tests__/              # Test suite
```

### Dependency Flow (ENFORCED)

```
API Routes → Services → Repositories → Storage (Supabase | Memory)
     ↓
  Agents → LLM Providers (Anthropic | OpenAI | Mock)
     ↓
   Tools → Tool Registry
```

### Key Data Flows

1. **Auth**: Client → `/api/auth` → AuthService → UserRepository → Storage
2. **Projects**: Client → `/api/projects` → ProjectService → ProjectRepository → Storage
3. **Generation**: Client → `/api/generate` (SSE) → Orchestrator → [PM → Engineer → Designer] → LLM → Stream back
4. **Preview**: Generated HTML → iframe `srcDoc` rendering

### Multi-Provider Strategy

The app uses a strategy pattern for both storage and AI:
- **Storage**: `isSupabaseConfigured()` → Supabase or MemoryStore
- **AI**: `ANTHROPIC_API_KEY` → Claude, `OPENAI_API_KEY` → GPT-4o, neither → Mock mode
- Mock mode provides realistic responses for demo without any external dependencies

---

## Gates (Verification Checkpoints)

### Gate 0: Pre-Work Context Load

Before starting ANY task:
1. **Read `docs/memory/short-term.md`** — check Active Work and Don't Touch
2. **Read `docs/memory/long-term.md`** — understand conventions and gotchas

### Gate 1: Architecture Compliance

Before writing code:
- Verify change respects dependency flow: **API → Services → Repositories**
- New tools must be registered in `src/lib/tools/registry.ts`
- New agents must follow the orchestrator pipeline pattern
- All UI components go in `src/components/`

### Gate 2: Validation (MANDATORY before done)

```bash
./scripts/validate.sh          # Auto-fix mode (formats, lints, type-checks, builds)
./scripts/validate.sh --check  # CI mode (check only, no modifications)
```

### Gate 3: Documentation

Update docs in the **same PR** as code changes:

| Changed | Update |
|---------|--------|
| Architecture or behavior | `docs/state/architecture.md` |
| Started new work | `docs/memory/short-term.md` — add to Active Work |
| Completed work | `docs/records/YYYY-MM-DD-description.md` |
| Discovered gotcha | `docs/memory/long-term.md` — add with rationale |
| Architectural decision | `docs/decisions/NNN-title.md` — create ADR |

### Gate 4: Testing

- New features need tests in `src/__tests__/`
- Run `pnpm test` to verify
- CI will block PRs with failing tests

---

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server

# Validation
./scripts/validate.sh       # Auto-fix + check everything
./scripts/validate.sh --check  # CI mode (no modifications)

# Testing
pnpm test                   # Run test suite
pnpm test:watch             # Watch mode

# Linting
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript strict check
```

---

## Environment Variables

```bash
# Optional — app works without any of these (mock mode)
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
ANTHROPIC_API_KEY=             # Anthropic Claude API key
OPENAI_API_KEY=                # OpenAI API key (alternative)
AI_PROVIDER=                   # "anthropic" (default) or "openai"
```

---

## Coding Discipline

Behavioral guidelines to reduce common mistakes. Merge with task-specific context as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Self-Healing Principles

This project is designed to be AI-native and self-healing:

1. **Auto-fix on CI**: The CI pipeline auto-formats and auto-fixes lint issues on PRs
2. **Mock fallback**: If external services fail, the app degrades gracefully to mock mode
3. **Memory system**: AI agents read `docs/memory/` before every task to stay context-aware
4. **Validation gate**: No work is "done" until `validate.sh` passes
5. **Architecture enforcement**: Dependency flow violations are caught at lint time
6. **Type safety**: Strict TypeScript catches errors at compile time, not runtime
