## 📌 Architecture Decision: Hybrid Retrieval + SLM

**Decision:** Hybrid approach — retrieval first, SLM as progressive enhancement.

**PR 1 (MVP — in progress):**
- Build-time embedding pipeline: `@xenova/transformers` with `all-MiniLM-L6-v2`
- Docs → chunks → vectors → static JSON (served from GitHub Pages)
- Client-side `SemanticSearch.astro` component: cosine similarity in browser
- Results show relevant doc chunks with source links
- No server, no API keys, no runtime dependencies

**PR 2 (follow-up — SLM enhancement):**
- "Summarize" button loads Phi-3-mini via WebLLM on demand (~600MB)
- Feeds retrieved chunks as context, streams natural language answer
- WebGPU required — graceful fallback to retrieval-only on unsupported browsers
- Progressive: SLM is additive, not required

**Why hybrid:**
1. Instant value — vector search returns chunks in <100ms
2. Zero mandatory download — SLM only loads on user request
3. Works everywhere — retrieval on any device, SLM on WebGPU browsers
4. Least risk — retrieval works even if SLM fails
5. Iterative — two clean PRs instead of one monster

**NOT in MVP:** LLM API calls, cloud vector DB, server-side processing, user API keys.
