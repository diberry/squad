# Decision: squad rc Documentation Pattern — Source-First, No Hype

**By:** McManus (DevRel)  
**Date:** 2026-03-13  
**Context:** Brady requested comprehensive documentation for `squad rc` (ACP passthrough remote control mode). Existing `docs/features/remote-control.md` covered `squad start` (PTY mirror) but barely mentioned `squad rc`.

## What I Decided

Created standalone `docs/features/squad-rc.md` (15.7 KB) following a **source-first** documentation pattern:

1. **Read ALL source code FIRST** before writing any documentation
2. **Every claim must be traceable to actual code** (line numbers cited for security layers, defaults, architecture)
3. **No copying from related docs** — write fresh based on implementation reality
4. **Comparison tables when commands overlap** — users need to know when to use which
5. **Troubleshooting from actual error handling** — derive common issues from spawn errors, devtunnel checks, WebSocket auth in source

## Why This Matters

**Prevents documentation drift.** Docs written from code (not from intuition or prior docs) stay accurate. When implementation changes, we know exactly which docs to update.

**Builds trust through precision.** Every security claim ("7 layers") is traceable to source code line numbers. No hand-waving, no invented features.

**Reduces support burden.** Troubleshooting section derived from actual error handling means users get real solutions, not guesses.

## Pattern Applied

### Before Writing
- Read `rc.ts` (297 lines), `rc-tunnel.ts` (140 lines), `bridge.ts` (300+ lines), `protocol.ts` (100 lines)
- Noted defaults, error messages, startup timing, security checks
- Identified key differentiators (ACP passthrough vs. PTY mirror)

### During Writing
- Architecture diagram traced to message flow in `rc.ts` (line 182-231)
- Security layers documented with code citations (bridge.ts line 47, 123-128, 112-120, 97-107, etc.)
- Troubleshooting issues derived from error handling (spawn ENOENT, devtunnel check line 238-242, MCP loading comment line 191)
- Defaults verified (port 0, maxHistory 500, session TTL 4h, ticket TTL 60s)

### After Writing
- Updated `remote-control.md` with callout pointing to new doc
- Registered `squad-rc` in `docs/build.js` features section ordering
- Verified docs build (93 pages generated, `squad-rc.html` exists)

## Scope

**Applies to:** All feature documentation in `docs/features/`

**Does NOT apply to:**
- Blog posts (narrative voice allowed)
- Getting started guides (simplified examples encouraged)
- Internal notes (`.squad/agents/*/history.md`)

## Future Work

This pattern should extend to:
- `squad start` (rewrite with source citations, remove duplication)
- `squad init` (CLI wiring in cli-entry.ts should be documented)
- Any new CLI command (read source first, write from implementation)

## Key Quote from Charter

> Tone ceiling: ALWAYS enforced — no hype, no hand-waving, no claims without citations. Every public-facing statement must be substantiated.

This decision operationalizes that principle for feature docs.
