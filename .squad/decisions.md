# Decisions

> Team decisions that all agents must respect. Managed by Scribe.

---

## Foundational Directives (carried from beta, updated for Mission Control)

### Type safety — strict mode non-negotiable
**By:** CONTROL (formerly Edie)
**What:** `strict: true`, `noUncheckedIndexedAccess: true`, no `@ts-ignore` allowed.
**Why:** Types are contracts. If it compiles, it works.

### Hook-based governance over prompt instructions
**By:** RETRO (formerly Baer)
**What:** Security, PII, and file-write guards are implemented via the hooks module, NOT prompt instructions.
**Why:** Prompts can be ignored. Hooks are code — they execute deterministically.

### Node.js >=20, ESM-only, streaming-first
**By:** GNC (formerly Fortier)
**What:** Runtime target is Node.js 20+. ESM-only. Async iterators over buffers.
**Why:** Modern Node.js features enable cleaner async patterns.

### Casting — Apollo 13, mission identity
**By:** Squad Coordinator
**What:** Team names drawn from Apollo 13 / NASA Mission Control. Scribe is always Scribe. Ralph is always Ralph. Previous universe (The Usual Suspects) retired to alumni.
**Why:** The team outgrew its original universe. Apollo 13 captures collaborative pressure, technical precision, and mission-critical coordination — perfect for an AI agent framework.

### Proposal-first workflow
**By:** Flight (formerly Keaton)
**What:** Meaningful changes require a proposal in `docs/proposals/` before execution.
**Why:** Proposals create alignment before code is written.

### Tone ceiling — always enforced
**By:** PAO (formerly McManus)
**What:** No hype, no hand-waving, no claims without citations.
**Why:** Trust is earned through accuracy, not enthusiasm.

### Zero-dependency scaffolding preserved
**By:** Network (formerly Rabin)
**What:** CLI remains thin. Zero runtime dependencies for the CLI scaffolding path.
**Why:** Users should be able to run `npx` without downloading a dependency tree.

### Merge driver for append-only files
**By:** Squad Coordinator
**What:** `.gitattributes` uses `merge=union` for `.squad/decisions.md`, `agents/*/history.md`, `log/**`, `orchestration-log/**`.
**Why:** Enables conflict-free merging of team state across branches.

### Interactive Shell as Primary UX
**By:** Brady
**What:** Squad becomes its own interactive CLI shell. `squad` with no args enters a REPL.
**Why:** Squad needs to own the full interactive experience.

### No temp/memory files in repo root
**By:** Brady
**What:** No plan files, memory files, or tracking artifacts in the repository root.
**Why:** Keep the repo clean.

---

## Sprint Directives

### Secret handling — agents must never persist secrets
**By:** RETRO (formerly Baer), v0.8.24
**What:** Agents must NEVER write secrets, API keys, tokens, or credentials into conversational history, commit messages, logs, or any persisted file. Acknowledge receipt without echoing values.
**Why:** Secrets in logs or history are a security incident waiting to happen.

### Test assertion discipline — mandatory
**By:** FIDO (formerly Hockney), v0.8.24
**What:** All code agents must update tests when changing APIs. FIDO has PR blocking authority on quality grounds.
**Why:** APIs changed without test updates caused CI failures and blocked external contributors.

### Docs-test sync — mandatory
**By:** PAO (formerly McManus), v0.8.24
**What:** New docs pages require corresponding test assertion updates in the same commit.
**Why:** Stale test assertions block CI and frustrate contributors.

### Contributor recognition — every release
**By:** PAO, v0.8.24
**What:** Each release includes an update to the Contributors Guide page.
**Why:** No contribution goes unappreciated.

### API-test sync cross-check
**By:** FIDO + Booster, v0.8.24
**What:** Booster adds CI check for stale test assertions. FIDO enforces via PR review.
**Why:** Prevents the pattern of APIs changing without test updates.

### Doc-impact review — every PR
**By:** PAO, v0.8.25
**What:** Every PR must be evaluated for documentation impact. PAO reviews PRs for missing or outdated docs.
**Why:** Code changes without doc updates lead to stale guides and confused users.

---

## Release v0.8.24

### CLI Packaging Smoke Test: Release Gate Decision
**By:** FIDO, v0.8.24  
**Date:** 2026-03-08

The CLI packaging smoke test is APPROVED as the quality gate for npm releases.

**What:**
- npm pack → creates tarball of both squad-sdk and squad-cli
- npm install → installs in clean temp directory (simulates user install)
- node {cli-entry.js} → invokes 27 commands + 3 aliases through installed package
- Coverage: All 26 primary commands + 3 of 4 aliases (watch, workstreams, remote-control)

**Why:** Catches broken package.json exports, MODULE_NOT_FOUND errors, ESM resolution failures, command routing regressions — the exact failure modes we've shipped before.

**Gaps (acceptable):**
- Semantic validation not covered (only routing tested)
- Cross-platform gaps (test runs on ubuntu-latest only)
- Optional dependencies allowed to fail (node-pty)

**Result:** ✅ GO — v0.8.24 release approved. 32/32 tests pass.

---

### CLI Release Readiness Audit — v0.8.24
**By:** EECOM  
**Date:** 2026-03-08

Definitive CLI completeness audit confirms all commands work post-publish.

