---
title: Drop Box Pattern — Shared File Architecture
author: keaton
tags: [architecture, patterns, coordination, file-structure]
created: 2026-03-16
---

# Drop Box Pattern — Shared File Architecture

## Problem Statement

Multi-agent teams need to coordinate work across sessions and agents. Challenges:
- Agents spawn independently and can't pass data in-memory
- Multiple agents may need to read or append to the same files
- Coordination without centralized state management
- Avoid merge conflicts and concurrent write issues

## Solution: Drop Box Pattern

The Drop Box Pattern uses shared append-only files as coordination primitives. Each file acts as a "drop box" where agents write data and others read it.

## Core Principle

**Append-only, union-merge semantics**

Files configured with git merge driver `union` automatically merge concurrent writes by appending both versions. No conflicts, no overwrite races.

## Implementation

### 1. Configure Git Merge Driver

In `.gitattributes`:
```
.squad/decisions.md merge=union
.squad/agents/*/history.md merge=union
.squad/decisions/inbox/*.md merge=union
```

This tells git: "When merging these files, append both sides rather than conflict."

### 2. File Structure Convention

Drop box files typically use:
- **Chronological ordering** (newest at top, with timestamps)
- **Clear boundaries** (markdown horizontal rules, blank lines)
- **Agent attribution** (each entry signed by author)

Example:
```markdown
## 2026-03-16 — Keaton
[Content]

---

## 2026-03-15 — McManus
[Content]
```

### 3. Write Pattern

Agents write to drop boxes by:
1. Reading current file state
2. Appending new entry at top (or bottom, depending on convention)
3. Committing with clear message
4. Pulling and merging (union merge handles conflicts)
5. Pushing

No coordination needed — git handles concurrent writes.

## Squad's Drop Boxes

### Primary Drop Boxes

| File | Purpose | Write Pattern |
|------|---------|---------------|
| `.squad/decisions.md` | Team decisions | Scribe merges from inbox |
| `.squad/agents/*/history.md` | Agent learnings | Agent appends own history |
| `.squad/decisions/inbox/*.md` | Pending decisions | Agents write, Scribe merges |
| `.squad/team.md` | Team roster | Lead updates roster |

### Inbox Pattern

The **inbox** is a special drop box variant:
- Multiple agents write individual files to `inbox/`
- Scribe agent periodically merges inbox files into canonical file
- Inbox files deleted after merge
- Prevents monolithic file bloat

Example flow:
1. Keaton writes `.squad/decisions/inbox/keaton-knowledge-library.md`
2. Scribe reads inbox, merges into `.squad/decisions.md`
3. Scribe deletes `keaton-knowledge-library.md`
4. Single source of truth maintained

## Advantages

### No Coordination Overhead
Agents don't need to:
- Check locks
- Wait for exclusive access
- Coordinate write timing
- Handle retry logic

Just write and push. Git handles the rest.

### Git-Native
Works with standard git workflows:
- PRs review changes normally
- History shows who wrote what
- Revert works as expected
- Branching and merging work

### Human-Readable
All drop boxes are plain markdown. Humans can:
- Read them directly on GitHub
- Edit manually if needed
- Review diffs in PRs

## Design Trade-offs

### Advantages
✅ Simple — no database, no coordination service  
✅ Git-native — leverages existing infrastructure  
✅ Append-only — no data loss from concurrent writes  
✅ Auditable — full history in git log  

### Limitations
⚠️ Order not guaranteed — concurrent appends may interleave  
⚠️ No transactions — can't atomically update multiple files  
⚠️ Linear growth — files grow over time (mitigated by inbox pattern and periodic compaction)  
⚠️ Merge driver required — needs .gitattributes configuration  

## Anti-Patterns

### ❌ Using Drop Boxes for Frequent Updates
Drop boxes are for coordination, not high-frequency data.

**Bad:** Agent writes status update every 10 seconds to history.md  
**Good:** Agent writes summary to history.md at end of session

### ❌ Large Payloads
Drop boxes are for metadata and summaries, not large data.

**Bad:** Write 100KB JSON blob to drop box  
**Good:** Write file path reference, store data in separate file

### ❌ Assuming Ordering
Concurrent writes may interleave in unpredictable order.

**Bad:** Depend on "Keaton's entry comes before McManus's entry"  
**Good:** Include timestamps, read all entries, sort by timestamp

### ❌ Forgetting Union Merge
If you create a new drop box file, configure it in .gitattributes.

**Bad:** Create `.squad/new-drop-box.md`, forget .gitattributes, get merge conflicts  
**Good:** Add `new-drop-box.md merge=union` to .gitattributes

## Comparison to Alternatives

| Approach | Coordination | Complexity | Auditability |
|----------|-------------|------------|--------------|
| Drop Box Pattern | None (git merges) | Low | High (git log) |
| Database | Explicit locks | High | Medium (query logs) |
| Message Queue | Queue consumer | Medium | Low (ephemeral) |
| Shared Memory | Process coordination | High | None |

## Real-World Example: Decisions Workflow

1. **Flight** works on adoption tracking, makes architectural decision
2. Flight writes `.squad/decisions/inbox/flight-adoption-privacy.md`
3. Flight commits and pushes

Meanwhile:

4. **McManus** works on docs, makes editorial decision
5. McManus writes `.squad/decisions/inbox/mcmanus-doc-tone.md`
6. McManus commits and pushes

Later:

7. **Scribe** runs periodic merge
8. Scribe reads both inbox files
9. Scribe merges content into `.squad/decisions.md` (chronological order)
10. Scribe deletes inbox files
11. Single source of truth updated, no conflicts

## Related Patterns

- **Inbox Pattern** — variant of drop box with staging area
- **Append-Only Log** — immutable event stream (drop boxes allow compaction)
- **CRDT (Conflict-Free Replicated Data Type)** — similar conflict resolution, more complex

## Future Enhancements

Potential improvements:
- Automatic compaction (archive entries older than 6 months)
- Structured formats (YAML frontmatter for indexing)
- Cross-references (link entries across drop boxes)
- Schema validation (ensure entries match expected format)
