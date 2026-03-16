---
title: Context Loading Architecture
author: keaton
tags: [architecture, context, spawn, performance]
created: 2026-03-16
---

# Context Loading Architecture

## Problem Statement

Agents need context to work effectively, but loading too much context at spawn creates two problems:
1. **Token waste** — costs money on every agent spawn
2. **Latency** — slows down agent startup and time-to-first-response

We need a system that provides rich institutional knowledge without bloating spawn templates.

## Solution: Tiered Context Loading

Squad uses a three-tier context loading architecture:

### Tier 1: Spawn Context (Hot)
Files loaded at **every** agent spawn. Keep this minimal (~50KB total).

**What goes here:**
- Agent charter (identity, role, style)
- Active decisions (decisions.md)
- Current mission brief or task context
- Team roster (team.md)

**Performance impact:** Direct. Every byte here costs tokens and adds latency.

**Location:** Referenced in spawn template, loaded by Copilot runtime

### Tier 2: On-Demand Context (Warm)
Files loaded **when needed** via explicit agent action or coordinator routing.

**What goes here:**
- Skill files in `.squad/skills/` — agents read specific skills when relevant
- Reference files agents request — "read X to understand Y"
- Tool documentation — MCP tool schemas

**Performance impact:** Zero at spawn. Token cost only when agent explicitly reads the file.

**Location:** `.squad/skills/`, project docs

### Tier 3: Cold Storage (Knowledge Library)
Files **never** loaded at spawn, only when agent explicitly searches and reads them.

**What goes here:**
- Architecture deep-dives (like this file)
- Historical context and incident retrospectives
- Detailed technical patterns and research
- Substantial documentation (2KB+)

**Performance impact:** Zero at spawn. Zero unless agent actively seeks the knowledge.

**Location:** `.squad/knowledge/`

## Implementation Details

### Spawn Template Structure

The spawn template (squad.agent.md) includes:
- Charter content (inline or referenced)
- Team roster reference
- Decisions.md reference
- Routing rules reference
- Skills directory reference (for discovery, not loading)

**NEVER include knowledge library files in spawn template.**

### Agent Discovery Pattern

When an agent needs deep context:
1. Agent recognizes knowledge gap ("I need to understand how context loading works")
2. Agent lists `.squad/knowledge/` directory
3. Agent reads filenames and infers relevance (semantic naming convention)
4. Agent reads specific file(s)
5. Agent applies knowledge to current task

### Metrics and Validation

The Knowledge Library must maintain three guarantees:
1. **Zero spawn impact** — no knowledge files in spawn template
2. **Zero token cost at spawn** — no files loaded automatically
3. **Zero latency at spawn** — no file I/O during agent initialization

Run `bash scripts/knowledge-library-metrics.sh` to verify these guarantees.

## Design Rationale

### Why Not Load Everything?

Early Squad prototypes loaded all context at spawn. Problems:
- 100KB+ spawn templates = $0.02+ per spawn at GPT-4 pricing
- 5-10 second spawn latency from loading 20+ files
- 90% of context unused in typical sessions

### Why Not Use Vector Search?

Vector search adds complexity and cost:
- Requires embedding model (latency, cost)
- Needs vector database (infrastructure)
- Semantic search can miss exact matches

Simple filesystem + semantic naming is sufficient for ~100 knowledge files.

### Why Markdown?

- Human-readable and git-friendly
- Agent-friendly (LLMs excel at markdown parsing)
- Standard tooling (grep, cat, ls works out of the box)
- No build step or compilation

## Comparison to Other Systems

| System | Context Model | Spawn Impact |
|--------|---------------|--------------|
| GitHub Copilot Chat | No persistent context | N/A (stateless) |
| LangChain Agents | Load all documents | High (retrieval on every query) |
| AutoGPT | File-based memory | Medium (scans directory) |
| Squad (Tier 1) | Spawn-time loading | High (intentional, minimal set) |
| Squad (Tier 2) | On-demand loading | Zero at spawn |
| Squad (Tier 3) | Cold storage | Zero at spawn |

## Evolution and Future

### Current State (v0.8.x)
- Three-tier architecture established
- Knowledge library directory created
- Metrics validation in place

### Future Enhancements
- Knowledge index file (optional, for faster discovery)
- Tagging system for cross-references
- Automatic deprecation detection (files not accessed in 6+ months)
- Knowledge file templates for common patterns

## Related Documents

- `.squad/skills/knowledge-library/SKILL.md` — how to write and read knowledge files
- `.squad/decisions.md` — architectural decisions that shaped this design
- `docs/architecture/agent-spawn.md` — (future) full spawn lifecycle documentation
