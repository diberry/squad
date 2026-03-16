---
name: "knowledge-library"
description: "Guidelines for using .squad/knowledge/ to store team-wide research, analysis, and contextual knowledge"
domain: "team-workflow, documentation"
confidence: "high"
source: "architectural decision (Flight, 2026-03-11)"
---

## Context

Squad teams produce research, analysis, and contextual knowledge that should be shared team-wide but doesn't fit into:
- **`history.md`** — personal, compacted at ~12KB
- **`decisions.md`** — choices/policies only, not analysis
- **`skills/`** — structured patterns, not freeform content
- **`wisdom.md`** — manually curated patterns/anti-patterns, not contextual knowledge

`.squad/knowledge/` provides a permanent, freeform, team-wide storage tier for this content.

## Patterns

### When to Write Knowledge Files

**DO write to `.squad/knowledge/` when:**
- Conducting deep research/analysis relevant to the team (architecture mapping, docs audit, ecosystem survey)
- Documenting contextual knowledge (why a decision was made, historical incident, system evolution)
- Producing reference material (decision rationale with examples, pattern catalog, onboarding guide)
- Answering "Why is this the way it is?" for future agents

**DON'T write to `.squad/knowledge/` for:**
- **Decisions** → use `.squad/decisions/inbox/`
- **Reusable patterns** → use `.squad/skills/`
- **Personal learnings** → use `.squad/agents/{name}/history.md`
- **Temporary notes** → session artifacts only (e.g., `~/.copilot/session-state/`)

### File Naming Convention

```
.squad/knowledge/{author}-{topic-slug}.md
```

**Examples:**
- `.squad/knowledge/flight-adoption-tracking-architecture.md`
- `.squad/knowledge/pao-docs-audit-2026-03.md`
- `.squad/knowledge/eecom-runtime-event-bus-consolidation.md`

### File Format (Recommended)

```markdown
---
author: {agent-name}
topic: {brief-description}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
tags: [tag1, tag2, tag3]
---

# {Title}

## Context
{Why this knowledge exists. What problem/question does it address?}

## Summary
{TL;DR — key takeaways in 2-3 sentences}

## Details
{Freeform content — analysis, research, findings, maps, examples}

## Related
- `.squad/knowledge/{related-file}.md`
- `.squad/decisions.md` — {relevant decision}
```

### Lifecycle Rules

**Creation:**
- Any agent can create during normal work
- No approval required (trust-based)

**Updates:**
- Original author may update their own files (add sections, correct info)
- If another agent needs to extend/correct, they may:
  - Add a new section with their name attribution
  - OR create a new knowledge file and cross-reference

**Deprecation:**
- If knowledge becomes stale/incorrect, prepend `[DEPRECATED YYYY-MM-DD]` to title
- Explain why in first paragraph
- Do NOT delete (preserves history, prevents link rot)

**Size:**
- Soft limit: ~5KB per file recommended
- If growing beyond ~10KB, consider:
  - Splitting by sub-topic
  - Extracting patterns to `skills/`
  - Moving decisions to `decisions/inbox/`

### Reading Knowledge Files

**As an agent:**
- Check `.squad/knowledge/` when starting work on a topic you're unfamiliar with
- Use grep to find files by keyword: `grep -l "adoption" .squad/knowledge/*.md`
- Read the full file if the topic is directly relevant; skim the Summary section if checking context

**As the coordinator:**
- Suggest knowledge files during routing when context is relevant:
  ```
  "PAO, document the adoption feature. See `.squad/knowledge/flight-adoption-tracking-architecture.md` for design rationale."
  ```

### Relationship to Other Storage

| Storage | Scope | Use When |
|---------|-------|----------|
| `history.md` | Personal | Personal learnings, patterns you'll reuse in YOUR work |
| `decisions.md` | Team | Choices, policies, directives that constrain future work |
| `skills/` | Team | Reusable patterns (structured format) |
| `wisdom.md` | Team | Distilled patterns/anti-patterns (manual curation) |
| `knowledge/` | Team | Research, analysis, context (freeform, written during work) |

