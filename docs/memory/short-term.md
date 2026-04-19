# Short-Term Memory

Current project context. Read this before starting any work.

Last updated: 2026-04-18

---

## Active Work

- **Initial release** (started 2026-04-18) — Core platform with agentic code generation, auth, project management, live preview. Mock mode fully functional. Supabase integration ready but optional.

## Recently Landed

- 2026-04-18: Initial implementation complete
  - Agentic orchestration (Orch → PM → Eng → Des → Arb)
  - SSE streaming for real-time generation
  - Layered architecture (API → Services → Repositories)
  - In-memory storage fallback (works without Supabase)
  - Auth flow (register/login)
  - Template gallery (6 templates)
  - Live preview with code export

## Don't Touch (fragile / in-progress)

- `src/lib/agents/llm.ts` mock responses — the MOCK_APP_CODE constant contains the demo expense tracker; changes break the demo flow
- `src/lib/storage/memory-store.ts` — singleton pattern required for data persistence across API calls in dev mode

## Upcoming

- Supabase persistent storage for production deployment
- Real AI generation with Anthropic Claude API key
- Iterative refinement (chat to modify generated apps)
- Version history for generated code
- Mobile responsive improvements