**What:**
- 26 primary commands routed, all tested ✅
- 4 aliases routed (watch, workstreams, remote-control, streams) — 3 tested, 1 untested
- Tarball: 318 files, bin entry correct, postinstall script functional
- ESM runtime patch verified for Node 24+ compatibility
- All tests pass: 32/32 (36s runtime)

**Gaps (non-blocking):**
- `streams` alias routed but not smoke-tested (same code path as tested `subsquads` — low risk)

**Result:** ✅ SHIP IT — 95% confidence. CLI production-ready for v0.8.24.

---

*Fresh start — Mission Control rebirth, 2026-03-08. Previous decisions archived.*

---

## SDK Init Shore-Up Initiative (2026-03-11)

### Phase-Based SDK Quality Improvement Program

**By:** Flight  
**Date:** 2026-03-11  
**Affects:** EECOM, CAPCOM, FIDO, Procedures

SDK initialization produces incomplete state (config sync broken, built-in members missing, CastingEngine bypassed). Implement 3-phase approach prioritizing foundational gaps before comprehensive testing.

**What:**
1. **Phase 1 (P1):** Fix foundational gaps — config sync, Ralph inclusion, @copilot roster entry
2. **Phase 2 (P1):** Wire CastingEngine into CLI init flow (restore universe curation quality)
3. **Phase 3 (P2):** Exercise full test matrix (29 untested features → 100% SDK feature parity)

**Why this order:**
- Config sync must work before CastingEngine templates can rely on it
- Stable init flow required before systematic feature verification
- Phases 1-2 unblock SDK consumers immediately (Phase 3 is verification)

**Ownership:**
- **EECOM + CAPCOM:** Phases 1-2 (estimated 2 sprints)
- **FIDO + CAPCOM:** Phase 3 (estimated 2 sprints)
- **Procedures:** Partner on Phase 2 (universe template quality)

**Success Criteria:**
- Phase 1: All members (user-added, Ralph, @copilot) in `squad.config.ts` without manual edits
- Phase 2: 90%+ init runs use curated templates (Apollo 13/Usual Suspects)
- Phase 3: 100% SDK feature parity

Full PRD: `.squad/identity/prd-sdk-init-shoreup.md`

---

### CastingEngine is the canonical casting system

**By:** CAPCOM  
**Date:** 2026-03-11  

All team casting flows (CLI init, REPL auto-cast, manual casting) must use `CastingEngine.castTeam()`.

**What:** Consolidate casting logic to avoid duplication of personality/role-matching. Use structured character data (personality, backstory, role) from universe templates instead of generic role-based personalities.

**Why:** SDK already ships with CastingEngine — we should use it. Provides rich, themed characters instead of generic roles. Avoids duplication of casting logic across CLI and REPL.

**Impact:** Requires refactoring `cli/core/cast.ts:personalityForRole()` and wiring coordinator universe selection to CastingEngine templates.

---

### squad.config.ts is the source of truth for SDK-mode projects

**By:** CAPCOM  
**Date:** 2026-03-11  

When `squad.config.ts` exists, it is the canonical team roster. Markdown files (.squad/team.md, routing.md) are **generated output** from `squad build`.

**What:** TypeScript config enables type-checking, validation, and better tooling. Markdown is regenerated from config during build.

**Why:** Having two sources of truth (config + markdown) creates sync bugs. One source enables automated consistency.

**Impact:**
- `squad build` regenerates markdown from config
- REPL init flow writes squad.config.ts after casting
- Manual team.md edits in SDK mode trigger a warning (suggest `squad migrate --to sdk`)

---

### Ralph is a required built-in agent, always included

**By:** CAPCOM  
**Date:** 2026-03-11  

Ralph (Work Monitor) is added automatically during init, just like Scribe.

**What:** Ralph is a core framework component (work queue tracking, keep-alive monitoring). Include Ralph in both CLI init and REPL auto-cast flows.

**Why:** Ralph is a core team member, not an optional add-on. Should be present in every Squad project.

**Impact:** Add Ralph to the hardcoded agents array in `cli/core/init.ts` (both SDK init and REPL paths).

---

### SDK Init Implementation Priority Order

**By:** EECOM  
**Date:** 2026-03-11  

Prioritize squad.config.ts sync fixes over new commands. Implement in this order:

1. **Fix 1 — squad.config.ts sync utility** (regex-based, upgrade to AST if edge cases arise)
2. **Fix 2, 7 — Ralph in CLI init + REPL init with prompt**
3. **Fix 6 — CastingEngine integration** (augment LLM proposals with structured character data, don't replace LLM)
4. **Fix 3, 4, 5 — hire/remove commands, @copilot flag** (polish, lower priority)

**Why:** squad.config.ts sync is load-bearing for the rest. Ralph fixes are quick wins completing a half-implemented feature. CastingEngine is high-value but medium-risk. Hire/remove/flags are polish.

**Open Questions:**
- AST vs Regex for config parsing: Start with regex, upgrade if edge cases arise
- CastingEngine augment vs replace: Keep LLM for flexibility, use CastingEngine to enrich proposals
- Ralph always-on vs opt-in: Make Ralph always-included

**Reference:** Full roadmap at `.squad/identity/sdk-init-implementation-roadmap.md`
