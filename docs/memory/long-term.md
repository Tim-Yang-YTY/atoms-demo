# Long-Term Memory

Institutional knowledge for the atoms-demo codebase. Every entry has a rationale.

Last curated: 2026-04-18

---

## Conventions

### Code Style

- All functions must have **TypeScript type annotations** — enforced by strict mode
- Use Next.js App Router conventions (server components by default, `"use client"` when needed)
- Enforce dependency flow: **API Routes → Services → Repositories** — architecture boundary
- Format with Prettier via ESLint, type check with `tsc --noEmit`

### Architecture Patterns

- **Repository pattern** for all data access — because it enables the Supabase/memory dual-provider strategy
- **Service layer** for business logic — because routes should be thin, logic should be testable
- **Tool registry** for agent capabilities — because tools must be extensible without modifying agents
- **Strategy pattern** for providers — because the app must work with zero external dependencies (mock mode)
- **SSE for streaming** — because token-by-token streaming provides the best UX for code generation

### Agent System

- Agents are **stateless** — because serverless functions don't persist memory between invocations
- Pipeline order is **PM → Engineer → Designer** — because each agent builds on the previous output
- Engineer agent must output code in `` ```html `` blocks — because the orchestrator extracts code via regex
- Mock mode must produce a **complete, functional app** — because this is the demo experience without API keys

### Data Access

- All repositories check `isSupabaseConfigured()` first — because the memory fallback must be transparent
- Memory store uses a singleton Map — because Next.js dev server shares the same process across requests
- On Vercel (serverless), memory store resets per cold start — this is acceptable; use Supabase for persistence

---

## Anti-Patterns

- **Never** import from API routes in services or repositories (dependency flow violation)
- **Never** call Supabase directly from services — always go through repositories
- **Never** use `any` type without explicit justification in a comment
- **Never** break mock mode — the app must always be runnable with zero configuration
- **Never** store secrets in code or commit `.env.local`

---

## Gotchas

- **Supabase client initialization**: Uses placeholder URL/key at build time to avoid build errors; `isSupabaseConfigured()` gates all actual DB calls
- **Tailwind v4**: Configuration is in CSS (`@theme inline`), not in `tailwind.config.ts` — don't create a config file
- **SSE in Next.js**: Must return `new Response(ReadableStream)` with proper headers, not `NextResponse`
- **iframe sandbox**: Preview iframe needs `allow-scripts allow-same-origin` for generated apps to work
- **Memory store singleton**: Works in dev (single process) but NOT in serverless (each invocation is isolated)
