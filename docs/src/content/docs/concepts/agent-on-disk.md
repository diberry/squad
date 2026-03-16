# What It Means on Disk to Be a Squad Agent

> Developer-oriented concept doc: the on-disk anatomy of a Squad agent

## Overview

A Squad agent is a **distributed identity** spanning three layers:

1. **Runtime state** — `.squad/` directory (team-specific, git-committed)
2. **SDK infrastructure** — `packages/squad-sdk/src/agents/` (compiled code)
3. **Configuration** — `squad.config.ts` or `squad.config.json` (optional overrides)

This doc explains how these layers work together to create spawnables agents (AI specialists), and how non-spawnables members (humans, @copilot) appear in the team roster.

## AI Agent Directory Structure

Each spawnable AI agent exists in `.squad/agents/{name}/`:

```
.squad/
└── agents/
    ├── flight/
    │   ├── charter.md       # Agent's identity, boundaries, voice
    │   └── history.md       # Append-only learnings (optional)
    ├── capcom/
    │   └── charter.md
    └── _alumni/
        └── verbal/          # Retired agents
            └── charter.md
```

### Key Files

#### `charter.md` — The Agent's DNA

Compiled by the SDK at spawn time into the agent's system prompt.

**Core sections:**
- **Identity** → name, role, expertise, style
- **What I Own** → responsibilities (plain text)
- **How I Work** → patterns, preferences, workflows
- **Boundaries** → what the agent handles vs. delegates
- **Model** → preferred model (e.g., `auto`, `gpt-4.1`, `claude-sonnet-4.6`)

The charter is parsed into a `SquadCustomAgentConfig` object with:
- Full charter as system prompt
- Metadata (name, role, model preference)
- Team context (from `team.md`, `routing.md`, `decisions.md`)

Personality and voice matter — agents have opinions.

#### `history.md` — Append-Only Learnings

Written by the agent after work. Read at spawn time.

**Structure:**
- `## Core Context` — stable project facts
- `## Learnings` — accumulated patterns and decisions

**What belongs:**
- Project patterns (e.g., "three-branch model")
- Domain knowledge (e.g., "boundary review heuristic")
- Cross-session learnings

**What doesn't:**
- Transient task state (use SQL)
- Raw logs (use `.squad/log/`)
- Multi-agent decisions (use `.squad/decisions.md`)

### Alumni — Retirement

Retired agents move to `.squad/agents/_alumni/{name}/`. They cannot be spawned. Charters are preserved as read-only archives.

## The Casting System (Optional)

Squad assigns memorable names from fictional universes:

- **`casting-registry.json`** — tracks allocated names, universes, timestamps
- **`casting-policy.json`** — defines available universes and capacity limits
- **`casting-history.json`** — immutable audit trail

Names are not reused within the same universe. When a universe is exhausted, a new one is added to the policy.

## How an AI Agent "Exists"

An AI agent is **active** when:

1. **Charter exists** — `.squad/agents/{name}/charter.md` is present
2. **Roster entry** — Agent listed in `team.md` with status `✅ Active` or `📋 Silent`
3. **Routing rules** — Agent appears in `routing.md` work assignments

**Spawn flow:**

```
User request → Coordinator reads routing.md → Identifies agent
→ SDK reads charter.md, history.md → Compiles SquadCustomAgentConfig
→ Spawns agent → Agent runs → Writes to history.md
```

## Relationship to SDK Source Files

The `.squad/` directory is **runtime state**, not code. The SDK provides the **infrastructure** to load, parse, and execute agents:

| SDK Module | Purpose |
|------------|---------|
| `packages/squad-sdk/src/agents/charter-compiler.ts` | Parses `charter.md` into `SquadCustomAgentConfig` |
| `packages/squad-sdk/src/agents/history-shadow.ts` | Loads `history.md` and injects into agent context |
| `packages/squad-sdk/src/agents/lifecycle.ts` | Agent spawn, session management, termination |
| `packages/squad-sdk/src/agents/model-selector.ts` | Resolves `## Model` preference to actual model |
| `packages/squad-sdk/src/casting/` | Name allocation, registry management |