## Examples

### Example 1: Architecture Research

**Scenario:** Flight researches adoption tracking and designs a three-tier opt-in system.

**Action:** Create `.squad/knowledge/flight-adoption-tracking-architecture.md`

**Content:**
```markdown
---
author: flight
topic: adoption-tracking-architecture
created: 2026-03-10
tags: [adoption, privacy, architecture]
---

# Adoption Tracking — Three-Tier Opt-In Architecture

## Context
Squad needs to track adoption growth without violating privacy. GitHub code search finds repos using Squad, but listing individual repos without consent is a privacy violation (per Brady's directive).

## Summary
Three-tier system: (1) Aggregate-only metrics (ship now), (2) Opt-in registry (design next), (3) Public showcase (launch when ≥5 opt-ins). Privacy-first: code search results are public data, but individual listings require consent.

## Details
[... full analysis, design rationale, decision tree, examples ...]

## Related
- `.squad/decisions.md` — "No individual repo listing without consent"
```

**Benefit:** PAO, Network, and other agents can read this when working on adoption features instead of re-deriving the architecture.

### Example 2: Docs Audit

**Scenario:** PAO audits the docs structure and identifies 12 gaps in coverage.

**Action:** Create `.squad/knowledge/pao-docs-audit-2026-03.md`

**Content:**
```markdown
---
author: pao
topic: docs-coverage-audit
created: 2026-03-15
tags: [documentation, audit, gaps]
---

# Docs Coverage Audit — March 2026

## Context
Squad's docs are growing rapidly post-rebirth. This audit identifies coverage gaps to prioritize future doc work.

## Summary
12 gaps found: 5 high-priority (CLI commands missing docs), 4 medium (feature guides incomplete), 3 low (advanced patterns undocumented). Recommend creating issues for high/medium gaps.

## Details
### High Priority Gaps
1. `squad preview` command — no docs, no examples
2. Spawn template customization — mentioned but not documented
[... full list with examples ...]

## Related
- Issues created: #601, #602, #603, #604, #605
```

**Benefit:** Flight and FIDO can reference this audit when prioritizing doc work. PAO doesn't need to repeat the audit next quarter — just update the file.

### Example 3: Historical Context

**Scenario:** EECOM consolidates two event buses into one. Future agents need to understand why.

**Action:** Create `.squad/knowledge/eecom-runtime-event-bus-consolidation.md`

**Content:**
```markdown
---
author: eecom
topic: event-bus-consolidation
created: 2026-02-22
tags: [architecture, runtime, refactoring]
---

# Why Squad Has One Event Bus (Runtime EventBus)

## Context
Squad v0.8.x shipped with TWO event buses: `client/event-bus.ts` (dot-notation) and `runtime/event-bus.ts` (colon-notation). This caused confusion and API inconsistency.

## Summary
Consolidated to `runtime/event-bus.ts` as the canonical bus (colon-notation, error isolation). `client/event-bus.ts` remains for backward-compat but is deprecated. Future code should use runtime EventBus only.

## Details
### Why Two Buses Existed
[... historical context, migration story ...]

### Why Runtime EventBus Won
[... decision criteria, error isolation benefit ...]

## Related
- `.squad/decisions.md` — "Runtime EventBus as canonical bus"
```

**Benefit:** When a new agent (or Brady) asks "Why do we have two event buses?", they read this file instead of asking the team.

## Anti-Patterns

- ❌ Writing decisions to knowledge/ (use `decisions/inbox/`)
- ❌ Writing reusable patterns to knowledge/ (use `skills/`)
- ❌ Writing personal learnings to knowledge/ (use `history.md`)
- ❌ Creating knowledge files for every PR (only for team-relevant research/analysis)
- ❌ Deleting stale knowledge files (deprecate instead)
- ❌ Writing >10KB files (split by sub-topic)
- ❌ Duplicating content across knowledge files (cross-reference instead)
- ❌ Writing without context/summary (future readers need TL;DR)
