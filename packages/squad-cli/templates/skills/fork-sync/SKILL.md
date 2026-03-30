---
name: "fork-sync"
description: "Sync upstream .squad/ config into this fork while preserving personal skills and decisions"
domain: "git-workflow, fork-management"
confidence: "low"
source: "manual — designed from issue #105 analysis of fork drift problem"
---

## Context

Fork `.squad/` drifts from upstream over time. When upstream adds agents, skills, templates, or updates charters, the fork doesn't get them. When the fork adds personal skills or decisions, those can bleed into upstream PRs. This skill defines a layered sync model that pulls upstream config while preserving fork-specific content.

**When to use this skill:**
- After upstream pushes new agent charters or skills
- Before starting a new round of upstream PRs
- When squad agents behave differently from upstream expectations
- Periodically (weekly or before major work sessions)

## Layered Sync Model

Four layers define ownership and sync behavior for every `.squad/` path.

### Layer 1: Upstream-Owned (overwrite from upstream)

These files are authored and maintained by upstream. Fork accepts upstream's version on sync.

| Path | Description |
|---|---|
| `.squad/agents/*/charter.md` | Agent role definitions |
| `.squad/templates/**` | All template files |
| `.squad/casting/policy.json` | Casting policy config |
| `.squad/casting/registry.json` | Agent registry |
| `.squad/casting/history.json` | Casting history |
| `.squad/ceremonies.md` | Ceremony definitions |
| `.squad/routing.md` | Work routing rules |
| `.squad/team.md` | Team roster and capabilities |

### Layer 2: Merged (union/append-only)

These files accumulate content from both sides. Sync merges, never overwrites.

| Path | Merge Strategy |
|---|---|
| `.squad/decisions.md` | Union merge — keep all unique lines from both sides |
| `.squad/agents/*/history.md` | Union merge — keep all unique entries from both sides |

### Layer 3: Personal (never sync upstream, never bleed into PRs)

These files are fork-specific. They never travel to upstream and should not change during sync.

| Path | Description |
|---|---|
| `.copilot/skills/**` | Personal copilot-level skills |
| `.squad/decisions/inbox/**` | Fork-specific pending decisions |
| `.squad/skills/fork-first-pipeline/**` | Fork workflow skill |
| `.squad/skills/fork-sync/**` | This skill itself |
| `.squad/skills/pr-screenshots/**` | Fork process skill |
| `.squad/skills/upstream-dedup-check/**` | Fork process skill |

### Layer 4: Ignored (fork-local, never sync)

Ephemeral or session-local files that are never part of sync.

| Path | Description |
|---|---|
| `.squad/log/**` | Session logs |
| `.squad/orchestration-log/**` | Orchestration logs |
| `.squad/identity/**` | Identity files |

## Patterns

### Pre-flight

```bash
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
```

Review what changed. If nothing changed, stop — no sync needed.

### Step 1: Sync Layer 1 (overwrite from upstream)

```bash
# Checkout upstream versions of all owned files
git checkout upstream/dev -- .squad/agents/*/charter.md
git checkout upstream/dev -- .squad/templates/
git checkout upstream/dev -- .squad/casting/
git checkout upstream/dev -- .squad/ceremonies.md
git checkout upstream/dev -- .squad/routing.md
git checkout upstream/dev -- .squad/team.md
```

### Step 2: Sync Layer 2 (union merge)

For `decisions.md`:

```bash
# Save current fork version
cp .squad/decisions.md .squad/decisions.md.fork

# Get upstream version
git show upstream/dev:.squad/decisions.md > .squad/decisions.md.upstream

# Union merge: keep all unique lines from both sides
sort -u .squad/decisions.md.fork .squad/decisions.md.upstream > .squad/decisions.md.merged

# Review the merged result, then replace
mv .squad/decisions.md.merged .squad/decisions.md
rm .squad/decisions.md.fork .squad/decisions.md.upstream
```

For each agent's `history.md`, repeat the same pattern:

```bash
# Example for agent "eecom"
cp .squad/agents/eecom/history.md .squad/agents/eecom/history.md.fork
git show upstream/dev:.squad/agents/eecom/history.md > .squad/agents/eecom/history.md.upstream
sort -u .squad/agents/eecom/history.md.fork .squad/agents/eecom/history.md.upstream > .squad/agents/eecom/history.md.merged
mv .squad/agents/eecom/history.md.merged .squad/agents/eecom/history.md
rm .squad/agents/eecom/history.md.fork .squad/agents/eecom/history.md.upstream
```

