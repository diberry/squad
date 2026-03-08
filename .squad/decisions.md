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

---

*Fresh start — Mission Control rebirth, 2026-03-08. Previous decisions archived.*