**Key insight:** The SDK never hardcodes agent names or roles. It's a generic **agent runtime**. All specificity lives in `.squad/`.

This means:
- You can add new agents without changing SDK code
- Multiple projects using the same SDK have different teams
- Agents can be dynamically added, retired, or renamed

## Config Overrides

The optional `squad.config.ts` file provides **overrides** for charter-based agents:

```typescript
export default {
  agents: {
    flight: {
      model: 'gpt-4.1', // Override charter
      tools: ['read', 'write'], // Restrict tools
      extraPrompt: 'Focus on performance.' // Append to charter
    }
  }
}
```

**Merge order:** Charter → Config → Team context → Final prompt

Use cases: per-environment tuning, temporary restrictions, A/B testing.

## Cross-Agent Context

Agents don't share memory. Context flows via **explicit artifacts**:

- **`team.md`** — Shared roster (who exists, what they do)
- **`routing.md`** — Work assignment rules (coordinator uses this)
- **`decisions.md`** — Canonical decisions log (shared memory)
- **`.squad/decisions/inbox/`** — Decision drop-box (agents write, Scribe merges)
- **`.squad/log/`** — Session summaries (auditing and debugging)

## Human Team Members (👤)

Squad supports **human members** in the roster:

```markdown
| Name | Role | Status | Badge |
|------|------|--------|-------|
| dina | Product Manager | ✅ Active | 👤 Human |
```

**Key differences from AI agents:**
- **No charter** — Humans don't have `.squad/agents/{name}/charter.md`
- **No history** — Humans don't accumulate `history.md`
- **Not spawnable** — Coordinator presents work and waits for human input (asynchronous collaboration)
- **Participate in routing** — Routing rules can assign work to humans (e.g., "UX design → dina")
- **Code review** — Humans can be listed as required reviewers in routing

Humans are roster members but operate asynchronously. The coordinator surfaces work to them and waits.

## @copilot Coding Agent (🤖)

Squad supports **@copilot** as a roster member:

```markdown
| Name | Role | Status | Badge |
|------|------|--------|-------|
| @copilot | Coding Agent | ✅ Active | 🤖 Coding Agent |
```

**Key differences from AI agents:**
- **No charter** — @copilot uses `copilot-instructions.md` (injected via `.github/copilot-instructions.md`)
- **Not spawnable** — Works via GitHub issue assignment (asynchronous)
- **Creates `copilot/*` branches** — Opens draft PRs for review
- **Capability profile** — Has a 🟢/🟡/🔴 profile in `team.md` (e.g., 🟢 TypeScript, 🟡 Architecture, 🔴 Security audits)
- **Self-checks before starting** — Reads capability profile, only takes work it's suited for

The coordinator routes work to @copilot by assigning issues. @copilot autonomously picks up work, performs capability checks, and opens PRs.

## Key Takeaways

1. **AI agents are directories** — `.squad/agents/{name}/` with `charter.md`
2. **Charter is source of truth** — identity, boundaries, voice
3. **History is optional** — recommended for repeated work
4. **Casting adds personality** — thematic names (Apollo 13, Ocean's Eleven)
5. **SDK is generic** — no agent-specific code in the runtime
6. **Context flows via files** — `team.md`, `routing.md`, `decisions.md`
7. **Humans and @copilot are roster members** — but not spawnable

## Developer Checklist: Creating a New AI Agent

- [ ] Create `.squad/agents/{name}/` directory
- [ ] Write `charter.md` (use `.squad/templates/charter.md`)
- [ ] Add to `team.md` roster with status `✅ Active`
- [ ] Add to `routing.md` with work type assignments
- [ ] (Optional) Allocate name via casting system
- [ ] (Optional) Create `history.md` for persistent memory
- [ ] Test spawn: `squad spawn {name} "Hello, world"`

---

**Author:** Flight
**Requested by:** Dina (via Brady)
**Date:** 2026-03-16