> **Note:** `sort -u` does a line-level dedup. For structured markdown with headers, manual review after merge is recommended to ensure section ordering makes sense.

### Step 3: Verify Layer 3 untouched

```bash
# These should NOT have changed during sync
git diff --name-only -- .copilot/skills/
git diff --name-only -- .squad/skills/fork-first-pipeline/
git diff --name-only -- .squad/skills/fork-sync/
git diff --name-only -- .squad/skills/pr-screenshots/
git diff --name-only -- .squad/skills/upstream-dedup-check/
```

If any personal files changed, restore them immediately:

```bash
git checkout HEAD -- <path>
```

### Step 4: Discover new upstream content

```bash
# Check for new agents, skills, or templates added upstream
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/agents/
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/skills/
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/templates/
```

Report any new items to the user for review before including them.

### Step 5: Commit sync

```bash
# Stage ONLY synced files — never .copilot/ or personal skills
git add .squad/agents/*/charter.md \
        .squad/templates/ \
        .squad/casting/ \
        .squad/ceremonies.md \
        .squad/routing.md \
        .squad/team.md \
        .squad/decisions.md \
        .squad/agents/*/history.md

# Verify staged files match intent
git diff --cached --stat
git diff --cached --diff-filter=D --name-only  # confirm no unintended deletions

# Commit
git commit -m "sync: pull .squad/ updates from upstream/dev"
```

## Examples

### Full sync run

```bash
# 1. Pre-flight
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
# Output shows 4 files changed — proceed

# 2. Layer 1: overwrite
git checkout upstream/dev -- .squad/agents/*/charter.md
git checkout upstream/dev -- .squad/templates/
git checkout upstream/dev -- .squad/casting/
git checkout upstream/dev -- .squad/ceremonies.md .squad/routing.md .squad/team.md

# 3. Layer 2: union merge decisions.md
cp .squad/decisions.md .squad/decisions.md.fork
git show upstream/dev:.squad/decisions.md > .squad/decisions.md.upstream
sort -u .squad/decisions.md.fork .squad/decisions.md.upstream > .squad/decisions.md.merged
mv .squad/decisions.md.merged .squad/decisions.md
rm .squad/decisions.md.fork .squad/decisions.md.upstream

# 4. Verify personal files untouched
git diff --name-only -- .copilot/skills/ .squad/skills/fork-sync/
# (no output = good)

# 5. Discover new upstream content
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/agents/ .squad/skills/ .squad/templates/

# 6. Commit
git add .squad/agents/*/charter.md .squad/templates/ .squad/casting/ .squad/ceremonies.md .squad/routing.md .squad/team.md .squad/decisions.md .squad/agents/*/history.md
git diff --cached --stat
git commit -m "sync: pull .squad/ updates from upstream/dev"
```

### Dry-run (inspect only, no changes)

```bash
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
git --no-pager diff upstream/dev -- .squad/agents/*/charter.md | head -100
git --no-pager diff upstream/dev -- .squad/templates/ | head -100
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do This Instead |
|---|---|---|
| `git checkout upstream/dev -- .squad/` | Overwrites EVERYTHING including personal skills and logs | Sync layer by layer using specific paths |
| `git merge upstream/dev` | Merges ALL files, creates conflicts in logs and personal content | Cherry-pick `.squad/` paths only via targeted checkout |
| Committing `.copilot/skills/` in upstream PRs | Personal skills bleed into upstream repo | Keep `.copilot/` out of upstream-targeted commits; use bleed check |
| Overwriting `decisions.md` with `git checkout` | Loses fork-specific decisions | Union merge — keep all unique lines from both sides |
| `git add .` or `git add -A` after sync | Stages personal files, logs, and unrelated changes | Stage only the specific synced paths listed in Step 5 |
| Skipping Layer 3 verification | Silent corruption of personal skills during sync | Always run Step 3 checks before committing |

## Related

- **Issue #105:** Full design discussion with implementation options and acceptance criteria
- `.squad/skills/fork-first-pipeline/SKILL.md` — PR pipeline that should respect sync boundaries
- `.squad/skills/upstream-dedup-check/SKILL.md` — Checks upstream before starting work to prevent duplicate effort
- `.squad/skills/personal-squad/SKILL.md` — Ghost Protocol personal agent separation (related ownership concept)
