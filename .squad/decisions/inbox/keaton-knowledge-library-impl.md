# Knowledge Library Implementation Decision

**Author:** Keaton  
**Date:** 2026-03-16  
**Context:** Issue #413, PR #431  
**Status:** Implemented, awaiting review  

## Decision

Implement Knowledge Library as **cold storage for substantial team documents with zero spawn impact**. Files in `.squad/knowledge/` are NEVER loaded at spawn time - agents discover and read them only when explicitly needed.

## Architecture

**Three-tier context loading:**

1. **Tier 1 (Hot):** Spawn context - loaded at every agent spawn (~50KB)
   - Agent charter, team roster, active decisions
   - Direct performance impact: every byte costs tokens and latency

2. **Tier 2 (Warm):** On-demand context - loaded when agent reads specific files
   - Skills in `.squad/skills/`
   - Reference docs agents request
   - Zero spawn impact, token cost only when read

3. **Tier 3 (Cold):** Knowledge Library - never loaded automatically
   - Architecture deep-dives, historical context, substantial documentation
   - Agents must explicitly search directory and read files
   - Zero spawn impact, zero cost unless actively used

## What We Built

### Directory Structure
- `.squad/knowledge/` - cold storage directory
- `.squad/knowledge/README.md` - explains directory purpose
- `.squad/knowledge/.gitkeep` - ensures directory is tracked by git

### Sample Knowledge Files (5 files, ~25KB total)
Demonstrate the pattern with real Squad knowledge:
- `keaton-context-loading-architecture.md` (5KB) - tiered context loading design
- `keaton-drop-box-pattern.md` (6.4KB) - shared file coordination pattern
- `mcmanus-docs-architecture.md` (6.8KB) - documentation structure and conventions
- `fenster-sdk-mode-patterns.md` (7.3KB) - SDK mode detection and build
- `hockney-testing-patterns.md` (9.2KB) - testing patterns and conventions

### File Convention
**Naming:** `{author}-{topic-slug}.md`

**Frontmatter:**
```yaml
---
title: Context Loading Architecture
author: keaton
tags: [architecture, context, spawn]
created: 2026-03-16
---
```

### Metrics Validation
**Script:** `scripts/knowledge-library-metrics.sh`

Tests three guarantees:
1. Zero spawn impact - no knowledge files in spawn templates
2. On-demand access - agents can read files when needed
3. Stress test - 100 files (440KB) with zero spawn impact

**Results:** All tests pass ✅

## Why This Works

### Zero Spawn Impact
- No modifications to spawn templates or agent charters
- No automatic file loading
- Directory is passive storage, not active context

### On-Demand Discovery
Agents follow this pattern:
1. Recognize knowledge gap ("I need to understand X")
2. List `.squad/knowledge/` directory
3. Infer relevance from semantic filenames
4. Read specific file(s)
5. Apply knowledge to task

### Semantic Naming
Filenames encode enough information for agents to find relevant files:
- `keaton-context-loading-architecture.md` → clearly about context and architecture
- `fenster-sdk-mode-patterns.md` → SDK mode expertise
- `hockney-testing-patterns.md` → testing knowledge

## Brady's Requirement Met

Brady approved #413 conditionally: "If we can prove this won't cause context bloat."

**Proof delivered:**
- ✅ Metrics script validates zero spawn impact
- ✅ Stress test with 100 files (440KB) - spawn unchanged
- ✅ On-demand access demonstrated
- ✅ No changes to spawn templates or core loading logic

This is not a promise - it's proven with automated validation.

## What This Is NOT

- **NOT** a replacement for decisions.md (use for choices and policies)
- **NOT** a replacement for skills/ (use for structured patterns)
- **NOT** for small snippets (minimum ~2KB per file)
- **NOT** automatically loaded (agents must explicitly read)

## Implementation Notes

### Runtime Feature, Not SDK Change
This is a **directory structure and skill documentation**, not TypeScript source changes.

**No changes to:**
- `squad.config.ts`
- `squad/` TypeScript source
- `squad.agent.md` spawn template

### Git Configuration
Files added with `git add -f` because `.squad/` is in git exclude patterns.

## Trade-offs Accepted

### Manual Discovery
Agents must know to check `.squad/knowledge/` when they need deep context. This is intentional - we want zero automatic loading.

**Mitigation:** Skill file (`.squad/skills/knowledge-library/SKILL.md`) documents the pattern.

### Linear Growth
Knowledge files accumulate over time. Unlike history.md (compacted at 12KB), knowledge files are never auto-pruned.

**Mitigation:** Deprecation pattern (prepend `[DEPRECATED YYYY-MM-DD]` to filename) rather than deletion. Historical context preserved.

### No Search Index
Current implementation uses directory listing and semantic naming, not search indexing.

**Future enhancement:** Optional index file for faster discovery if library grows to 100+ files.

## Future Enhancements (Not in Initial PR)

Potential improvements:
- Knowledge index file (optional, for faster discovery)
- Tagging system for cross-references
- Automatic deprecation detection (files not accessed in 6+ months)
- Knowledge file templates for common patterns

## Related Decisions

- Tiered context loading architecture (this decision)
- Drop-box pattern for coordination (knowledge file documents it)
- Spawn template design (zero modifications principle)

## Success Criteria

- ✅ Zero files loaded at spawn (validated by metrics script)
- ✅ On-demand access works (agents can read files)
- ✅ Stress test passes (100 files with zero spawn impact)
- ✅ Sample files demonstrate real knowledge (~25KB)
- ✅ Documentation explains the pattern (SKILL.md, README.md)
- ✅ PR created with proof (#431)

## Conclusion

Knowledge Library solves the context bloat problem with a simple architectural principle: **cold storage with on-demand access**. Files are never loaded automatically, agents discover and read them only when needed, and metrics prove zero spawn impact.

Brady's requirement for proof (not promises) is satisfied with automated validation.
