---
name: "dina-fork-sync"
description: "Layered sync model for keeping diberry/squad current with bradygaster/squad"
domain: "fork-management, upstream-sync, git-workflow"
confidence: "high"
source: "extracted from diberry-squad-fork-first-pipeline"
---

## Worksurface

Sync runs on **diberry/squad** (the fork). You fetch from bradygaster/squad but never push to it. All sync commits stay on the fork.

## When to Run

- After upstream pushes new agent charters or skills
- Before starting a new round of upstream PRs
- When squad agents behave differently from upstream expectations
- Periodically (weekly or before major work sessions)

## Layered Sync Model

Four layers define ownership and sync behavior for every `.squad/` path.

### Layer 1: Upstream-Owned (overwrite from upstream)

These files are authored by upstream. Fork accepts upstream's version on sync.

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
| `.squad/agents/*/history.md` | Union merge — keep all unique entries |

### Layer 3: Personal (never sync upstream, never bleed into PRs)

These files are fork-specific. They live on the `diberry/squad` branch and never travel to upstream or feature branches.

| Path | Description |
|---|---|
| `.copilot/skills/**` | Personal Copilot-level skills (fork-only) |
| `.copilot/prompts/**` | Squad dispatch prompts (fork-only) |
| `.squad/decisions/inbox/**` | Fork-specific pending decisions |

### Layer 4: Ignored (fork-local, never sync)

| Path | Description |
|---|---|
| `.squad/log/**` | Session logs |
| `.squad/orchestration-log/**` | Orchestration logs |
| `.squad/identity/**` | Identity files |

## Sync Patterns

### Pre-flight

```bash
git fetch upstream
git --no-pager diff --stat upstream/dev -- .squad/ | head -50
```

Review what changed. If nothing, stop.

### Step 1: Sync Layer 1 (overwrite from upstream)

```bash
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
cp .squad/decisions.md .squad/decisions.md.fork
git show upstream/dev:.squad/decisions.md > .squad/decisions.md.upstream
sort -u .squad/decisions.md.fork .squad/decisions.md.upstream > .squad/decisions.md.merged
mv .squad/decisions.md.merged .squad/decisions.md
rm .squad/decisions.md.fork .squad/decisions.md.upstream
```

Repeat the same pattern for each agent's `history.md`.

> **Note:** `sort -u` does line-level dedup. For structured markdown with headers, manual review after merge is recommended.

### Step 3: Verify Layer 3 untouched

```bash
git diff --name-only -- .copilot/skills/
```

If any personal files changed, restore immediately:
```bash
git checkout HEAD -- <path>
```

### Step 4: Discover new upstream content

```bash
git --no-pager diff --diff-filter=A --name-only upstream/dev -- .squad/agents/ .squad/skills/ .squad/templates/
```

Report any new items to Dina for review before including them.

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

git diff --cached --stat
git diff --cached --diff-filter=D --name-only  # confirm no unintended deletions
git commit -m "sync: pull .squad/ updates from upstream/dev"
```

## Anti-Patterns

- **Don't** `git checkout upstream/dev -- .squad/` (overwrites EVERYTHING including personal skills and logs)
- **Don't** `git merge upstream/dev` (merges ALL files, creates conflicts in personal content)
- **Don't** overwrite `decisions.md` with `git checkout` (loses fork-specific decisions)
- **Don't** `git add .` or `git add -A` after sync (stages personal files and unrelated changes)
- **Don't** skip Layer 3 verification (silent corruption of personal skills during sync)
